import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { questionsAnswersService } from "../../services";
import { useHebrewSpeechRecognition } from "../../hooks/useHebrewSpeechRecognition";
import CollapsibleText from "./CollapsibleText";
import ConfirmDialog from "../ConfirmDialog";
import "./LecturerStudentChats.css";
import {
  CHAT_MESSAGE_MAX,
  handleComposerKeyDown,
  resizeComposerTextarea,
} from "./chatComposerUtils";

function displayName(u) {
  if (!u || typeof u !== "object") return "";
  const n = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  return n || "משתמש";
}

function initialFor(u) {
  return displayName(u).slice(0, 1) || "?";
}

function formatTime(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatListWhen(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    const sameDay =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (sameDay) {
      return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("he-IL", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

function formatDayLabel(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    const sameDay =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (sameDay) return "היום";
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear()
    ) {
      return "אתמול";
    }
    return d.toLocaleDateString("he-IL", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    return "";
  }
}

function appendHeardText(prev, text) {
  const t = String(text ?? "").trim();
  if (!t) return prev;
  if (!prev) return t;
  return `${String(prev).trimEnd()} ${t}`.trim();
}

function formatApiError(e) {
  const b = e?.body;
  if (typeof b === "string") return b;
  if (b?.message) return String(b.message);
  if (e?.message) return String(e.message);
  return "שגיאה";
}

const SCROLL_NEAR_PX = 100;
const CHAT_PREVIEW_MAX = 320;

function isNearBottom(el, threshold = SCROLL_NEAR_PX) {
  if (!el) return true;
  return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
}

export default function LecturerStudentChats() {
  const { user, isLoggedIn } = useAuth();
  const userId = user?._id ?? user?.id;

  const [studentChats, setStudentChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  const [chatStudent, setChatStudent] = useState(null);
  const [primaryThreadId, setPrimaryThreadId] = useState(null);
  const [threadMeta, setThreadMeta] = useState({});
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [publishingId, setPublishingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [listSearch, setListSearch] = useState("");
  const [showJump, setShowJump] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const scrollRef = useRef(null);
  /** true = המשתמשת גללה למעלה — לא לזוז אוטומטית ברענון */
  const userScrolledUpRef = useRef(false);
  const lastLoadedStudentRef = useRef(null);
  const speech = useHebrewSpeechRecognition();

  const selectedGroup = useMemo(
    () => studentChats.find((g) => String(g.student?._id) === String(selectedStudentId)),
    [studentChats, selectedStudentId]
  );

  const activeThreadId = primaryThreadId ?? selectedGroup?.primaryThreadId ?? null;

  const threadAskerId = useMemo(() => {
    if (!chatStudent?._id) return "";
    return String(chatStudent._id);
  }, [chatStudent]);

  const loadChats = useCallback(async (silent = false) => {
    if (!userId || !isLoggedIn) return;
    if (!silent) setLoading(true);
    try {
      const data = await questionsAnswersService.lecturerStudentChats(userId);
      setStudentChats(Array.isArray(data) ? data : []);
    } catch (e) {
      if (!silent) setError(formatApiError(e));
      setStudentChats([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [userId, isLoggedIn]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useEffect(() => {
    const id = setInterval(() => loadChats(true), 8000);
    return () => clearInterval(id);
  }, [loadChats]);

  useEffect(() => {
    if (loading || studentChats.length === 0 || selectedStudentId) return;
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 720px)").matches) {
      return;
    }
    const first = studentChats.find((g) => g.student?._id);
    if (first) openStudentChat(first);
  }, [loading, studentChats, selectedStudentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredChats = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return studentChats;
    return studentChats.filter((g) =>
      displayName(g.student).toLowerCase().includes(q)
    );
  }, [studentChats, listSearch]);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  const loadStudentMessages = useCallback(
    async ({ scrollToEnd = false, silent = false } = {}) => {
      if (!userId || !selectedStudentId) {
        setMessages([]);
        setChatStudent(null);
        setPrimaryThreadId(null);
        setThreadMeta({});
        return;
      }

      const group = studentChats.find(
        (g) => String(g.student?._id) === String(selectedStudentId)
      );
      if (!group?.student) {
        setMessages([]);
        setChatStudent(null);
        setPrimaryThreadId(null);
        setThreadMeta({});
        return;
      }

      if (scrollToEnd) {
        userScrolledUpRef.current = false;
      }

      if (!silent) setLoadingMsgs(true);

      const threads = Array.isArray(group.threads) ? group.threads : [];
      const fallbackThreadId = group.primaryThreadId ?? threads[0]?._id ?? null;

      const loadPerThread = async () => {
        const meta = {};
        for (const t of threads) {
          meta[String(t._id)] = {
            question: t.question,
            status: t.status,
            publicQaQuestionText: t.publicQaQuestionText,
            publicQaAnswerText: t.publicQaAnswerText,
          };
        }
        const perThread = await Promise.all(
          threads.map((t) =>
            questionsAnswersService.getMessages(t._id, userId).catch(() => [])
          )
        );
        const merged = [];
        threads.forEach((t, i) => {
          const rows = Array.isArray(perThread[i]) ? perThread[i] : [];
          for (const m of rows) {
            merged.push({
              ...m,
              threadId: t._id,
              threadLabel: String(t.question ?? "").trim().slice(0, 56),
            });
          }
          if (!rows.length && t.question) {
            merged.push({
              _id: `fallback-${t._id}`,
              threadId: t._id,
              senderCode: group.student,
              content: t.question,
              createdAt: t.updatedAt ?? t.createdAt ?? new Date().toISOString(),
              synthetic: true,
              threadLabel: String(t.question ?? "").trim().slice(0, 56),
            });
          }
        });
        merged.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        return { meta, merged };
      };

      try {
        let student = group.student;
        let threadId = fallbackThreadId;
        let meta = {};
        let merged = [];

        try {
          const data = await questionsAnswersService.lecturerStudentMessages(
            selectedStudentId,
            userId
          );
          student = data?.student ?? student;
          threadId = data?.primaryThreadId ?? fallbackThreadId;
          meta =
            data?.threadMeta && typeof data.threadMeta === "object" ? data.threadMeta : {};
          merged = Array.isArray(data?.messages) ? data.messages : [];
          if (!merged.length && threads.length > 0) {
            const fb = await loadPerThread();
            meta = fb.meta;
            merged = fb.merged;
          }
        } catch {
          const fb = await loadPerThread();
          meta = fb.meta;
          merged = fb.merged;
        }

        if (!threadId && threads[0]?._id) {
          threadId = threads[0]._id;
        }

        setChatStudent(student);
        setPrimaryThreadId(threadId);
        setThreadMeta(meta);
        setMessages(merged);

        if (scrollToEnd || !userScrolledUpRef.current) {
          setTimeout(scrollToBottom, 50);
        }
      } catch (e) {
        setError(formatApiError(e));
        if (!silent) {
          setMessages([]);
          setPrimaryThreadId(null);
        }
      } finally {
        if (!silent) setLoadingMsgs(false);
      }
    },
    [userId, selectedStudentId, studentChats, scrollToBottom]
  );

  useEffect(() => {
    if (!selectedStudentId || !userId) {
      lastLoadedStudentRef.current = null;
      setMessages([]);
      setChatStudent(null);
      setPrimaryThreadId(null);
      setThreadMeta({});
      return;
    }
    const group = studentChats.find(
      (g) => String(g.student?._id) === String(selectedStudentId)
    );
    if (!group?.student) return;

    const key = String(selectedStudentId);
    if (lastLoadedStudentRef.current === key) return;
    lastLoadedStudentRef.current = key;

    userScrolledUpRef.current = false;
    loadStudentMessages({ scrollToEnd: true });
  }, [selectedStudentId, userId, studentChats, loadStudentMessages]);

  useEffect(() => {
    if (!selectedStudentId || !userId) return undefined;
    const id = setInterval(() => loadStudentMessages({ silent: true }), 10000);
    return () => clearInterval(id);
  }, [selectedStudentId, userId, loadStudentMessages]);

  function handleMessagesScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const up = !isNearBottom(el);
    userScrolledUpRef.current = up;
    setShowJump(up);
  }

  function jumpToLatest() {
    userScrolledUpRef.current = false;
    setShowJump(false);
    scrollToBottom();
  }

  function backToList() {
    lastLoadedStudentRef.current = null;
    setSelectedStudentId(null);
    setDraft("");
  }

  function openStudentChat(group) {
    const sid = group.student?._id;
    if (!sid) return;
    lastLoadedStudentRef.current = null;
    userScrolledUpRef.current = false;
    setShowJump(false);
    setSelectedStudentId(sid);
    setDraft("");
    setError(null);
  }

  async function runConfirmAction() {
    if (!confirm?.run || confirmBusy) return;
    setConfirmBusy(true);
    setError(null);
    try {
      await confirm.run();
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setConfirmBusy(false);
      setConfirm(null);
    }
  }

  async function doPublishToPublic(messageId, kind, threadId) {
    setPublishingId(`${threadId}-${messageId}-${kind}`);
    try {
      await questionsAnswersService.publishThreadMessage(threadId, messageId, kind, userId);
      await loadChats(true);
      await loadStudentMessages({ silent: true });
    } finally {
      setPublishingId(null);
    }
  }

  function publishToPublic(messageId, kind, threadId) {
    if (!userId || !threadId || publishingId || confirm) return;
    const label = kind === "question" ? "שאלה" : "תשובה";
    setConfirm({
      title: `פרסום ${label}`,
      message: `לפרסם את ה${label} בעמוד השאלות והתשובות באתר?`,
      confirmLabel: "כן, לפרסם",
      variant: "primary",
      run: () => doPublishToPublic(messageId, kind, threadId),
    });
  }

  async function doUnpublishFromPublic(kind, threadId) {
    setDeletingId(`unpub-${threadId}-${kind}`);
    try {
      await questionsAnswersService.unpublishPublic(threadId, kind, userId);
      await loadChats(true);
      await loadStudentMessages({ silent: true });
    } finally {
      setDeletingId(null);
    }
  }

  function unpublishFromPublic(kind, threadId) {
    if (!userId || !threadId || confirm) return;
    const label = kind === "question" ? "שאלה" : "תשובה";
    setConfirm({
      title: `הסרת ${label}`,
      message: `להסיר את הזוג (שאלה ותשובה) מעמוד השאלות והתשובות באתר?`,
      confirmLabel: "כן, להסיר",
      variant: "danger",
      run: () => doUnpublishFromPublic(kind, threadId),
    });
  }

  async function doDeleteMessage(messageId, threadId) {
    setDeletingId(`${threadId}-${messageId}`);
    try {
      await questionsAnswersService.deleteMessage(threadId, messageId, userId);
      await loadChats(true);
      await loadStudentMessages({ silent: true });
    } finally {
      setDeletingId(null);
    }
  }

  function deleteMessage(messageId, threadId, opts = {}) {
    if (!userId || !threadId || confirm) return;
    const { fromStudent = false, isPubQ = false, isPubA = false } = opts;
    let message =
      "למחוק את ההודעה? פעולה זו לא ניתנת לביטול.";
    if (fromStudent && isPubQ) {
      message =
        "למחוק את השאלה? אם פורסמה באתר — גם התשובה המפורסמת תוסר, והודעת התשובה המקושרת בשיחה תימחק.";
    } else if (fromStudent) {
      message = "למחוק את הודעת התלמידה? פעולה זו לא ניתנת לביטול.";
    } else if (isPubA) {
      message =
        "למחוק את התשובה? אם פורסמה באתר — גם השאלה המפורסמת תוסר, והודעת השאלה המקושרת בשיחה תימחק.";
    }
    setConfirm({
      title: fromStudent ? "מחיקת שאלה" : "מחיקת תשובה",
      message,
      confirmLabel: "כן, למחוק",
      variant: "danger",
      run: () => doDeleteMessage(messageId, threadId),
    });
  }

  async function sendMessage() {
    const text = draft.trim();
    const threadId = activeThreadId;
    if (!text || !userId || !threadId || sending) return;
    setSending(true);
    setError(null);
    try {
      await questionsAnswersService.postMessage(threadId, text, userId);
      setDraft("");
      speech.stop();
      userScrolledUpRef.current = false;
      await loadStudentMessages({ scrollToEnd: true, silent: true });
      await loadChats(true);
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setSending(false);
    }
  }

  function voiceToggleDraft() {
    speech.clearSpeechError();
    void speech.toggle((text) => setDraft((p) => appendHeardText(p, text)));
  }

  const studentName = displayName(chatStudent ?? selectedGroup?.student);

  const messagesWithDays = useMemo(() => {
    let last = "";
    return messages.map((m) => {
      const dayKey = formatDayLabel(m.createdAt);
      let daySep = null;
      if (dayKey && dayKey !== last) {
        last = dayKey;
        daySep = dayKey;
      }
      return { ...m, daySep };
    });
  }, [messages]);

  const chatStatusText = loadingMsgs
    ? "טוען הודעות…"
    : selectedGroup?.pendingCount > 0
      ? `${selectedGroup.pendingCount} ממתינות לתשובה`
      : messages.length > 0
        ? `${messages.length} הודעות`
        : "אין הודעות";

  const layoutClass =
    selectedStudentId != null ? "waLayout" : "waLayout waLayout--noChat";

  return (
    <div className="waApp">
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        confirmLabel={confirm?.confirmLabel}
        cancelLabel="ביטול"
        variant={confirm?.variant ?? "primary"}
        busy={confirmBusy}
        onConfirm={runConfirmAction}
        onCancel={() => !confirmBusy && setConfirm(null)}
      />

      {error ? (
        <div className="waApp__alert" role="alert">
          {error}
          <button type="button" className="waApp__alertDismiss" onClick={() => setError(null)}>
            ×
          </button>
        </div>
      ) : null}

      <div className={layoutClass}>
        <aside className="waPane waPane--list" aria-label="רשימת שיחות">
          <div className="waListHead">
            <h2 className="waListHead__title">שיחות עם תלמידות</h2>
            <input
              type="search"
              className="waListHead__search"
              placeholder="חיפוש לפי שם…"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              aria-label="חיפוש תלמידה"
            />
            <p className="waListHead__meta">
              {loading
                ? "טוען…"
                : studentChats.length === 0
                  ? "אין שיחות עדיין"
                  : `${studentChats.length} שיחות`}
            </p>
          </div>

          <div className="waListScroll" role="list">
            {loading ? (
              <p className="waListEmpty">טוען שיחות…</p>
            ) : filteredChats.length === 0 ? (
              <p className="waListEmpty">
                {studentChats.length === 0
                  ? "כשתלמידה תשלח הודעה — השיחה תופיע כאן."
                  : "לא נמצאו תלמידות בשם זה."}
              </p>
            ) : (
              filteredChats.map((g) => {
                const student = g.student;
                const pending = Number(g.pendingCount) || 0;
                const preview = String(g.lastPreview ?? "").trim() || "אין הודעות";
                const when = formatListWhen(g.lastActivity);
                const active = String(selectedStudentId) === String(student?._id);
                const rowClass = [
                  "waConv",
                  active ? "waConv--active" : "",
                  pending > 0 ? "waConv--unread" : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <button
                    key={student?._id}
                    type="button"
                    className={rowClass}
                    role="listitem"
                    onClick={() => openStudentChat(g)}
                  >
                    <div className="waConv__avatar" aria-hidden>
                      {initialFor(student)}
                    </div>
                    <div className="waConv__body">
                      <div className="waConv__row">
                        <span className="waConv__name">{displayName(student)}</span>
                        {when ? <span className="waConv__time">{when}</span> : null}
                      </div>
                      <span className="waConv__preview">
                        {preview.slice(0, 56)}
                        {preview.length > 56 ? "…" : ""}
                      </span>
                    </div>
                    {pending > 0 ? (
                      <span className="waConv__badge" aria-label={`${pending} חדשות`}>
                        {pending > 99 ? "99+" : pending}
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="waPane waPane--chat" aria-label="חלון שיחה">
          {!selectedStudentId ? (
            <div className="waChatPlaceholder">
              <div className="waChatPlaceholder__icon" aria-hidden>
                💬
              </div>
              <p className="waChatPlaceholder__title">בחרי שיחה מהרשימה</p>
              <p>כל השיחות עם התלמידות מוצגות מימין — לחצי על שיחה כדי לראות את ההודעות.</p>
            </div>
          ) : (
            <>
              <header className="waChatHead">
                <button
                  type="button"
                  className="waChatHead__back"
                  onClick={backToList}
                  aria-label="חזרה לרשימה"
                >
                  → רשימה
                </button>
                <div className="waChatHead__avatar" aria-hidden>
                  {initialFor(chatStudent ?? selectedGroup?.student)}
                </div>
                <div className="waChatHead__info">
                  <h2 className="waChatHead__name">{studentName}</h2>
                  <p className="waChatHead__sub">{chatStatusText}</p>
                </div>
              </header>

              <div
                className="waMsgs"
                ref={scrollRef}
                onScroll={handleMessagesScroll}
                role="log"
                aria-live="polite"
              >
                {speech.speechError ? (
                  <div className="waSpeechErr">{speech.speechError}</div>
                ) : null}
                {showJump && messages.length > 0 ? (
                  <button type="button" className="waJump" onClick={jumpToLatest}>
                    ↓ הודעה אחרונה
                  </button>
                ) : null}

                {loadingMsgs && messages.length === 0 ? (
                  <p className="waMsgs__empty">טוען הודעות…</p>
                ) : null}
                {!loadingMsgs && messages.length === 0 ? (
                  <p className="waMsgs__empty">אין הודעות בשיחה זו. כתבי תשובה למטה.</p>
                ) : null}

                {messagesWithDays.map((m) => {
                  const tid = String(m.threadId?._id ?? m.threadId ?? "");
                  const meta = threadMeta[tid] ?? {};
                  const sid = m.senderCode?._id ?? m.senderCode;
                  const mine = String(sid) === String(userId);
                  const fromStudent =
                    Boolean(threadAskerId) && String(sid) === String(threadAskerId);
                  const contentTrim = String(m.content ?? "").trim();
                  const pubQ = String(meta.publicQaQuestionText ?? "").trim();
                  const pubA = String(meta.publicQaAnswerText ?? "").trim();
                  const isPubQ = pubQ && pubQ === contentTrim;
                  const isPubA = pubA && pubA === contentTrim;

                  const busyDelete = deletingId === `${tid}-${m._id}`;
                  const busyUnpubQ = deletingId === `unpub-${tid}-question`;
                  const busyUnpubA = deletingId === `unpub-${tid}-answer`;

                  return (
                    <React.Fragment key={`${tid}-${m._id}`}>
                      {m.daySep ? (
                        <div className="waDay">
                          <span>{m.daySep}</span>
                        </div>
                      ) : null}
                      <div
                        className={
                          mine ? "waBubbleRow waBubbleRow--out" : "waBubbleRow waBubbleRow--in"
                        }
                      >
                        <div className="waBubbleWrap">
                          <div className={mine ? "waBubble waBubble--out" : "waBubble waBubble--in"}>
                            {!mine ? (
                              <div className="waBubble__sender">{displayName(m.senderCode)}</div>
                            ) : null}
                            {contentTrim.length > CHAT_PREVIEW_MAX ? (
                              <CollapsibleText
                                text={m.content}
                                maxLength={CHAT_PREVIEW_MAX}
                                bodyClassName="waBubble__text"
                              />
                            ) : (
                              <p className="waBubble__text">{m.content}</p>
                            )}
                            <div className="waBubble__meta">
                              {m.threadLabel && messages.length > 3 ? (
                                <span className="waBubble__hint" title={m.threadLabel}>
                                  {m.threadLabel.slice(0, 24)}
                                  {m.threadLabel.length > 24 ? "…" : ""}
                                </span>
                              ) : null}
                              <time className="waBubble__time">{formatTime(m.createdAt)}</time>
                            </div>
                          </div>
                          <div className="waBubbleActions">
                            {fromStudent && contentTrim ? (
                              <>
                                {!isPubQ ? (
                                  <button
                                    type="button"
                                    className="siteBtn siteBtn--soft siteBtn--sm"
                                    disabled={publishingId !== null}
                                    onClick={() => publishToPublic(m._id, "question", tid)}
                                  >
                                    {publishingId === `${tid}-${m._id}-question`
                                      ? "מפרסם…"
                                      : "פרסם שאלה"}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="siteBtn siteBtn--danger siteBtn--sm"
                                    disabled={busyUnpubQ}
                                    onClick={() => unpublishFromPublic("question", tid)}
                                  >
                                    {busyUnpubQ ? "מסיר…" : "הסר מהאתר"}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="siteBtn siteBtn--ghost siteBtn--sm"
                                  disabled={busyDelete || publishingId !== null}
                                  onClick={() =>
                                    deleteMessage(m._id, tid, {
                                      fromStudent: true,
                                      isPubQ,
                                    })
                                  }
                                >
                                  {busyDelete ? "מוחק…" : "מחק שאלה"}
                                </button>
                              </>
                            ) : null}
                            {mine && contentTrim ? (
                              <>
                                {!isPubA ? (
                                  <button
                                    type="button"
                                    className="siteBtn siteBtn--soft siteBtn--sm"
                                    disabled={publishingId !== null}
                                    onClick={() => publishToPublic(m._id, "answer", tid)}
                                  >
                                    {publishingId === `${tid}-${m._id}-answer`
                                      ? "מפרסם…"
                                      : "פרסם תשובה"}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="siteBtn siteBtn--danger siteBtn--sm"
                                    disabled={busyUnpubA}
                                    onClick={() => unpublishFromPublic("answer", tid)}
                                  >
                                    {busyUnpubA ? "מסיר…" : "הסר מהאתר"}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="siteBtn siteBtn--ghost siteBtn--sm"
                                  disabled={busyDelete || publishingId !== null}
                                  onClick={() =>
                                    deleteMessage(m._id, tid, {
                                      isPubA,
                                    })
                                  }
                                >
                                  {busyDelete ? "מוחק…" : "מחק תשובה"}
                                </button>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>

              <footer className="waComposer">
                <textarea
                  className="waComposer__input"
                  rows={1}
                  maxLength={CHAT_MESSAGE_MAX}
                  placeholder={
                    activeThreadId ? "הודעה…" : "טוען שיחה…"
                  }
                  value={draft}
                  disabled={!activeThreadId || sending}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    resizeComposerTextarea(e.target, 120);
                  }}
                  onKeyDown={(e) => handleComposerKeyDown(e, sendMessage)}
                />
                <button
                  type="button"
                  className={
                    speech.listening ? "waComposer__mic waComposer__mic--on" : "waComposer__mic"
                  }
                  disabled={sending}
                  onClick={voiceToggleDraft}
                  aria-label="דיבור לטקסט"
                >
                  🎤
                </button>
                <button
                  type="button"
                  className="siteBtn siteBtn--primary waComposer__send"
                  disabled={sending || !draft.trim() || !activeThreadId}
                  onClick={sendMessage}
                >
                  {sending ? "…" : "שליחה"}
                </button>
              </footer>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
