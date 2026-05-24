const mongoose = require("mongoose");
const QuestionsAnswers = require("../models/QuestionsAnswersModel");
const ChatMessage = require("../models/ChatMessageModel");
const User = require("../models/UsersModel");

function getUserIdFromReq(req) {
    const raw = req.headers["x-user-id"];
    return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

async function getNextQACode() {
    const last = await QuestionsAnswers.findOne({}, { code: 1 }).sort({ code: -1 }).lean();
    return (last?.code ?? 0) + 1;
}

async function requireStaffUser(req, res) {
    const userId = getUserIdFromReq(req);
    if (!userId) {
        res.status(401).send({ message: "נדרשת התחברות" });
        return null;
    }
    const me = await User.findById(userId).select("status").lean();
    if (!me || !["lecturer", "manager"].includes(me.status)) {
        res.status(403).send({ message: "גישה למרצים ולמנהלים בלבד" });
        return null;
    }
    return { userId, me };
}

function lecturerThreadFilter(me, userId) {
    if (me.status === "manager") return {};
    return {
        $or: [
            { targetLecturerCode: userId },
            { targetLecturerCode: null },
            { targetLecturerCode: { $exists: false } },
            { responderCode: userId },
        ],
    };
}

async function assertLecturerCanAccessThread(thread, me, userId) {
    if (!thread) return { ok: false, status: 404, message: "השיחה לא נמצאה" };
    if (me.status === "manager") return { ok: true };

    if (thread.targetLecturerCode) {
        const imTarget = String(thread.targetLecturerCode) === String(userId);
        const imResp =
            thread.responderCode && String(thread.responderCode) === String(userId);
        if (!imTarget && !imResp) {
            return { ok: false, status: 403, message: "השיחה מיועדת למרצה אחר" };
        }
    }
    if (thread.responderCode && String(thread.responderCode) !== String(userId)) {
        return { ok: false, status: 403, message: "שיחה זו מטופלת על ידי מרצה אחר" };
    }
    return { ok: true };
}

async function syncThreadAfterMessageChange(threadId) {
    const thread = await QuestionsAnswers.findById(threadId);
    if (!thread) return;

    const msgs = await ChatMessage.find({ threadId })
        .sort({ createdAt: 1 })
        .populate("senderCode", "status")
        .lean();

    const askerId = String(thread.askerCode);
    let lastStaffContent = "";
    let lastStaffId = null;
    let hasStudentMsg = false;

    for (const m of msgs) {
        const sid = String(m.senderCode?._id ?? m.senderCode);
        const st = m.senderCode?.status;
        if (sid === askerId) hasStudentMsg = true;
        if (["lecturer", "manager"].includes(st) || sid !== askerId) {
            if (sid !== askerId) {
                lastStaffContent = String(m.content ?? "").trim();
                lastStaffId = m.senderCode?._id ?? m.senderCode;
            }
        }
    }

    if (!msgs.length) {
        thread.status = "notAnswered";
        thread.answer = "";
        await thread.save();
        return;
    }

    if (lastStaffContent) {
        thread.status = "answered";
        thread.answer = lastStaffContent;
        if (lastStaffId) thread.responderCode = lastStaffId;
    } else if (hasStudentMsg || String(thread.question ?? "").trim()) {
        thread.status = "notAnswered";
        thread.answer = "";
    }
    await thread.save();
}

function stripAllPublicQa(thread) {
    thread.publicQaQuestionText = "";
    thread.publicQaAnswerText = "";
    thread.hiddenFromPublicQa = true;
    thread.markModified("publicQaQuestionText");
    thread.markModified("publicQaAnswerText");
    thread.markModified("hiddenFromPublicQa");
}

function activatePublicQaIfComplete(thread) {
    const pubQ = String(thread.publicQaQuestionText ?? "").trim();
    const pubA = String(thread.publicQaAnswerText ?? "").trim();
    if (pubQ && pubA) {
        thread.hiddenFromPublicQa = false;
    }
}

function clearPublicIfMatches(thread, content, kind) {
    const c = String(content ?? "").trim();
    if (!c) return false;
    const pubQ = String(thread.publicQaQuestionText ?? "").trim();
    const pubA = String(thread.publicQaAnswerText ?? "").trim();
    const hitQ = kind === "question" && pubQ === c;
    const hitA = kind === "answer" && pubA === c;
    if (!hitQ && !hitA) return false;
    stripAllPublicQa(thread);
    return true;
}

/** מחיקת זוג פרסום: הודעת שאלה ↔ תשובה מפורסמת (צ'אט + עמוד ציבורי) */
async function cascadePublishedPairDelete(thread, threadId, { isQuestionMessage, content }) {
    const c = String(content ?? "").trim();
    if (!c) return false;

    const pubQ = String(thread.publicQaQuestionText ?? "").trim();
    const pubA = String(thread.publicQaAnswerText ?? "").trim();
    const askerId = thread.askerCode;

    const hitPublishedQ = isQuestionMessage && pubQ && pubQ === c;
    const hitPublishedA = !isQuestionMessage && pubA && pubA === c;
    if (!hitPublishedQ && !hitPublishedA) return false;

    if (hitPublishedQ && pubA) {
        await ChatMessage.deleteMany({ threadId, content: pubA });
    }
    if (hitPublishedA && pubQ) {
        await ChatMessage.deleteMany({ threadId, senderCode: askerId, content: pubQ });
        if (String(thread.question ?? "").trim() === pubQ) {
            thread.question = "";
        }
    }

    stripAllPublicQa(thread);
    return true;
}

const getAllQA = async (req, res) => {
    try {
        const data = await QuestionsAnswers.find()
            .populate("askerCode")
            .populate("responderCode");
        res.status(200).send(data);
    } catch (err) {
        res.status(500).send(err);
    }
};

/** תצוגה ציבורית — שאלות שנענו (מסלול קיים) או זוג שפורסם מהצ׳אט */
const getAnsweredForPublic = async (req, res) => {
    try {
        const raw = parseInt(String(req.query.limit ?? "24"), 10);
        const limit = Number.isFinite(raw) ? Math.min(Math.max(raw, 1), 80) : 24;

        const notHidden = {
            $or: [
                { hiddenFromPublicQa: { $exists: false } },
                { hiddenFromPublicQa: false },
                { hiddenFromPublicQa: null },
            ],
        };

        const publishedFromChat = {
            ...notHidden,
            publicQaQuestionText: { $exists: true, $nin: [null, ""] },
            publicQaAnswerText: { $exists: true, $nin: [null, ""] },
        };

        const legacyMatch = {
            ...notHidden,
            status: "answered",
            answer: { $exists: true, $nin: [null, ""] },
        };

        const candidates = await QuestionsAnswers.find({
            $or: [legacyMatch, publishedFromChat],
        })
            .sort({ updatedAt: -1 })
            .limit(limit * 3)
            .populate("askerCode", "firstName lastName status profileImage")
            .populate("responderCode", "firstName lastName status profileImage")
            .populate("targetLecturerCode", "firstName lastName status profileImage")
            .lean();

        const ids = candidates.map((d) => d._id);
        const chatThreadIdSet = new Set(
            (
                await ChatMessage.find({ threadId: { $in: ids } })
                    .distinct("threadId")
            ).map(String)
        );

        const mapped = [];
        for (const doc of candidates) {
            if (doc.hiddenFromPublicQa === true) continue;

            const pubQ = String(doc.publicQaQuestionText ?? "").trim();
            const pubA = String(doc.publicQaAnswerText ?? "").trim();
            const tid = String(doc._id);

            if (pubQ && pubA) {
                mapped.push({ ...doc, question: pubQ, answer: pubA });
                continue;
            }

            /* שיחות צ'אט ללא זוג פרסום — לא בעמוד הציבורי (גם אחרי הסרת פרסום) */
            if (chatThreadIdSet.has(tid)) continue;

            if (doc.status === "answered" && String(doc.answer ?? "").trim()) {
                mapped.push({ ...doc, question: doc.question, answer: doc.answer });
            }
        }

        res.status(200).send(mapped.slice(0, limit));
    } catch (err) {
        res.status(500).send(err);
    }
};

/** שאלות פתוחות לצ׳אט — מרצה רואה פנייה אליו + ללא יעד (ישן); מנהל רואה הכול */
const getInboxUnanswered = async (req, res) => {
    try {
        const userId = getUserIdFromReq(req);
        if (!userId) {
            return res.status(401).send({ message: "נדרשת התחברות" });
        }

        const me = await User.findById(userId).select("status").lean();
        if (!me || !["lecturer", "manager"].includes(me.status)) {
            return res.status(403).send({ message: "גישה למרצים ולמנהלים בלבד" });
        }

        let query = { status: "notAnswered" };
        if (me.status === "lecturer") {
            query.$or = [
                { targetLecturerCode: userId },
                { targetLecturerCode: null },
                { targetLecturerCode: { $exists: false } },
            ];
        }

        const data = await QuestionsAnswers.find(query)
            .sort({ updatedAt: -1 })
            .populate("askerCode", "firstName lastName status profileImage email")
            .populate("targetLecturerCode", "firstName lastName status profileImage")
            .lean();

        res.status(200).send(data);
    } catch (err) {
        res.status(500).send(err);
    }
};

function countPendingStudentMessages(messages, studentId) {
    if (!messages?.length) return 0;
    const sorted = [...messages].sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
    const sid = String(studentId);
    let lastStaffIdx = -1;
    for (let i = 0; i < sorted.length; i += 1) {
        if (String(sorted[i].senderCode) !== sid) {
            lastStaffIdx = i;
        }
    }
    const start = lastStaffIdx + 1;
    return sorted.slice(start).filter((m) => String(m.senderCode) === sid).length;
}

/** רשימת צ׳אטים לפי תלמידה + מספר הודעות ממתינות למרצה */
const getLecturerStudentChats = async (req, res) => {
    try {
        const userId = getUserIdFromReq(req);
        if (!userId) {
            return res.status(401).send({ message: "נדרשת התחברות" });
        }

        const me = await User.findById(userId).select("status").lean();
        if (!me || !["lecturer", "manager"].includes(me.status)) {
            return res.status(403).send({ message: "גישה למרצים ולמנהלים בלבד" });
        }

        let query = {};
        if (me.status === "lecturer") {
            query.$or = [
                { targetLecturerCode: userId },
                { targetLecturerCode: null },
                { targetLecturerCode: { $exists: false } },
                { responderCode: userId },
            ];
        }

        const threads = await QuestionsAnswers.find(query)
            .sort({ updatedAt: -1 })
            .populate("askerCode", "firstName lastName status profileImage email")
            .populate("targetLecturerCode", "firstName lastName status profileImage")
            .populate("responderCode", "firstName lastName status profileImage")
            .lean();

        if (!threads.length) {
            return res.status(200).send([]);
        }

        const threadIds = threads.map((t) => t._id);
        const allMsgs = await ChatMessage.find({ threadId: { $in: threadIds } })
            .sort({ createdAt: 1 })
            .lean();

        const msgsByThread = new Map();
        for (const m of allMsgs) {
            const key = String(m.threadId);
            if (!msgsByThread.has(key)) msgsByThread.set(key, []);
            msgsByThread.get(key).push(m);
        }

        const byStudent = new Map();

        for (const thread of threads) {
            const asker = thread.askerCode;
            if (!asker || typeof asker !== "object") continue;
            const studentId = String(asker._id);
            const tMsgs = msgsByThread.get(String(thread._id)) ?? [];
            let pending = countPendingStudentMessages(tMsgs, studentId);
            if (
                pending === 0 &&
                thread.status === "notAnswered" &&
                !tMsgs.length &&
                String(thread.question ?? "").trim()
            ) {
                pending = 1;
            }

            let lastPreview = String(thread.question ?? "").trim();
            if (tMsgs.length) {
                lastPreview = String(tMsgs[tMsgs.length - 1].content ?? "").trim();
            }

            const lastActivity = thread.updatedAt ?? thread.createdAt ?? thread.dateTime;

            const threadRow = {
                _id: thread._id,
                question: thread.question,
                status: thread.status,
                updatedAt: thread.updatedAt,
                pendingCount: pending,
                targetLecturerCode: thread.targetLecturerCode,
                publicQaQuestionText: thread.publicQaQuestionText,
                publicQaAnswerText: thread.publicQaAnswerText,
            };

            if (!byStudent.has(studentId)) {
                byStudent.set(studentId, {
                    student: asker,
                    pendingCount: 0,
                    lastPreview: "",
                    lastActivity: null,
                    primaryThreadId: String(thread._id),
                    threads: [],
                });
            }

            const row = byStudent.get(studentId);
            row.pendingCount += pending;
            row.threads.push(threadRow);

            const actTime = new Date(lastActivity).getTime();
            const prevTime = row.lastActivity ? new Date(row.lastActivity).getTime() : 0;
            if (!row.lastActivity || actTime >= prevTime) {
                row.lastActivity = lastActivity;
                row.lastPreview = lastPreview;
                row.primaryThreadId = String(thread._id);
            }
        }

        const list = Array.from(byStudent.values()).sort(
            (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
        );

        res.status(200).send(list);
    } catch (err) {
        res.status(500).send(err);
    }
};

/** שיחות של התלמידה */
const getStudentThreads = async (req, res) => {
    try {
        const userId = getUserIdFromReq(req);
        if (!userId) {
            return res.status(401).send({ message: "נדרשת התחברות" });
        }

        const askerFilter = mongoose.Types.ObjectId.isValid(userId)
            ? new mongoose.Types.ObjectId(userId)
            : userId;

        const data = await QuestionsAnswers.find({ askerCode: askerFilter })
            .sort({ updatedAt: -1 })
            .populate("responderCode", "firstName lastName status profileImage")
            .populate("targetLecturerCode", "firstName lastName status profileImage")
            .lean();

        res.status(200).send(data);
    } catch (err) {
        res.status(500).send(err);
    }
};

const getQAById = async (req, res) => {
    try {
        const data = await QuestionsAnswers.findById(req.params.id)
            .populate("askerCode")
            .populate("responderCode");

        if (!data) return res.status(404).send({ message: "Not found" });

        res.status(200).send(data);
    } catch (err) {
        res.status(500).send(err);
    }
};

const getThreadMessages = async (req, res) => {
    try {
        const { threadId } = req.params;
        const userId = getUserIdFromReq(req);
        if (!userId) {
            return res.status(401).send({ message: "נדרשת התחברות" });
        }

        const thread = await QuestionsAnswers.findById(threadId).lean();
        if (!thread) return res.status(404).send({ message: "השיחה לא נמצאה" });

        const me = await User.findById(userId).select("status").lean();
        const isStudent = me?.status === "student";
        const isStaff = ["lecturer", "manager"].includes(me?.status);

        const isAsker = String(thread.askerCode) === String(userId);
        const isResponder =
            thread.responderCode && String(thread.responderCode) === String(userId);

        if (isStudent && !isAsker) {
            return res.status(403).send({ message: "אין גישה לשיחה זו" });
        }

        if (isStaff && me.status === "lecturer" && thread.targetLecturerCode) {
            const imTarget = String(thread.targetLecturerCode) === String(userId);
            const imResp =
                thread.responderCode && String(thread.responderCode) === String(userId);
            if (!imTarget && !imResp) {
                return res.status(403).send({
                    message: "השיחה נפתחה כלפי מרצה אחר מהמערכת",
                });
            }
        }

        if (isStaff && !isAsker && me.status !== "manager") {
            if (thread.responderCode && String(thread.responderCode) !== String(userId)) {
                return res.status(403).send({ message: "שיחה זו כבר מטופלת על ידי מרצה אחר" });
            }
            if (!thread.responderCode && thread.status !== "notAnswered") {
                return res.status(403).send({ message: "אין גישה" });
            }
        }

        let rows = await ChatMessage.find({ threadId })
            .sort({ createdAt: 1 })
            .populate("senderCode", "firstName lastName status profileImage")
            .lean();

        if (!rows.length && thread.question) {
            rows = [
                {
                    _id: `fallback-${threadId}`,
                    threadId,
                    senderCode: thread.askerCode,
                    content: thread.question,
                    createdAt: thread.createdAt ?? thread.dateTime ?? new Date(),
                    synthetic: true,
                },
            ];
        }

        res.status(200).send(rows);
    } catch (err) {
        res.status(500).send(err);
    }
};

const postThreadMessage = async (req, res) => {
    try {
        const { threadId } = req.params;
        const userId = getUserIdFromReq(req);
        if (!userId) {
            return res.status(401).send({ message: "נדרשת התחברות" });
        }

        const content = String(req.body?.content ?? "").trim();
        if (content.length < 1) {
            return res.status(400).send({ message: "נא לכתוב תוכן בהודעה" });
        }

        const thread = await QuestionsAnswers.findById(threadId);
        if (!thread) return res.status(404).send({ message: "השיחה לא נמצאה" });

        const me = await User.findById(userId).select("status").lean();
        if (!me) return res.status(401).send({ message: "משתמש לא נמצא" });

        const isStudent = me.status === "student";
        const isStaff = ["lecturer", "manager"].includes(me.status);

        if (isStudent) {
            if (String(thread.askerCode) !== String(userId)) {
                return res.status(403).send({ message: "אין הרשאה לשלוח כאן" });
            }
        } else if (isStaff) {
            if (me.status === "lecturer" && thread.targetLecturerCode) {
                if (String(thread.targetLecturerCode) !== String(userId)) {
                    return res.status(403).send({
                        message: "השיחה מיועדת למרצה אחר מהרשימה",
                    });
                }
            }
            if (me.status !== "manager") {
                if (thread.responderCode && String(thread.responderCode) !== String(userId)) {
                    return res.status(403).send({ message: "שיחה זו מטופלת על ידי מרצה אחר" });
                }
            }
            if (!thread.responderCode) {
                thread.responderCode = userId;
            }
        } else {
            return res.status(403).send({ message: "אין הרשאה" });
        }

        const msg = await ChatMessage.create({
            threadId,
            senderCode: userId,
            content,
        });

        if (isStaff) {
            thread.status = "answered";
            thread.answer = content;
            thread.responderCode = userId;
            await thread.save();
        }

        const populated = await ChatMessage.findById(msg._id)
            .populate("senderCode", "firstName lastName status profileImage")
            .lean();

        res.status(200).send(populated);
    } catch (err) {
        res.status(500).send(err);
    }
};

const addNewQA = async (req, res) => {
    try {
        const userId = getUserIdFromReq(req);
        const payload = { ...req.body };

        if (payload.code === undefined || payload.code === null || payload.code === "") {
            payload.code = await getNextQACode();
        }

        if (userId && (!payload.askerCode || payload.askerCode === "")) {
            payload.askerCode = userId;
        }

        if (!payload.askerCode) {
            return res.status(400).send({ message: "נדרשת התחברות כדי לפתוח שאלה" });
        }

        payload.status = payload.status ?? "notAnswered";

        if (payload.targetLecturerCode) {
            const t = await User.findById(payload.targetLecturerCode).select("status").lean();
            if (!t || !["lecturer", "manager"].includes(t.status)) {
                return res.status(400).send({
                    message: "יש לבחור רב או מרצה מהרשימה המורשית",
                });
            }
        }

        const newItem = new QuestionsAnswers(payload);
        await newItem.save();

        await ChatMessage.create({
            threadId: newItem._id,
            senderCode: payload.askerCode,
            content: String(payload.question ?? "").trim() || "(שאלה)",
        });

        const populated = await QuestionsAnswers.findById(newItem._id)
            .populate("askerCode", "firstName lastName status profileImage")
            .populate("responderCode", "firstName lastName status profileImage")
            .populate("targetLecturerCode", "firstName lastName status profileImage");

        res.status(200).send(populated);
    } catch (err) {
        if (err?.name === "ValidationError") {
            return res.status(400).send({ message: err.message, errors: err.errors });
        }
        res.status(500).send(err);
    }
};

const publishThreadMessagePublic = async (req, res) => {
    try {
        const userId = getUserIdFromReq(req);
        if (!userId) return res.status(401).send({ message: "נדרשת התחברות" });

        const me = await User.findById(userId).select("status").lean();
        if (me?.status !== "lecturer") {
            return res.status(403).send({ message: "פרסום זמין למרצות בלבד" });
        }

        const { threadId, messageId } = req.params;
        const kind = String(req.body?.kind ?? "");
        if (!["question", "answer"].includes(kind)) {
            return res.status(400).send({ message: "יש לשלוח kind: question או answer" });
        }

        const thread = await QuestionsAnswers.findById(threadId);
        if (!thread) return res.status(404).send({ message: "השיחה לא נמצאה" });

        if (thread.targetLecturerCode && String(thread.targetLecturerCode) !== String(userId)) {
            const imResp = thread.responderCode && String(thread.responderCode) === String(userId);
            if (!imResp) {
                return res.status(403).send({ message: "השיחה מיועדת למרצה אחרת" });
            }
        }
        if (thread.responderCode && String(thread.responderCode) !== String(userId)) {
            return res.status(403).send({ message: "שיחה זו מטופלת על ידי מרצה אחר" });
        }

        const askerId = String(thread.askerCode);

        if (String(messageId).startsWith("fallback-")) {
            if (kind !== "question") {
                return res.status(400).send({ message: "ניתן לפרסם רק שאלה מההודעה הראשונה" });
            }
            const content = String(thread.question ?? "").trim();
            if (content.length < 1) {
                return res.status(400).send({ message: "אין טקסט שאלה לפרסם" });
            }
            thread.publicQaQuestionText = content;
        } else {
            const msg = await ChatMessage.findById(messageId);
            if (!msg || String(msg.threadId) !== String(threadId)) {
                return res.status(404).send({ message: "הודעה לא נמצאה" });
            }
            const senderId = String(msg.senderCode);

            if (kind === "question") {
                if (senderId !== askerId) {
                    return res.status(403).send({ message: "ניתן לפרסם רק הודעות של התלמידה" });
                }
                thread.publicQaQuestionText = String(msg.content ?? "").trim();
            } else {
                if (senderId !== String(userId)) {
                    return res.status(403).send({ message: "ניתן לפרסם רק תגובות שכתבת בעצמך" });
                }
                const sender = await User.findById(senderId).select("status").lean();
                if (!sender || !["lecturer", "manager"].includes(sender.status)) {
                    return res.status(403).send({ message: "ניתן לפרסם רק תגובות צוות" });
                }
                thread.publicQaAnswerText = String(msg.content ?? "").trim();
                thread.responderCode = msg.senderCode;
            }
        }

        activatePublicQaIfComplete(thread);
        await thread.save();

        const populated = await QuestionsAnswers.findById(threadId)
            .populate("askerCode", "firstName lastName status profileImage")
            .populate("responderCode", "firstName lastName status profileImage")
            .populate("targetLecturerCode", "firstName lastName status profileImage")
            .lean();

        res.status(200).send(populated);
    } catch (err) {
        res.status(500).send(err);
    }
};

/** כל ההודעות עם תלמידה אחת — ציר זמן מאוחד (וואטסאפ) */
const getLecturerStudentUnifiedMessages = async (req, res) => {
    try {
        const auth = await requireStaffUser(req, res);
        if (!auth) return;
        const { userId, me } = auth;
        const { studentId } = req.params;
        const askerId = mongoose.Types.ObjectId.isValid(studentId)
            ? new mongoose.Types.ObjectId(String(studentId))
            : studentId;

        const query = {
            askerCode: askerId,
            ...lecturerThreadFilter(me, userId),
        };

        const threads = await QuestionsAnswers.find(query)
            .sort({ updatedAt: -1 })
            .populate("askerCode", "firstName lastName status profileImage email")
            .populate("targetLecturerCode", "firstName lastName status profileImage")
            .populate("responderCode", "firstName lastName status profileImage")
            .lean();

        if (!threads.length) {
            return res.status(200).send({
                student: null,
                primaryThreadId: null,
                threadMeta: {},
                messages: [],
            });
        }

        const threadIds = threads.map((t) => t._id);
        const allMsgs = await ChatMessage.find({ threadId: { $in: threadIds } })
            .sort({ createdAt: 1 })
            .populate("senderCode", "firstName lastName status profileImage")
            .lean();

        const msgsByThread = new Map();
        for (const m of allMsgs) {
            const key = String(m.threadId);
            if (!msgsByThread.has(key)) msgsByThread.set(key, []);
            msgsByThread.get(key).push(m);
        }

        const threadMeta = {};
        const messages = [];

        for (const thread of threads) {
            const tid = String(thread._id);
            threadMeta[tid] = {
                question: thread.question,
                status: thread.status,
                publicQaQuestionText: thread.publicQaQuestionText,
                publicQaAnswerText: thread.publicQaAnswerText,
            };

            let rows = msgsByThread.get(tid) ?? [];
            if (!rows.length && thread.question) {
                rows = [
                    {
                        _id: `fallback-${tid}`,
                        threadId: thread._id,
                        senderCode: thread.askerCode,
                        content: thread.question,
                        createdAt: thread.createdAt ?? thread.dateTime ?? new Date(),
                        synthetic: true,
                    },
                ];
            }

            for (const m of rows) {
                messages.push({
                    ...m,
                    threadId: thread._id,
                    threadLabel: String(thread.question ?? "").trim().slice(0, 56),
                });
            }
        }

        messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        res.status(200).send({
            student: threads[0].askerCode,
            primaryThreadId: threads[0]._id,
            threadMeta,
            messages,
        });
    } catch (err) {
        res.status(500).send(err);
    }
};

/** מחיקת הודעה משלך (או הודעת תלמידה בניהול השיחה) */
const deleteThreadMessage = async (req, res) => {
    try {
        const userId = getUserIdFromReq(req);
        if (!userId) return res.status(401).send({ message: "נדרשת התחברות" });

        const me = await User.findById(userId).select("status").lean();
        if (!me) return res.status(401).send({ message: "משתמש לא נמצא" });

        const { threadId, messageId } = req.params;
        const thread = await QuestionsAnswers.findById(threadId);
        if (!thread) return res.status(404).send({ message: "השיחה לא נמצאה" });

        const isStaff = ["lecturer", "manager"].includes(me.status);
        const isStudent = me.status === "student";
        const askerId = String(thread.askerCode);

        if (isStudent) {
            if (String(thread.askerCode) !== String(userId)) {
                return res.status(403).send({ message: "אין הרשאה" });
            }
        } else if (isStaff) {
            const access = await assertLecturerCanAccessThread(thread, me, userId);
            if (!access.ok) return res.status(access.status).send({ message: access.message });
        } else {
            return res.status(403).send({ message: "אין הרשאה" });
        }

        if (String(messageId).startsWith("fallback-")) {
            if (!isStudent && me.status !== "manager") {
                const access = await assertLecturerCanAccessThread(thread, me, userId);
                if (!access.ok) return res.status(access.status).send({ message: access.message });
            }
            const q = String(thread.question ?? "").trim();
            if (q) {
                await cascadePublishedPairDelete(thread, threadId, {
                    isQuestionMessage: true,
                    content: q,
                });
            } else {
                stripAllPublicQa(thread);
            }
            thread.question = "";
            await thread.save();
            await ChatMessage.deleteMany({ threadId });
            await syncThreadAfterMessageChange(threadId);
            return res.status(200).send({ ok: true, threadId });
        }

        const msg = await ChatMessage.findById(messageId);
        if (!msg || String(msg.threadId) !== String(threadId)) {
            return res.status(404).send({ message: "הודעה לא נמצאה" });
        }

        const senderId = String(msg.senderCode);
        const content = String(msg.content ?? "").trim();
        const isQuestionMessage = senderId === askerId;

        if (isStudent) {
            if (senderId !== String(userId)) {
                return res.status(403).send({ message: "ניתן למחוק רק הודעות שלך" });
            }
        } else if (me.status === "lecturer") {
            if (senderId !== String(userId) && senderId !== askerId) {
                return res.status(403).send({ message: "אין הרשאה למחוק הודעה זו" });
            }
        }

        if (isStaff) {
            const cascaded = await cascadePublishedPairDelete(thread, threadId, {
                isQuestionMessage,
                content,
            });
            if (!cascaded) {
                clearPublicIfMatches(
                    thread,
                    content,
                    isQuestionMessage ? "question" : "answer"
                );
            }
        } else {
            clearPublicIfMatches(thread, content, isQuestionMessage ? "question" : "answer");
        }

        await msg.deleteOne();
        await thread.save();
        await syncThreadAfterMessageChange(threadId);

        res.status(200).send({ ok: true });
    } catch (err) {
        res.status(500).send(err);
    }
};

/** הסרת שאלה/תשובה מעמוד הציבורי (מה שפירסמת) */
const deletePublishedPublic = async (req, res) => {
    try {
        const auth = await requireStaffUser(req, res);
        if (!auth) return;
        const { userId, me } = auth;

        if (me.status !== "lecturer") {
            return res.status(403).send({ message: "פרסום והסרה זמינים למרצות בלבד" });
        }

        const { threadId } = req.params;
        const kind = String(req.body?.kind ?? "");
        if (!["question", "answer"].includes(kind)) {
            return res.status(400).send({ message: "יש לשלוח kind: question או answer" });
        }

        const thread = await QuestionsAnswers.findById(threadId);
        if (!thread) return res.status(404).send({ message: "השיחה לא נמצאה" });

        const access = await assertLecturerCanAccessThread(thread, me, userId);
        if (!access.ok) return res.status(access.status).send({ message: access.message });

        if (kind === "question") {
            if (!String(thread.publicQaQuestionText ?? "").trim()) {
                return res.status(400).send({ message: "שאלה זו לא פורסמה בעמוד הציבורי" });
            }
        } else {
            if (!String(thread.publicQaAnswerText ?? "").trim()) {
                return res.status(400).send({ message: "תשובה זו לא פורסמה בעמוד הציבורי" });
            }
            if (thread.responderCode && String(thread.responderCode) !== String(userId)) {
                return res.status(403).send({ message: "ניתן להסיר רק תשובות שפרסמת" });
            }
        }

        stripAllPublicQa(thread);
        await thread.save();

        const populated = await QuestionsAnswers.findById(threadId)
            .populate("askerCode", "firstName lastName status profileImage")
            .populate("responderCode", "firstName lastName status profileImage")
            .populate("targetLecturerCode", "firstName lastName status profileImage")
            .lean();

        res.status(200).send(populated);
    } catch (err) {
        res.status(500).send(err);
    }
};

const deleteQA = async (req, res) => {
    try {
        const userId = getUserIdFromReq(req);
        if (!userId) return res.status(401).send({ message: "נדרשת התחברות" });

        const me = await User.findById(userId).select("status").lean();
        const thread = await QuestionsAnswers.findById(req.params.id);
        if (!thread) return res.status(404).send({ message: "לא נמצא" });

        const isAsker = String(thread.askerCode) === String(userId);
        const isStaff = me && ["lecturer", "manager"].includes(me.status);

        if (!isAsker && !isStaff) {
            return res.status(403).send({ message: "אין הרשאה למחיקה" });
        }

        if (isStaff && me.status === "lecturer") {
            const access = await assertLecturerCanAccessThread(thread, me, userId);
            if (!access.ok) return res.status(access.status).send({ message: access.message });
        }

        await ChatMessage.deleteMany({ threadId: thread._id });
        const deleted = await QuestionsAnswers.findByIdAndDelete(req.params.id);
        res.status(200).send(deleted);
    } catch (err) {
        res.status(500).send(err);
    }
};

const updateQA = async (req, res) => {
    try {
        const updated = await QuestionsAnswers.findByIdAndUpdate(
            req.params.id,
            { $set: { ...req.body } },
            { new: true }
        );
        res.status(200).send(updated);
    } catch (err) {
        res.status(500).send(err);
    }
};

module.exports = {
    getAllQA,
    getAnsweredForPublic,
    getInboxUnanswered,
    getLecturerStudentChats,
    getLecturerStudentUnifiedMessages,
    getStudentThreads,
    getThreadMessages,
    postThreadMessage,
    deleteThreadMessage,
    publishThreadMessagePublic,
    deletePublishedPublic,
    getQAById,
    addNewQA,
    deleteQA,
    updateQA,
};
