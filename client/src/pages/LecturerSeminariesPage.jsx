import React, { useEffect, useMemo, useState } from "react";
import {
  galleryService,
  materialsService,
  notificationService,
  seminaryService,
  topicsService,
} from "../services";
import { useAuth } from "../auth/AuthContext";
import { refreshNavBadges } from "../utils/navBadges";
import {
  DashButton,
  DashboardAlerts,
  DashboardEmpty,
  DashboardInboxItem,
  DashboardLayout,
  DashboardPanel,
  DashboardTabs,
  SeminaryManageCard,
} from "../components/Dashboard/DashboardLayout";
import "./DashboardPages.css";
import "./pages.css";

function formatErr(err) {
  return err?.body?.message ?? err?.message ?? String(err ?? "שגיאה");
}

function isSeminaryApproved(s) {
  return String(s?.approvalStatus ?? "approved").toLowerCase() === "approved";
}

function publishStatusLabel(status) {
  return String(status ?? "inactive").toLowerCase() === "active"
    ? "פעילה באתר"
    : "לא פעילה";
}

function approvalBadgeVariant(status) {
  const s = String(status ?? "approved").toLowerCase();
  if (s === "pending") return "pending";
  if (s === "rejected") return "rejected";
  return "approved";
}

function approvalBadgeText(status) {
  const s = String(status ?? "approved").toLowerCase();
  if (s === "pending") return "ממתין לאישור מנהלת";
  if (s === "rejected") return "לא אושרה";
  return "מאושרת";
}

function emptyForm() {
  return {
    name: "",
    city: "",
    address: "",
    phone: "",
    email: "",
    logo: "",
    about: "",
    status: "active",
  };
}

