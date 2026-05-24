const mongoose = require("mongoose");
const User = require("../models/UsersModel");
const Seminary = require("../models/SeminaryModel");
const SeminaryJoinRequest = require("../models/SeminaryJoinRequestModel");
const { sendJoinInitialApprovalEmail } = require("../services/mailService");

function getUserIdFromReq(req) {
  const raw = req.headers["x-user-id"];
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

async function loadActor(userId) {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return null;
  return User.findById(userId).select("firstName lastName email status").lean();
}

function studentDisplayName(user) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || "תלמידה";
}

const studentPopulate = { path: "studentId", select: "firstName lastName email phone status" };
const seminaryPopulate = { path: "seminaryId", select: "name city address phone email status createdBy" };

/** תלמידה — שליחת בקשת הצטרפות למדרשייה */
const requestJoin = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).send({ message: "נדרשת התחברות" });

    const actor = await loadActor(userId);
    if (!actor) return res.status(401).send({ message: "משתמש לא נמצא" });
    if (actor.status !== "student") {
      return res.status(403).send({ message: "רק תלמידות יכולות לשלוח בקשת הצטרפות" });
    }

    const { seminaryId, message } = req.body ?? {};
    if (!seminaryId || !mongoose.Types.ObjectId.isValid(seminaryId)) {
      return res.status(400).send({ message: "מזהה מדרשייה לא תקין" });
    }

    const seminary = await Seminary.findById(seminaryId).lean();
    if (!seminary) return res.status(404).send({ message: "מדרשייה לא נמצאה" });
    if (String(seminary.status ?? "active") === "inactive") {
      return res.status(400).send({ message: "מדרשייה זו אינה פעילה כרגע" });
    }
    if (!seminary.createdBy) {
      return res.status(400).send({ message: "למדרשייה זו אין מרצה אחראי במערכת" });
    }

    const trimmedMessage =
      typeof message === "string" && message.trim() ? message.trim().slice(0, 500) : undefined;

    let existing = await SeminaryJoinRequest.findOne({
      studentId: userId,
      seminaryId,
    });

    if (existing) {
      if (existing.status === "pending") {
        return res.status(409).send({ message: "כבר נשלחה בקשה הממתינה לאישור" });
      }
      if (existing.status === "initial_approved") {
        return res.status(409).send({ message: "כבר אושרת להצטרפות למדרשייה זו" });
      }
      existing.status = "pending";
      existing.message = trimmedMessage;
      existing.lecturerId = seminary.createdBy;
      existing.initialApprovedAt = undefined;
      await existing.save();
      const populated = await SeminaryJoinRequest.findById(existing._id)
        .populate(studentPopulate)
        .populate(seminaryPopulate);
      return res.status(200).send(populated);
    }

    const doc = new SeminaryJoinRequest({
      studentId: userId,
      seminaryId,
      lecturerId: seminary.createdBy,
      message: trimmedMessage,
      status: "pending",
    });
    await doc.save();

    const populated = await SeminaryJoinRequest.findById(doc._id)
      .populate(studentPopulate)
      .populate(seminaryPopulate);

    res.status(201).send(populated);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).send({ message: "כבר קיימת בקשה למדרשייה זו" });
    }
    res.status(500).send({ message: "שגיאה בשליחת הבקשה" });
  }
};

/** תלמידה — הבקשות שלי */
const myRequests = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).send({ message: "נדרשת התחברות" });

    const actor = await loadActor(userId);
    if (!actor) return res.status(401).send({ message: "משתמש לא נמצא" });

    const data = await SeminaryJoinRequest.find({ studentId: userId })
      .populate(seminaryPopulate)
      .sort({ createdAt: -1 });

    res.status(200).send(data);
  } catch (err) {
    res.status(500).send({ message: "שגיאה בטעינת הבקשות" });
  }
};

/** מרצה — כל בקשות ההצטרפות למדרשיות שלו */
const listForLecturer = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).send({ message: "נדרשת התחברות" });

    const actor = await loadActor(userId);
    if (!actor) return res.status(401).send({ message: "משתמש לא נמצא" });
    if (actor.status !== "lecturer") {
      return res.status(403).send({ message: "גישה למרצים בלבד" });
    }

    const mySeminaryIds = await Seminary.find({ createdBy: userId }).distinct("_id");
    if (!mySeminaryIds.length) {
      return res.status(200).send([]);
    }

    const filter = { seminaryId: { $in: mySeminaryIds } };
    const { status } = req.query ?? {};
    if (status && ["pending", "initial_approved", "rejected"].includes(status)) {
      filter.status = status;
    }

    const data = await SeminaryJoinRequest.find(filter)
      .populate(studentPopulate)
      .populate(seminaryPopulate)
      .sort({ createdAt: -1 });

    res.status(200).send(data);
  } catch (err) {
    res.status(500).send({ message: "שגיאה בטעינת בקשות התלמידות" });
  }
};

/** מרצה — אישור ראשוני + שליחת מייל לתלמידה */
const sendInitialApproval = async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) return res.status(401).send({ message: "נדרשת התחברות" });

    const actor = await loadActor(userId);
    if (!actor) return res.status(401).send({ message: "משתמש לא נמצא" });
    if (actor.status !== "lecturer") {
      return res.status(403).send({ message: "גישה למרצים בלבד" });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ message: "מזהה בקשה לא תקין" });
    }

    const joinRequest = await SeminaryJoinRequest.findById(id)
      .populate(studentPopulate)
      .populate(seminaryPopulate);

    if (!joinRequest) return res.status(404).send({ message: "בקשה לא נמצאה" });

    const seminary = joinRequest.seminaryId;
    if (!seminary || String(seminary.createdBy) !== String(userId)) {
      return res.status(403).send({ message: "אין הרשאה לטפל בבקשה זו" });
    }

    if (joinRequest.status === "initial_approved") {
      return res.status(400).send({ message: "כבר נשלח אישור ראשוני לבקשה זו" });
    }

    if (joinRequest.status === "rejected") {
      return res.status(400).send({ message: "בקשה זו נדחתה ולא ניתן לאשרה" });
    }

    const student = joinRequest.studentId;
    if (!student?.email) {
      return res.status(400).send({ message: "לתלמידה אין כתובת מייל במערכת" });
    }

    await sendJoinInitialApprovalEmail({
      to: student.email,
      studentName: studentDisplayName(student),
      seminaryName: seminary.name ?? "המדרשייה",
      seminaryPhone: seminary.phone,
      seminaryEmail: seminary.email,
    });

    joinRequest.status = "initial_approved";
    joinRequest.initialApprovedAt = new Date();
    await joinRequest.save();

    const updated = await SeminaryJoinRequest.findById(joinRequest._id)
      .populate(studentPopulate)
      .populate(seminaryPopulate);

    res.status(200).send(updated);
  } catch (err) {
    console.error("[enrollment] initial approval failed:", err?.message ?? err);
    res.status(500).send({ message: "שגיאה בשליחת האישור והמייל" });
  }
};

module.exports = {
  requestJoin,
  myRequests,
  listForLecturer,
  sendInitialApproval,
};
