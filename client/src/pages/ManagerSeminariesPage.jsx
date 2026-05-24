import React, { useCallback, useEffect, useState } from "react";
import { managerService } from "../services";
import { useAuth } from "../auth/AuthContext";
import { refreshNavBadges } from "../utils/navBadges";
import {
  DashButton,
  DashboardAlerts,
  DashboardEmpty,
  DashboardLayout,
  DashboardPanel,
  DashboardQueueCard,
} from "../components/Dashboard/DashboardLayout";
import "./DashboardPages.css";

function formatErr(err) {
  return err?.body?.message ?? err?.message ?? "שגיאה";
}

export default function ManagerSeminariesPage() {
  const { user } = useAuth();
  const managerId = user?._id;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [rejectNotes, setRejectNotes] = useState({});

  const load = useCallback(async () => {
    if (!managerId) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await managerService.listPendingSeminaries(managerId);
      setItems(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(formatErr(err));
    } finally {
      setLoading(false);
    }
  }, [managerId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleApprove(id) {
    setBusyId(id);
    setError(null);
    try {
      await managerService.approveSeminary(id, managerId);
      setItems((prev) => prev.filter((s) => s._id !== id));
      refreshNavBadges();
    } catch (err) {
      setError(formatErr(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id) {
    if (!window.confirm("לדחות את המדרשייה? יישלח מייל והודעה למרצה.")) return;
    setBusyId(id);
    setError(null);
    try {
      await managerService.rejectSeminary(id, managerId, rejectNotes[id] ?? "");
      setItems((prev) => prev.filter((s) => s._id !== id));
      refreshNavBadges();
    } catch (err) {
      setError(formatErr(err));
    } finally {
      setBusyId(null);
    }
  }

  const alerts = error ? [{ id: "err", type: "error", message: error }] : [];

  return (
    <DashboardLayout
      title="אישור מדרשיות"
      subtitle="מדרשיות שנשלחו על ידי מרצים. אחרי אישור — המרצה יוכל לפרסם את המדרשייה באתר מעמוד הניהול שלו."
      stat={loading ? "טוען…" : `${items.length} ממתינות`}
    >
      <DashboardAlerts items={alerts} />

      <DashboardPanel
        title="תור אישורים"
        hint="ניתן להוסיף הערה לדחייה — היא תופיע בהודעה למרצה."
      >
        {loading ? (
          <p className="muted2">טוען מדרשיות…</p>
        ) : items.length === 0 ? (
          <DashboardEmpty icon="✓" title="אין מדרשיות ממתינות">
            כל הבקשות טופלו. מדרשיות חדשות יופיעו כאן עם מספר בסרגל.
          </DashboardEmpty>
        ) : (
          <div className="dashQueue">
            {items.map((s) => {
              const creator = s.createdBy;
              const creatorName = creator
                ? `${creator.firstName ?? ""} ${creator.lastName ?? ""}`.trim()
                : "—";
              return (
                <DashboardQueueCard
                  key={s._id}
                  title={s.name}
                  meta={[
                    [s.city, s.address].filter(Boolean).join(" · ") || null,
                    `מרצה: ${creatorName}${creator?.email ? ` · ${creator.email}` : ""}`,
                  ].filter(Boolean)}
                  badge="ממתין לאישור"
                  badgeVariant="pending"
                  detail={s.about || undefined}
                  footer={
                    <>
                      <div className="dashField" style={{ width: "100%", marginBottom: 0 }}>
                        <label className="label" htmlFor={`note-${s._id}`}>
                          הערה לדחייה (אופציונלי)
                        </label>
                        <textarea
                          id={`note-${s._id}`}
                          value={rejectNotes[s._id] ?? ""}
                          onChange={(e) =>
                            setRejectNotes((p) => ({ ...p, [s._id]: e.target.value }))
                          }
                          placeholder="סיבת הדחייה או בקשה לתיקון…"
                        />
                      </div>
                      <DashButton
                        type="button"
                        variant="primary"
                        disabled={busyId === s._id}
                        onClick={() => handleApprove(s._id)}
                      >
                        {busyId === s._id ? "מאשרת…" : "אישור + הודעה למרצה"}
                      </DashButton>
                      <DashButton
                        type="button"
                        variant="danger"
                        disabled={busyId === s._id}
                        onClick={() => handleReject(s._id)}
                      >
                        דחייה + מייל
                      </DashButton>
                    </>
                  }
                />
              );
            })}
          </div>
        )}
      </DashboardPanel>
    </DashboardLayout>
  );
}
