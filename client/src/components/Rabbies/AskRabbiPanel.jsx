import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { questionsAnswersService, usersService } from "../../services";
import { useAuth } from "../../auth/AuthContext";
import { useHebrewSpeechRecognition } from "../../hooks/useHebrewSpeechRecognition";
import Avatar from "../Avatar/Avatar";
import CenterToast from "../CenterToast";
import { normalizeProfileImageUrl } from "../../utils/assetUrl";
import "./AskRabbiPanel.css";
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

function formatTime(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatThreadWhen(t) {
  const iso = t?.updatedAt ?? t?.createdAt ?? t?.dateTime;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const dateStr = d.toLocaleDateString("he-IL", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const timeStr = d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
    return `${dateStr} · ${timeStr}`;
  } catch {
    return "";
  }
}

function threadSortKey(t) {
  const iso = t?.updatedAt ?? t?.createdAt ?? t?.dateTime;
  const n = new Date(iso).getTime();
  return Number.isNaN(n) ? 0 : n;
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

function withNormalizedProfile(user) {
  if (!user || typeof user !== "object") return user;
  const pi = normalizeProfileImageUrl(user.profileImage);
  if (!pi) {
    const { profileImage: _drop, ...rest } = user;
    return rest;
  }
  return { ...user, profileImage: pi };
}

function mergeUserFromDirectory(user, directoryById) {
  if (!user || typeof user !== "object") return user;
  const id = user._id ?? user.id;
  if (!id) return withNormalizedProfile(user);
  const fromList = directoryById.get(String(id));
  if (!fromList) return withNormalizedProfile(user);
  return withNormalizedProfile({
    ...user,
    profileImage: user.profileImage || fromList.profileImage,
    firstName: user.firstName ?? fromList.firstName,
    lastName: user.lastName ?? fromList.lastName,
  });
}

function ChatPeerAvatar({ user, size = 40, large = false }) {
  const fallback = (user?.firstName?.trim()?.[0] ?? "?").toUpperCase();
  const cls = large
    ? "askRabbi__waAvatar askRabbi__waAvatar--lg"
    : "askRabbi__waAvatar";
  return (
    <div className={cls} aria-hidden>
      {user ? <Avatar user={user} size={size} /> : <span>{fallback}</span>}
    </div>
  );
}

export default function AskRabbiPanel({ layout = "embed" }) {
  const isPage = layout === "page";
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  const userId = user?._id ?? user?.id;
  const role = user?.status;

  const isStudent = role === "student";
  const isStaff = role === "lecturer" || role === "manager";
  const isLecturerOnly = role === "lecturer";

  const [lecturers, setLecturers] = useState([]);
  const [activeStaff, setActiveStaff] = useState(null);
  const [guestGate, setGuestGate] = useState(null);
  const [targetLecturerId, setTargetLecturerId] = useState("");

  const [threads, setThreads] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [newTopicDraft, setNewTopicDraft] = useState("");
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState("chat");
  const [lecturersError, setLecturersError] = useState(null);
  const [lecturersLoading, setLecturersLoading] = useState(false);
  const [publishingId, setPublishingId] = useState(null);

  const bottomRef = useRef(null);
  const chatSectionRef = useRef(null);
  const speech = useHebrewSpeechRecognition();

  const lecturersById = useMemo(() => {
    const map = new Map();
    for (const l of lecturers) {
      if (l?._id) map.set(String(l._id), withNormalizedProfile(l));
    }
    return map;
  }, [lecturers]);

  /** רשימה לבחירה + מרצים מהיסטוריית שיחות (גם אם לא ברשימה הציבורית) */
  const lecturersForGrid = useMemo(() => {
    const map = new Map(lecturersById);
    for (const t of threads) {
      const target = t?.targetLecturerCode;
      if (target && typeof target === "object" && target._id) {
        const id = String(target._id);
        if (!map.has(id)) {
          map.set(id, mergeUserFromDirectory(target, lecturersById));
        }
      }
    }
    return [...map.values()].sort((a, b) =>
      displayName(a).localeCompare(displayName(b), "he")
    );
  }, [lecturersById, threads]);

  const selectedThread = useMemo(
    () => threads.find((t) => String(t._id) === String(selectedId)),
    [threads, selectedId]
  );

  const threadAskerId = useMemo(() => {
    if (!selectedThread?.askerCode) return "";
    if (typeof selectedThread.askerCode === "object" && selectedThread.askerCode._id != null) {
      return String(selectedThread.askerCode._id);
    }
    return String(selectedThread.askerCode);
  }, [selectedThread]);

  const sortedThreads = useMemo(() => {
    if (!threads.length) return [];
    return [...threads].sort((a, b) => threadSortKey(b) - threadSortKey(a));
  }, [threads]);

  const chatPeerUser = useMemo(() => {
    if (isStaff) {
      const asker = selectedThread?.askerCode;
      if (asker && typeof asker === "object") {
        return mergeUserFromDirectory(asker, lecturersById);
      }
      return null;
    }
    if (activeStaff) {
      return mergeUserFromDirectory(activeStaff, lecturersById);
    }
    const target = selectedThread?.targetLecturerCode;
    if (target && typeof target === "object") {
      return mergeUserFromDirectory(target, lecturersById);
    }
    const responder = selectedThread?.responderCode;
    if (responder && typeof responder === "object") {
      return mergeUserFromDirectory(responder, lecturersById);
    }
    return null;
  }, [isStaff, activeStaff, selectedThread, lecturersById]);

  const chatTitle = useMemo(() => {
    if (isStaff) {
      return displayName(selectedThread?.askerCode) || "תלמידה";
    }
    const to =
      selectedThread?.responderCode && typeof selectedThread.responderCode === "object"
        ? displayName(selectedThread.responderCode)
        : null;
    if (to) return to;
    const want = selectedThread?.targetLecturerCode;
    if (want && typeof want === "object") {
      return displayName(want);
    }
    return "הצוות";
  }, [isStaff, selectedThread]);

  const fetchLecturers = useCallback(() => {
    if (!isPage && !isStudent) return;
    setLecturersLoading(true);
    setLecturersError(null);
    usersService
      .listLecturersForChat()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setLecturers(list.map((row) => withNormalizedProfile(row)));
      })
      .catch((err) => {
        setLecturers([]);
        setLecturersError(formatApiError(err));
      })
      .finally(() => setLecturersLoading(false));
  }, [isPage, isStudent]);

  useEffect(() => {
    fetchLecturers();
  }, [fetchLecturers]);

  const loadThreads = useCallback(async () => {
    if (!userId || !isLoggedIn) return;
    setLoadingThreads(true);
    try {
      const data = isStaff
        ? await questionsAnswersService.inboxUnanswered(userId)
        : await questionsAnswersService.myThreads(userId);
      const list = Array.isArray(data) ? data : [];
      setThreads(list);
    } catch (e) {
      setError(e?.body?.message ?? e?.message ?? "שגיאה בטעינה");
    } finally {
      setLoadingThreads(false);
    }
  }, [userId, isLoggedIn, isStaff]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (!isStaff || !threads.length) return;
    setSelectedId((prev) => prev || threads[0]._id);
  }, [isStaff, threads]);

  const loadMessages = useCallback(async () => {
    if (!userId || !selectedId) {
      setMessages([]);
      return;
    }
    setLoadingMsgs(true);
    setError(null);
    try {
      const data = await questionsAnswersService.getMessages(selectedId, userId);
      setMessages(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.body?.message ?? e?.message ?? "שגיאה בטעינת הודעות");
      setMessages([]);
    } finally {
      setLoadingMsgs(false);
    }
  }, [userId, selectedId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!selectedId || !userId) return undefined;
    const id = setInterval(loadMessages, 4500);
    return () => clearInterval(id);
  }, [selectedId, userId, loadMessages]);

  useEffect(() => {
    const anchor = bottomRef.current;
    if (!anchor) return;
    const pane = anchor.closest(".askRabbi__waScroll");
    if (pane) {
      pane.scrollTop = pane.scrollHeight;
      return;
    }
    anchor.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  const studentChatOpen = isStudent && mode === "chat" && Boolean(selectedId);
  const studentChatModalOpen = studentChatOpen && !isPage;
  const studentChatInlineOpen = studentChatOpen && isPage;

  useEffect(() => {
    if (!studentChatModalOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [studentChatModalOpen]);

  useEffect(() => {
    if (!studentChatModalOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") closeStudentChat();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [studentChatModalOpen]);

  function voiceToggleDraft() {
    speech.clearSpeechError();
    void speech.toggle((text) => setDraft((p) => appendHeardText(p, text)));
  }

  function voiceToggleNewTopic() {
    speech.clearSpeechError();
    void speech.toggle((text) => setNewTopicDraft((p) => appendHeardText(p, text)));
  }

  async function publishToPublic(messageId, kind) {
    if (!userId || !selectedId || publishingId) return;
    setPublishingId(String(messageId));
    setError(null);
    try {
      await questionsAnswersService.publishThreadMessage(selectedId, messageId, kind, userId);
      await loadThreads();
      await loadMessages();
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setPublishingId(null);
    }
  }

  async function sendMessage() {
    const text = draft.trim();
    if (!text || !userId || !selectedId || sending) return;
    setSending(true);
    setError(null);
    try {
      await questionsAnswersService.postMessage(selectedId, text, userId);
      setDraft("");
      speech.stop();
      await loadMessages();
      await loadThreads();
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setSending(false);
    }
  }

  async function createThread(e) {
    e?.preventDefault?.();
    const q = newTopicDraft.trim();
    if (q.length < 5 || !userId || sending) return;
    setSending(true);
    setError(null);
    try {
      const body = {
        question: q,
        status: "notAnswered",
      };
      if (targetLecturerId) {
        body.targetLecturerCode = targetLecturerId;
      }
      const created = await questionsAnswersService.create(body, userId);
      setNewTopicDraft("");
      setMode("chat");
      speech.stop();
      await loadThreads();
      if (created?._id) {
        setSelectedId(created._id);
      }
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSending(false);
    }
  }

  function openStaffChat(member) {
    if (!member?._id) return;
    const fullMember =
      lecturersById.get(String(member._id)) ?? withNormalizedProfile(member);
    if (!isLoggedIn) {
      setGuestGate({ name: displayName(fullMember) });
      return;
    }
    if (!isStudent) return;

    const existing = threads
      .filter(
        (t) =>
          String(t.targetLecturerCode?._id ?? t.targetLecturerCode) === String(member._id)
      )
      .sort((a, b) => threadSortKey(b) - threadSortKey(a))[0];
    setActiveStaff(fullMember);
    setTargetLecturerId(String(member._id));
    setError(null);
    speech.stop();

    if (existing) {
      setSelectedId(existing._id);
      setMode("chat");
    } else {
      setSelectedId(null);
      setMode("compose");
      setNewTopicDraft("");
    }
  }

  function closeStudentChat() {
    setSelectedId(null);
    speech.stop();
  }

  function openStudentThread(t) {
    if (!t?._id) return;
    setSelectedId(t._id);
    setMode("chat");
    setError(null);
    speech.stop();
    const target = t.targetLecturerCode;
    if (target && typeof target === "object" && target._id) {
      setActiveStaff(mergeUserFromDirectory(target, lecturersById));
      setTargetLecturerId(String(target._id));
    } else {
      setActiveStaff(null);
      setTargetLecturerId("");
    }
  }

  function threadPeerLabel(t) {
    if (t.targetLecturerCode && typeof t.targetLecturerCode === "object") {
      return displayName(t.targetLecturerCode);
    }
    if (t.responderCode && typeof t.responderCode === "object") {
      return displayName(t.responderCode);
    }
    return "פנייה כללית לצוות";
  }

  function renderThreadList(onSelect) {
    return (
      <ul className="askRabbi__threadList" role="list">
        {sortedThreads.map((t) => {
          const preview = String(t.question ?? "").trim();
          const when = formatThreadWhen(t);
          const active = selectedId && String(selectedId) === String(t._id);
          return (
            <li key={t._id}>
              <button
                type="button"
                className={
                  active
                    ? "askRabbi__threadCard askRabbi__threadCard--active"
                    : "askRabbi__threadCard"
                }
                onClick={() => onSelect(t)}
              >
                <span className="askRabbi__threadCardTop">
                  <span className="askRabbi__threadCardPeer">{threadPeerLabel(t)}</span>
                  {t.status === "notAnswered" ? (
                    <span className="askRabbi__pill askRabbi__pill--wait">ממתין</span>
                  ) : (
                    <span className="askRabbi__pill askRabbi__pill--ok">נענה</span>
                  )}
                </span>
                {when ? <span className="askRabbi__threadCardWhen">{when}</span> : null}
                <span className="askRabbi__threadCardPreview">
                  {preview.slice(0, 120)}
                  {preview.length > 120 ? "…" : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  const staffGridSection =
    (isPage || isStudent) && !isStaff ? (
      <section className="askStaff" aria-label="בחירת מרצה או רב">
        <h3 className="askStaff__heading">בחרי למי לכתוב</h3>
        <p className="askStaff__hint">
          {isLoggedIn && isStudent
            ? "לחיצה על רב/מרצה — תיפתח שיחה קיימת או שיחה חדשה."
            : "לצפייה ברשימה אין צורך בהתחברות. לשליחת הודעה — התחברי כתלמידה."}
        </p>
        {lecturersLoading ? <p className="askRabbi__muted askStaff__loading">טוען רשימה…</p> : null}
        {lecturersError ? (
          <div className="askRabbi__lectErr">
            <span>{lecturersError}</span>
            <button type="button" className="askRabbi__retry" onClick={fetchLecturers}>
              נסי שוב
            </button>
          </div>
        ) : null}
        {!lecturersLoading && lecturersForGrid.length === 0 ? (
          <p className="askRabbi__muted">אין כרגע מרצים זמינים להצגה.</p>
        ) : (
          <ul className="askStaff__grid" role="list">
            {lecturersForGrid.map((l) => {
              const active =
                activeStaff && String(activeStaff._id) === String(l._id);
              return (
                <li key={l._id}>
                  <button
                    type="button"
                    className={
                      active ? "askStaff__card askStaff__card--active" : "askStaff__card"
                    }
                    onClick={() => openStaffChat(l)}
                  >
                    <span className="askStaff__ring">
                      <Avatar user={l} size={isPage ? 76 : 64} />
                    </span>
                    <span className="askStaff__name">{displayName(l)}</span>
                    <span className="askStaff__role">מרצה</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    ) : null;

  if (!isPage && !isLoggedIn) {
    return (
      <div className="askRabbi askRabbi--premium">
        <div className="askRabbi__header askRabbi__header--brand">
          <h3 className="askRabbi__title">שאל את הרב</h3>
          <p className="askRabbi__subtitle">
            התחברי כדי לבחור מרצה או רב מהמערכת ולפתוח שיחה אישית.
          </p>
        </div>
        <div className="askRabbi__guest">
          <Link className="siteBtn siteBtn--primary askRabbi__btn askRabbi__btn--primary" to="/login">
            התחברות
          </Link>
          <Link className="siteBtn siteBtn--ghost askRabbi__btn askRabbi__btn--ghost" to="/register">
            הרשמה
          </Link>
        </div>
      </div>
    );
  }

  if (!isPage && !isStudent && !isStaff) {
    return (
      <div className="askRabbi askRabbi--premium">
        <div className="askRabbi__header askRabbi__header--brand">
          <h3 className="askRabbi__title">שאל את הרב</h3>
          <p className="askRabbi__muted">סוג משתמש זה אינו כולל צ׳אט ייעודי כאן.</p>
        </div>
      </div>
    );
  }

  const rootClass = isPage
    ? "askRabbi askRabbi--page"
    : "askRabbi askRabbi--premium";

  return (
    <div className={rootClass}>
      <CenterToast
        open={Boolean(guestGate)}
        type="info"
        title="נדרשת התחברות"
        message={
          guestGate
            ? `כדי לפתוח שיחה עם ${guestGate.name}, התחברי או הירשמי כתלמידה.`
            : ""
        }
        actionLabel="התחברות"
        onAction={() => {
          setGuestGate(null);
          navigate("/login");
        }}
        secondaryLabel="הרשמה"
        onSecondary={() => {
          setGuestGate(null);
          navigate("/register");
        }}
        onClose={() => setGuestGate(null)}
        showClose={false}
      />

      {!isPage ? (
        <div className="askRabbi__header askRabbi__header--brand">
          <div className="askRabbi__brandRow">
            <div className="askRabbi__brandIcon" aria-hidden>
              💬
            </div>
            <div>
              <h3 className="askRabbi__title">
                {isStaff ? "שאלות שמחכות למענה" : "שאל את הרב"}
              </h3>
              <p className="askRabbi__subtitle">
                {isStaff
                  ? "שיחות פתוחות — בחרי תלמידה והמשיכי לכתוב כאן."
                  : "בוחרים למי לכתוב, מקלידים או מדברים — והמענה מגיע מהצוות."}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {isPage ? staffGridSection : null}

      {isPage && isStudent && isLoggedIn ? (
        <section className="askRabbi__history" aria-label="השיחות שלי">
          <h3 className="askRabbi__historyTitle">השיחות שלי</h3>
          <p className="askRabbi__historyHint">
            כל השיחות נשמרות כאן. לחצי על שיחה כדי להמשיך, או בחרי רב/מרצה למעלה לשיחה חדשה.
          </p>
          {loadingThreads ? (
            <p className="askRabbi__muted askRabbi__historyLoading">טוען שיחות…</p>
          ) : threads.length === 0 ? (
            <p className="askRabbi__muted">עדיין אין שיחות — בחרי רב/מרצה למעלה כדי להתחיל.</p>
          ) : (
            renderThreadList(openStudentThread)
          )}
        </section>
      ) : null}

      {speech.speechError ? (
        <div className="askRabbi__speechHint askRabbi__speechHint--err">{speech.speechError}</div>
      ) : null}

      {error ? <div className="askRabbi__error">{error}</div> : null}

      {isStudent && !isPage ? (
        <div className="askRabbi__toolbar">
          <button
            type="button"
            className={
              mode === "new"
                ? "askRabbi__seg askRabbi__seg--active"
                : "askRabbi__seg"
            }
            onClick={() => {
              setMode("new");
              setSelectedId(null);
              setActiveStaff(null);
            }}
          >
            שיחה חדשה
          </button>
          <button
            type="button"
            className={
              mode === "chat"
                ? "askRabbi__seg askRabbi__seg--active"
                : "askRabbi__seg"
            }
            onClick={() => {
              setMode("chat");
              setSelectedId(null);
            }}
          >
            השיחות שלי ({threads.length})
          </button>
        </div>
      ) : null}

      {isStudent && mode === "compose" && activeStaff ? (
        <div className="askRabbi__composeWa">
          <div className="askRabbi__waTop">
            <div className="askRabbi__waTopMain">
              <ChatPeerAvatar user={activeStaff} size={44} large />
              <div className="askRabbi__waTopText">
                <div className="askRabbi__waName">שיחה חדשה עם {displayName(activeStaff)}</div>
                <div className="askRabbi__waStatus">כתבי את השאלה הראשונה למטה</div>
              </div>
            </div>
          </div>
          <form className="askRabbi__composeForm" onSubmit={createThread}>
            <textarea
              className="askRabbi__textarea askRabbi__textarea--new"
              rows={4}
              value={newTopicDraft}
              onChange={(e) => setNewTopicDraft(e.target.value)}
              placeholder="כתבי את השאלה… (לפחות 5 תווים)"
              minLength={5}
              maxLength={1000}
            />
            <button
              type="submit"
              className="siteBtn siteBtn--primary askRabbi__submitNew"
              disabled={sending || newTopicDraft.trim().length < 5}
            >
              {sending ? "פותחת שיחה…" : "שליחה ופתיחת שיחה"}
            </button>
          </form>
        </div>
      ) : null}

      {isStudent && mode === "new" && !isPage ? (
        <form className="askRabbi__newForm" onSubmit={createThread}>
          <div className="askRabbi__pickerCard">
            <label className="askRabbi__label askRabbi__label--strong">
              למי לשלוח את השאלה?
            </label>
            {lecturersLoading ? (
              <p className="askRabbi__hint">טוען רשימת מרצים מהשרת…</p>
            ) : null}
            {lecturersError ? (
              <div className="askRabbi__lectErr">
                <span>{lecturersError}</span>
                <button type="button" className="askRabbi__retry" onClick={fetchLecturers}>
                  נסי שוב
                </button>
              </div>
            ) : null}
            <select
              className="askRabbi__select askRabbi__select--fancy"
              value={targetLecturerId}
              onChange={(e) => setTargetLecturerId(e.target.value)}
              disabled={lecturersLoading}
            >
              <option value="">כל הצוות — כל מרצה יכולה לראות</option>
              {lecturers.map((l) => (
                <option key={l._id} value={String(l._id)}>
                  {displayName(l)}
                </option>
              ))}
            </select>
            <p className="askRabbi__hint">
              {targetLecturerId
                ? "רק המרצה שבחרת תקבל את הפנייה בתיבה שלה."
                : "בלי בחירה ספציפית — כל המרצות יראו את השאלה ברשימת המתנה."}
            </p>
          </div>

          <label className="askRabbi__label">ניסוח השאלה (לפחות 5 תווים)</label>
          <div className="askRabbi__voiceRow">
            <div className="askRabbi__voiceCol">
              <textarea
                className="askRabbi__textarea askRabbi__textarea--new"
                rows={4}
                value={newTopicDraft}
                onChange={(e) => setNewTopicDraft(e.target.value)}
                placeholder="כתבי כאן… או לחצי על המיקרופון (לחיצה שנייה לעצירה). אשרי גישה למיקרופון כשהדפדפן מבקש."
                minLength={5}
                maxLength={1000}
              />
              {speech.interimPreview ? (
                <p className="askRabbi__liveTranscript" aria-live="polite">
                  <span className="askRabbi__liveLabel">נשמע עכשיו:</span> {speech.interimPreview}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className={
                speech.listening
                  ? "askRabbi__mic askRabbi__mic--active"
                  : "askRabbi__mic"
              }
              disabled={sending}
              onClick={voiceToggleNewTopic}
              title="דיבור לטקסט — לחיצה שנייה לסיום (Chrome / Edge)"
              aria-label={speech.listening ? "עצירת הקלטה" : "הקלטת דיבור"}
            >
              🎤
            </button>
          </div>
          {!speech.supported ? (
            <p className="askRabbi__hint askRabbi__hint--warn">
              המרת דיבור לא זמינה בדפדפן זה — השתמשי ב‑Chrome או Edge בגירסה עדכנית.
            </p>
          ) : null}
          <button
            type="submit"
            className="askRabbi__submitNew"
            disabled={sending || newTopicDraft.trim().length < 5 || !userId}
          >
            {sending ? "פותחת שיחה…" : "פתיחת שיחה"}
          </button>
        </form>
      ) : null}

      {isStudent && mode === "chat" && (isPage ? Boolean(selectedId) : true) ? (
        loadingThreads ? (
          <div className="askRabbi__threadPick askRabbi__threadPick--student">
            <span className="askRabbi__muted">טוען שיחות…</span>
          </div>
        ) : threads.length === 0 ? (
          <div className="askRabbi__threadPick askRabbi__threadPick--student">
            <div className="askRabbi__threadEmpty">
              <p className="askRabbi__threadEmptyTitle">עדיין אין שיחות</p>
              <p className="askRabbi__muted">פתחי בלשונית «שיחה חדשה» כדי לפנות לצוות.</p>
            </div>
          </div>
        ) : !selectedId && !isPage ? (
          <div className="askRabbi__threadPick askRabbi__threadPick--student">
            <div className="askRabbi__threadBoard">
              <p className="askRabbi__threadBoardHint">
                בחרי שיחה לפי תאריך — הצ׳אט ייפתח רק אחרי הבחירה.
              </p>
              {renderThreadList(openStudentThread)}
            </div>
          </div>
        ) : null
      ) : null}

      {isStaff ? (
        <div className="askRabbi__threadPick">
          {loadingThreads ? (
            <span className="askRabbi__muted">טוען…</span>
          ) : threads.length === 0 ? (
            <span className="askRabbi__muted">אין שאלות פתוחות כרגע 🙏</span>
          ) : (
            <select
              className="askRabbi__select askRabbi__select--fancy"
              value={selectedId ?? ""}
              onChange={(e) => setSelectedId(e.target.value || null)}
            >
              {threads.map((t) => (
                <option key={t._id} value={t._id}>
                  {displayName(t.askerCode)} — אל:{" "}
                  {t.targetLecturerCode
                    ? displayName(t.targetLecturerCode)
                    : "כללי"}{" "}
                  · {String(t.question ?? "").slice(0, 28)}
                  {String(t.question ?? "").length > 28 ? "…" : ""}
                </option>
              ))}
            </select>
          )}
        </div>
      ) : null}

      {isStaff && selectedId ? (
        <div className="askRabbi__wa askRabbi__wa--open">
          <div className="askRabbi__waTop">
            <div className="askRabbi__waTopMain">
              <ChatPeerAvatar user={chatPeerUser} size={40} />
              <div className="askRabbi__waTopText">
                <div className="askRabbi__waName">{chatTitle}</div>
                <div className="askRabbi__waStatus">
                  {selectedThread ? (
                    <span className="askRabbi__waWhen">
                      {formatThreadWhen(selectedThread)}
                    </span>
                  ) : null}
                  {selectedThread?.status === "notAnswered"
                    ? " · ממתין למענה"
                    : " · נענה"}
                </div>
              </div>
            </div>
          </div>

          <div className="askRabbi__waBody">
            {loadingMsgs ? (
              <div className="askRabbi__muted askRabbi__muted--pad">טוען הודעות…</div>
            ) : (
              <div className="askRabbi__waScroll">
                {messages.map((m) => {
                  const sid = m.senderCode?._id ?? m.senderCode;
                  const mine = String(sid) === String(userId);
                  const name = displayName(
                    typeof m.senderCode === "object" ? m.senderCode : {}
                  );
                  const senderStatus =
                    typeof m.senderCode === "object" ? m.senderCode?.status : null;
                  const staffSender =
                    senderStatus === "lecturer" || senderStatus === "manager";
                  const fromStudent =
                    Boolean(threadAskerId) && String(sid) === String(threadAskerId);
                  const contentTrim = String(m.content ?? "").trim();
                  const pubQ = String(selectedThread?.publicQaQuestionText ?? "").trim();
                  const pubA = String(selectedThread?.publicQaAnswerText ?? "").trim();
                  const questionShownOnPublic = pubQ && pubQ === contentTrim;
                  const answerShownOnPublic = pubA && pubA === contentTrim;
                  const showPubQ =
                    isLecturerOnly && fromStudent && contentTrim.length > 0;
                  const showPubA =
                    isLecturerOnly && mine && !fromStudent && staffSender && contentTrim.length > 0;
                  return (
                    <div key={m._id} className="askRabbi__msgBlock">
                      <div
                        className={
                          mine ? "waRow waRow--mine" : "waRow waRow--other"
                        }
                      >
                        <div
                          className={
                            mine ? "waBubble waBubble--mine" : "waBubble waBubble--other"
                          }
                        >
                          {!mine ? <div className="waBubble__name">{name}</div> : null}
                          <div className="waBubble__text">{m.content}</div>
                          <div className="waBubble__time">{formatTime(m.createdAt)}</div>
                        </div>
                      </div>
                      {isStaff && isLecturerOnly && (showPubQ || showPubA) ? (
                        <div
                          className={
                            mine
                              ? "askRabbi__pubRow askRabbi__pubRow--mine"
                              : "askRabbi__pubRow askRabbi__pubRow--other"
                          }
                        >
                          {showPubQ ? (
                            <div className="askRabbi__pubInner">
                              <button
                                type="button"
                                className="askRabbi__pubBtn"
                                disabled={publishingId !== null}
                                onClick={() => publishToPublic(m._id, "question")}
                              >
                                {publishingId === String(m._id) ? "מפרסמים…" : "פרסם שאלה"}
                              </button>
                              {questionShownOnPublic ? (
                                <span className="askRabbi__pubOk">מוצג בעמוד שאלות ותשובות</span>
                              ) : null}
                            </div>
                          ) : null}
                          {showPubA ? (
                            <div className="askRabbi__pubInner">
                              <button
                                type="button"
                                className="askRabbi__pubBtn askRabbi__pubBtn--answer"
                                disabled={publishingId !== null}
                                onClick={() => publishToPublic(m._id, "answer")}
                              >
                                {publishingId === String(m._id) ? "מפרסמים…" : "פרסם תגובה"}
                              </button>
                              {answerShownOnPublic ? (
                                <span className="askRabbi__pubOk">מוצג בעמוד שאלות ותשובות</span>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <div className="askRabbi__waComposer">
            <div className="askRabbi__waInputWrap">
              <textarea
                className="askRabbi__waInput"
                rows={3}
                maxLength={CHAT_MESSAGE_MAX}
                placeholder="כתבי או דברי… Enter לשורה חדשה, Ctrl+Enter לשליחה"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  resizeComposerTextarea(e.target, 280);
                }}
                onKeyDown={(e) => handleComposerKeyDown(e, sendMessage)}
              />
              {speech.interimPreview ? (
                <p
                  className="askRabbi__liveTranscript askRabbi__liveTranscript--wa"
                  aria-live="polite"
                >
                  <span className="askRabbi__liveLabel">נשמע:</span> {speech.interimPreview}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className={
                speech.listening
                  ? "askRabbi__mic askRabbi__mic--wa askRabbi__mic--active"
                  : "askRabbi__mic askRabbi__mic--wa"
              }
              disabled={sending}
              onClick={voiceToggleDraft}
              aria-label={speech.listening ? "עצירת הקלטה" : "דיבור לטקסט"}
            >
              🎤
            </button>
            <button
              type="button"
              className="askRabbi__waSend"
              disabled={sending || !draft.trim()}
              onClick={sendMessage}
              aria-label="שליחה"
            >
              ➤
            </button>
          </div>
        </div>
      ) : null}

      {studentChatInlineOpen ? (
        <section
          ref={chatSectionRef}
          className="askRabbi__pageChat"
          aria-label={`שיחה עם ${chatTitle}`}
        >
          <div className="askRabbi__pageChatHead">
            <button
              type="button"
              className="askRabbi__backToThreads askRabbi__backToThreads--page"
              onClick={closeStudentChat}
            >
              ← חזרה לרשימה
            </button>
            <span className="askRabbi__pageChatTitle">שיחה עם {chatTitle}</span>
          </div>
          <div className="askRabbi__wa askRabbi__wa--open askRabbi__wa--pageInline">
            <div className="askRabbi__waTop askRabbi__waTop--page">
              <div className="askRabbi__waTopMain">
                <ChatPeerAvatar user={chatPeerUser} size={48} large />
                <div className="askRabbi__waTopText">
                  <div className="askRabbi__waName">{chatTitle}</div>
                  <div className="askRabbi__waStatus">
                    {selectedThread ? (
                      <span className="askRabbi__waWhen">
                        {formatThreadWhen(selectedThread)}
                      </span>
                    ) : null}
                    {selectedThread?.status === "notAnswered"
                      ? " · ממתין למענה"
                      : " · נענה"}
                  </div>
                </div>
              </div>
            </div>
            <div className="askRabbi__waBody askRabbi__waBody--pageInline">
              {loadingMsgs ? (
                <div className="askRabbi__muted askRabbi__muted--pad">טוען הודעות…</div>
              ) : (
                <div className="askRabbi__waScroll askRabbi__waScroll--pageInline">
                  {messages.map((m) => {
                    const sid = m.senderCode?._id ?? m.senderCode;
                    const mine = String(sid) === String(userId);
                    const name = displayName(
                      typeof m.senderCode === "object" ? m.senderCode : {}
                    );
                    return (
                      <div
                        key={m._id}
                        className={mine ? "waRow waRow--mine" : "waRow waRow--other"}
                      >
                        <div
                          className={
                            mine ? "waBubble waBubble--mine" : "waBubble waBubble--other"
                          }
                        >
                          {!mine ? <div className="waBubble__name">{name}</div> : null}
                          <div className="waBubble__text">{m.content}</div>
                          <div className="waBubble__time">{formatTime(m.createdAt)}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>
            <div className="askRabbi__waComposer askRabbi__waComposer--page">
              <div className="askRabbi__waInputWrap">
                <textarea
                  className="askRabbi__waInput"
                  rows={3}
                  maxLength={CHAT_MESSAGE_MAX}
                  placeholder="כתבי כאן… Enter לשורה חדשה, Ctrl+Enter לשליחה"
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    resizeComposerTextarea(e.target, 280);
                  }}
                  onKeyDown={(e) => handleComposerKeyDown(e, sendMessage)}
                />
                {speech.interimPreview ? (
                  <p
                    className="askRabbi__liveTranscript askRabbi__liveTranscript--wa"
                    aria-live="polite"
                  >
                    <span className="askRabbi__liveLabel">נשמע:</span> {speech.interimPreview}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className={
                  speech.listening
                    ? "askRabbi__mic askRabbi__mic--wa askRabbi__mic--active"
                    : "askRabbi__mic askRabbi__mic--wa"
                }
                disabled={sending}
                onClick={voiceToggleDraft}
                aria-label={speech.listening ? "עצירת הקלטה" : "דיבור לטקסט"}
              >
                🎤
              </button>
              <button
                type="button"
                className="askRabbi__waSend"
                disabled={sending || !draft.trim()}
                onClick={sendMessage}
                aria-label="שליחה"
              >
                ➤
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {studentChatModalOpen
        ? createPortal(
            <div
              className="askRabbiModal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="askRabbiModalTitle"
            >
              <button
                type="button"
                className="askRabbiModal__backdrop"
                aria-label="סגירה"
                onClick={closeStudentChat}
              />
              <div className="askRabbiModal__sheet">
                <div className="askRabbiModal__header">
                  <div className="askRabbiModal__headerText">
                    <h2 id="askRabbiModalTitle" className="askRabbiModal__title">
                      שיחה עם {chatTitle}
                    </h2>
                    {selectedThread ? (
                      <p className="askRabbiModal__subtitle">
                        {formatThreadWhen(selectedThread)}
                        {selectedThread?.targetLecturerCode &&
                        typeof selectedThread.targetLecturerCode === "object" ? (
                          <>
                            {" · "}
                            פנייה אל {displayName(selectedThread.targetLecturerCode)}
                          </>
                        ) : null}
                        {selectedThread?.status === "notAnswered" ? " · ממתין למענה" : " · נענה"}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="askRabbiModal__close"
                    onClick={closeStudentChat}
                    aria-label="סגירת הצ׳אט"
                  >
                    ✕
                  </button>
                </div>

                <div className="askRabbi__wa askRabbi__wa--open askRabbi__wa--modal">
                  <div className="askRabbi__waTop askRabbi__waTop--modal">
                    <div className="askRabbi__waTopMain">
                      <ChatPeerAvatar user={chatPeerUser} size={48} large />
                      <div className="askRabbi__waTopText">
                        <div className="askRabbi__waName">{chatTitle}</div>
                        <div className="askRabbi__waStatus">
                          {selectedThread?.targetLecturerCode &&
                          typeof selectedThread.targetLecturerCode === "object" ? (
                            <span className="askRabbi__waTag">
                              פנייה אל: {displayName(selectedThread.targetLecturerCode)}
                            </span>
                          ) : (
                            <span className="askRabbi__waTag">פנייה כללית לצוות</span>
                          )}
                          {selectedThread?.status === "notAnswered"
                            ? " · ממתין למענה"
                            : " · נענה"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="askRabbi__waBody askRabbi__waBody--modal">
                    {loadingMsgs ? (
                      <div className="askRabbi__muted askRabbi__muted--pad">טוען הודעות…</div>
                    ) : (
                      <div className="askRabbi__waScroll askRabbi__waScroll--modal">
                        {messages.map((m) => {
                          const sid = m.senderCode?._id ?? m.senderCode;
                          const mine = String(sid) === String(userId);
                          const name = displayName(
                            typeof m.senderCode === "object" ? m.senderCode : {}
                          );
                          return (
                            <div
                              key={m._id}
                              className={mine ? "waRow waRow--mine" : "waRow waRow--other"}
                            >
                              <div
                                className={
                                  mine ? "waBubble waBubble--mine" : "waBubble waBubble--other"
                                }
                              >
                                {!mine ? <div className="waBubble__name">{name}</div> : null}
                                <div className="waBubble__text">{m.content}</div>
                                <div className="waBubble__time">{formatTime(m.createdAt)}</div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={bottomRef} />
                      </div>
                    )}
                  </div>

                  <div className="askRabbi__waComposer askRabbi__waComposer--modal">
                    <div className="askRabbi__waInputWrap">
                      <textarea
                        className="askRabbi__waInput askRabbi__waInput--modal"
                        rows={4}
                        maxLength={CHAT_MESSAGE_MAX}
                        placeholder="כתבי כאן… Enter לשורה חדשה, Ctrl+Enter לשליחה. המיקרופון מוסיף טקסט."
                        value={draft}
                        onChange={(e) => {
                          setDraft(e.target.value);
                          resizeComposerTextarea(e.target, 320);
                        }}
                        onKeyDown={(e) => handleComposerKeyDown(e, sendMessage)}
                      />
                      {speech.interimPreview ? (
                        <p
                          className="askRabbi__liveTranscript askRabbi__liveTranscript--wa askRabbi__liveTranscript--modal"
                          aria-live="polite"
                        >
                          <span className="askRabbi__liveLabel">נשמע עכשיו:</span>{" "}
                          {speech.interimPreview}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className={
                        speech.listening
                          ? "askRabbi__mic askRabbi__mic--wa askRabbi__mic--modal askRabbi__mic--active"
                          : "askRabbi__mic askRabbi__mic--wa askRabbi__mic--modal"
                      }
                      disabled={sending}
                      onClick={voiceToggleDraft}
                      aria-label={speech.listening ? "עצירת הקלטה" : "דיבור לטקסט"}
                    >
                      🎤
                    </button>
                    <button
                      type="button"
                      className="askRabbi__waSend askRabbi__waSend--modal"
                      disabled={sending || !draft.trim()}
                      onClick={sendMessage}
                      aria-label="שליחה"
                    >
                      ➤
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