function IconButton({ title, onClick, children, variant }) {
  return (
    <button
      type="button"
      className={variant === "danger" ? "dashIconBtn dashIconBtn--danger" : "dashIconBtn"}
      title={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function PencilIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm18-11.5a1 1 0 0 0 0-1.41l-1.34-1.34a1 1 0 0 0-1.41 0l-1.13 1.13l3.75 3.75L21 5.75Z"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v10h-2V9Zm4 0h2v10h-2V9ZM7 9h2v10H7V9Z"
      />
    </svg>
  );
}

const TABS = [
  { id: "inbox", label: "הודעות" },
  { id: "list", label: "המדרשיות שלי" },
  { id: "form", label: "הוספה / עריכה" },
  { id: "content", label: "תוכן וגלריה" },
];

export default function LecturerSeminariesPage() {
  const { user } = useAuth();
  const userId = user?._id;

  const [items, setItems] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("list");

  const [selectedSeminaryId, setSelectedSeminaryId] = useState("");

  const [imgFile, setImgFile] = useState(null);
  const [imgDesc, setImgDesc] = useState("");
  const [imgBusy, setImgBusy] = useState(false);

  const [matTopicId, setMatTopicId] = useState("");
  const [matContent, setMatContent] = useState("");
  const [matFiles, setMatFiles] = useState([]);
  const [matBusy, setMatBusy] = useState(false);

  const [newTopicName, setNewTopicName] = useState("");
  const [topicBusy, setTopicBusy] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const isEditing = Boolean(editingId);
  const editingItem = useMemo(
    () => (editingId ? items.find((s) => String(s._id) === String(editingId)) : null),
    [items, editingId]
  );
  const editingApproved = editingItem ? isSeminaryApproved(editingItem) : false;

  function load() {
    setLoading(true);
    setError(null);
    Promise.all([seminaryService.list(), topicsService.list()])
      .then(([seminaries, topicList]) => {
        setItems(Array.isArray(seminaries) ? seminaries : []);
        setTopics(Array.isArray(topicList) ? topicList : []);
      })
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!userId) return;
    notificationService
      .list(userId)
      .then((rows) => setNotifications(Array.isArray(rows) ? rows : []))
      .catch(() => setNotifications([]));
  }, [userId, successMsg]);

  async function markNoticeRead(id) {
    if (!userId) return;
    try {
      await notificationService.markRead(id, userId);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
      refreshNavBadges();
    } catch {
      /* ignore */
    }
  }

  async function markAllRead() {
    const unread = notifications.filter((n) => !n.readAt);
    for (const n of unread) {
      await markNoticeRead(n._id);
    }
  }

  async function setSeminaryPublishStatus(seminaryId, status) {
    if (!userId) return;
    setSaving(true);
    setError(null);
    try {
      await seminaryService.update(seminaryId, { status }, userId);
      setSuccessMsg(
        status === "active"
          ? "המדרשייה פורסמה ומוצגת כעת באתר לתלמידות."
          : "המדרשייה הוגדרה כלא פעילה ואינה מוצגת באתר."
      );
      load();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  const myIds = useMemo(() => {
    const s = new Set();
    for (const it of items) {
      const creator = it?.createdBy?._id ?? it?.createdBy;
      if (userId && creator && String(creator) === String(userId)) {
        s.add(it._id);
      }
    }
    return s;
  }, [items, userId]);

  const mySeminaries = useMemo(
    () => items.filter((s) => myIds.has(s._id)),
    [items, myIds]
  );

  const myApprovedSeminaries = useMemo(
    () => mySeminaries.filter((s) => isSeminaryApproved(s)),
    [mySeminaries]
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.readAt).length,
    [notifications]
  );

  const pendingCount = useMemo(
    () =>
      mySeminaries.filter(
        (s) => String(s.approvalStatus ?? "approved").toLowerCase() === "pending"
      ).length,
    [mySeminaries]
  );

  useEffect(() => {
    if (!selectedSeminaryId && myApprovedSeminaries.length > 0) {
      setSelectedSeminaryId(myApprovedSeminaries[0]._id);
    }
  }, [myApprovedSeminaries, selectedSeminaryId]);

  const alerts = useMemo(() => {
    const list = [];
    if (successMsg) {
      list.push({
        id: "ok",
        type: "success",
        message: successMsg,
        onDismiss: () => setSuccessMsg(null),
      });
    }
    if (error) {
      list.push({
        id: "err",
        type: "error",
        message: formatErr(error),
        onDismiss: () => setError(null),
      });
    }
    return list;
  }, [successMsg, error]);

  const tabs = useMemo(
    () =>
      TABS.map((t) => ({
        ...t,
        label: t.id === "form" && isEditing ? "עריכת מדרשייה" : t.label,
        badge:
          t.id === "inbox"
            ? unreadCount
            : t.id === "list"
              ? pendingCount || undefined
              : undefined,
      })),
    [unreadCount, pendingCount, isEditing]
  );

  async function onSubmit(e) {
    e.preventDefault();
    if (!userId) return;

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: form.name,
        city: form.city || undefined,
        address: form.address || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        logo: form.logo || undefined,
        about: form.about || undefined,
        status: form.status,
      };

      if (isEditing) {
        await seminaryService.update(editingId, payload, userId);
        setSuccessMsg("המדרשייה עודכנה.");
      } else {
        await seminaryService.create(payload, userId);
        setSuccessMsg(
          "המדרשייה נשלחה לאישור מנהלת האתר. תקבלי הודעה כאן ובמייל לאחר האישור."
        );
      }

      cancelEdit();
      setActiveTab("list");
      load();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item) {
    setEditingId(item._id);
    setForm({
      name: item.name ?? "",
      city: item.city ?? "",
      address: item.address ?? "",
      phone: item.phone ?? "",
      email: item.email ?? "",
      logo: item.logo ?? "",
      about: item.about ?? "",
      status: item.status ?? "active",
    });
    setActiveTab("form");
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm());
  }

  function openNewForm() {
    cancelEdit();
    setActiveTab("form");
  }

  async function onDelete(id) {
    if (!userId) return;
    const ok = window.confirm("בטוח למחוק את המדרשייה?");
    if (!ok) return;
    try {
      await seminaryService.remove(id, userId);
      if (editingId === id) cancelEdit();
      setSuccessMsg("המדרשייה נמחקה.");
      load();
    } catch (err) {
      setError(err);
    }
  }

  async function uploadImage(e) {
    e.preventDefault();
    if (!userId || !selectedSeminaryId || !imgFile) return;
    setImgBusy(true);
    setError(null);
    try {
      await galleryService.uploadForSeminary(
        { seminaryId: selectedSeminaryId, file: imgFile, description: imgDesc },
        userId
      );
      setImgFile(null);
      setImgDesc("");
      setSuccessMsg("התמונה הועלתה לגלריה.");
      load();
    } catch (err) {
      setError(err);
    } finally {
      setImgBusy(false);
    }
  }

  async function uploadMaterial(e) {
    e.preventDefault();
    if (!userId || !selectedSeminaryId || !matTopicId || !matContent.trim()) return;
    setMatBusy(true);
    setError(null);
    try {
      await materialsService.uploadForSeminary(
        {
          seminaryId: selectedSeminaryId,
          topicCode: matTopicId,
          content: matContent,
          files: matFiles,
        },
        userId
      );
      setMatContent("");
      setMatFiles([]);
      setSuccessMsg("חומר הלימוד נשמר.");
      load();
    } catch (err) {
      setError(err);
    } finally {
      setMatBusy(false);
    }
  }

  async function createTopic(e) {
    e.preventDefault();
    if (!newTopicName.trim()) return;
    setTopicBusy(true);
    setError(null);
    try {
      const created = await topicsService.create({ topicName: newTopicName.trim() });
      setTopics((prev) => [...prev, created]);
      setMatTopicId(created._id);
      setNewTopicName("");
    } catch (err) {
      setError(err);
    } finally {
      setTopicBusy(false);
    }
  }

  const statLabel = loading
    ? "טוען…"
    : unreadCount > 0
      ? `${unreadCount} הודעות חדשות`
      : `${mySeminaries.length} מדרשיות`;

  return (
    <DashboardLayout
      title="ניהול מדרשיות"
      subtitle="הודעות, רשימת המדרשיות, עריכה והעלאת תוכן — כל אזור בלשונית נפרדת. התראות מופיעות תמיד למעלה."
      stat={statLabel}
    >
      <DashboardAlerts items={alerts} />

      <DashboardTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === "inbox" && (
        <DashboardPanel
          title="הודעות מהמערכת"
          hint="אישורי מדרשייה, דחיות ועדכונים — מסומנים כנקראו אחרי לחיצה."
        >
          {notifications.length === 0 ? (
            <DashboardEmpty icon="📬" title="אין הודעות">
              כשמנהלת האתר תאשר או תדחה מדרשייה, ההודעה תופיע כאן.
            </DashboardEmpty>
          ) : (
            <>
              {unreadCount > 0 ? (
                <div className="dashInbox__toolbar">
                  <DashButton type="button" variant="ghost" size="sm" onClick={markAllRead}>
                    סימון הכל כנקרא
                  </DashButton>
                </div>
              ) : null}
              <div className="dashInbox">
                {notifications.map((n) => (
                  <DashboardInboxItem
                    key={n._id}
                    title={n.title}
                    body={n.body}
                    time={n.createdAt ? new Date(n.createdAt).toLocaleString("he-IL") : ""}
                    unread={!n.readAt}
                    onRead={!n.readAt ? () => markNoticeRead(n._id) : undefined}
                  />
                ))}
              </div>
            </>
          )}
        </DashboardPanel>
      )}

      {activeTab === "list" && (
        <DashboardPanel
          title="המדרשיות שלי"
          hint="רק מדרשיות שיצרת. אחרי אישור מנהלת — לחצי «פרסם באתר» כדי להציג לתלמידות."
        >
          <div style={{ marginBottom: 14 }}>
            <DashButton type="button" variant="primary" onClick={openNewForm}>
              + מדרשייה חדשה
            </DashButton>
          </div>

          {loading ? (
            <p className="muted2">טוען מדרשיות…</p>
          ) : mySeminaries.length === 0 ? (
            <DashboardEmpty icon="🏫" title="עדיין אין מדרשיות">
              לחצי על «מדרשייה חדשה» או עברי ללשונית הוספה / עריכה כדי לשלוח בקשה לאישור.
            </DashboardEmpty>
          ) : (
            <div className="dashSemList">
              {mySeminaries.map((s) => {
                const approved = isSeminaryApproved(s);
                const isActive = String(s.status ?? "inactive").toLowerCase() === "active";
                const loc = [s.city, s.address].filter(Boolean).join(" · ");
                return (
                  <SeminaryManageCard
                    key={s._id}
                    name={s.name}
                    location={loc || undefined}
                    about={s.about || undefined}
                    badges={
                      <>
                        <span className={`dashBadge dashBadge--${approvalBadgeVariant(s.approvalStatus)}`}>
                          {approvalBadgeText(s.approvalStatus)}
                        </span>
                        {approved ? (
                          <span className={`dashBadge dashBadge--${isActive ? "live" : "hidden"}`}>
                            {publishStatusLabel(s.status)}
                          </span>
                        ) : null}
                      </>
                    }
                    actions={
                      <>
                        {approved && !isActive ? (
                          <DashButton
                            type="button"
                            variant="primary"
                            size="sm"
                            disabled={saving}
                            onClick={() => setSeminaryPublishStatus(s._id, "active")}
                          >
                            פרסם באתר
                          </DashButton>
                        ) : null}
                        {approved && isActive ? (
                          <DashButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={saving}
                            onClick={() => setSeminaryPublishStatus(s._id, "inactive")}
                          >
                            השבת
                          </DashButton>
                        ) : null}
                        <IconButton title="עריכה" onClick={() => startEdit(s)}>
                          <PencilIcon />
                        </IconButton>
                        <IconButton title="מחיקה" variant="danger" onClick={() => onDelete(s._id)}>
                          <TrashIcon />
                        </IconButton>
                      </>
                    }
                  />
                );
              })}
            </div>
          )}
        </DashboardPanel>
      )}

      {activeTab === "form" && (
        <DashboardPanel
          title={isEditing ? "עריכת מדרשייה" : "הוספת מדרשייה חדשה"}
          hint={
            isEditing
              ? "שינויים נשמרים מיד. פרסום באתר זמין רק אחרי אישור מנהלת."
              : "לאחר השליחה הבקשה תופיע אצל מנהלת האתר לאישור."
          }
        >
          <form className="formGrid" onSubmit={onSubmit}>
            <div className="formGrid__row">
              <label className="field">
                <div className="label">שם המדרשייה *</div>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                  minLength={2}
                />
              </label>
              <label className="field">
                <div className="label">עיר</div>
                <input
                  className="input"
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                />
              </label>
            </div>

            <div className="formGrid__row">
              <label className="field field--wide">
                <div className="label">כתובת</div>
                <input
                  className="input"
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                />
              </label>
            </div>

            <div className="formGrid__row">
              <label className="field">
                <div className="label">טלפון</div>
                <input
                  className="input"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="05XXXXXXXX"
                />
              </label>
              <label className="field">
                <div className="label">מייל</div>
                <input
                  className="input"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  type="email"
                  placeholder="name@example.com"
                />
              </label>
            </div>

            <div className="formGrid__row">
              <label className="field">
                <div className="label">לוגו (קישור)</div>
                <input
                  className="input"
                  value={form.logo}
                  onChange={(e) => setForm((p) => ({ ...p, logo: e.target.value }))}
                  type="url"
                  placeholder="https://..."
                />
              </label>

              {isEditing && editingApproved ? (
                <label className="field">
                  <div className="label">פרסום באתר</div>
                  <select
                    className="input"
                    value={form.status}
                    onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                  >
                    <option value="active">פעילה — מוצגת באתר לתלמידות</option>
                    <option value="inactive">לא פעילה — מוסתרת מהאתר</option>
                  </select>
                </label>
              ) : isEditing ? (
                <div className="field">
                  <div className="label">פרסום</div>
                  <p className="muted2" style={{ margin: 0 }}>
                    לאחר אישור מנהלת האתר תוכלי להפעיל או להשבית את המדרשייה מרשימת המדרשיות.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="formGrid__row">
              <label className="field field--wide">
                <div className="label">אודות</div>
                <textarea
                  className="input input--textarea"
                  value={form.about}
                  onChange={(e) => setForm((p) => ({ ...p, about: e.target.value }))}
                  rows={4}
                  maxLength={1000}
                />
              </label>
            </div>

            <div className="formGrid__actions">
              <DashButton type="submit" variant="primary" disabled={saving || !userId}>
                {saving ? "שומר…" : isEditing ? "עדכן מדרשייה" : "שלח לאישור מנהלת"}
              </DashButton>
              {isEditing ? (
                <DashButton
                  type="button"
                  variant="soft"
                  onClick={() => {
                    cancelEdit();
                    setActiveTab("list");
                  }}
                >
                  ביטול
                </DashButton>
              ) : null}
            </div>
          </form>
        </DashboardPanel>
      )}

      {activeTab === "content" && (
        <DashboardPanel
          title="תוכן וגלריה"
          hint="זמין רק למדרשיות שאושרו. בחרי מדרשייה ואז העלי תמונות או חומרי לימוד."
        >
          {loading ? (
            <p className="muted2">טוען…</p>
          ) : myApprovedSeminaries.length === 0 ? (
            <DashboardEmpty icon="📎" title="אין מדרשייה מאושרת">
              לאחר אישור מנהלת האתר תוכלי להעלות כאן תמונות וחומרי לימוד.
            </DashboardEmpty>
          ) : (
            <div className="dashTools">
              <label className="field dashTools__pick">
                <div className="label">מדרשייה</div>
                <select
                  className="input"
                  value={selectedSeminaryId}
                  onChange={(e) => setSelectedSeminaryId(e.target.value)}
                >
                  {myApprovedSeminaries.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="dashTools__grid">
                <form className="dashToolBox" onSubmit={uploadImage}>
                  <h3 className="dashToolBox__title">תמונה לגלריה</h3>
                  <p className="muted2" style={{ marginBottom: 10 }}>
                    הכיתוב יוצג באתר מתחת לתמונה.
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImgFile(e.target.files?.[0] ?? null)}
                  />
                  <textarea
                    className="input input--textarea"
                    rows={2}
                    placeholder="כיתוב לתמונה…"
                    value={imgDesc}
                    onChange={(e) => setImgDesc(e.target.value)}
                    style={{ marginTop: 8 }}
                  />
                  <DashButton
                    type="submit"
                    variant="primary"
                    disabled={imgBusy || !selectedSeminaryId || !imgFile}
                  >
                    {imgBusy ? "מעלה…" : "העלה תמונה"}
                  </DashButton>
                </form>

                <form className="dashToolBox" onSubmit={uploadMaterial}>
                  <h3 className="dashToolBox__title">חומר לימוד + קבצים</h3>

                  <label className="field">
                    <div className="label">נושא</div>
                    <select
                      className="input"
                      value={matTopicId}
                      onChange={(e) => setMatTopicId(e.target.value)}
                    >
                      <option value="">בחרי נושא…</option>
                      {topics.map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.topicName}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="miniForm">
                    <input
                      className="input"
                      value={newTopicName}
                      onChange={(e) => setNewTopicName(e.target.value)}
                      placeholder="או צרי נושא חדש…"
                    />
                    <DashButton
                      type="button"
                      variant="soft"
                      disabled={topicBusy || !newTopicName.trim()}
                      onClick={createTopic}
                    >
                      {topicBusy ? "יוצר…" : "צור נושא"}
                    </DashButton>
                  </div>

                  <textarea
                    className="input input--textarea"
                    rows={4}
                    placeholder="תוכן החומר (חובה)"
                    value={matContent}
                    onChange={(e) => setMatContent(e.target.value)}
                    required
                    minLength={5}
                  />

                  <input
                    type="file"
                    multiple
                    onChange={(e) => setMatFiles(Array.from(e.target.files ?? []))}
                  />

                  <DashButton
                    type="submit"
                    variant="primary"
                    disabled={
                      matBusy || !selectedSeminaryId || !matTopicId || matContent.trim().length < 5
                    }
                  >
                    {matBusy ? "שומר…" : "שמור חומר"}
                  </DashButton>
                </form>
              </div>
            </div>
          )}
        </DashboardPanel>
      )}
    </DashboardLayout>
  );
}
