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

export default function ManagerLecturersPage() {
  const { user } = useAuth();
  const managerId = user?._id;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    if (!managerId) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await managerService.listPendingLecturers(managerId);
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
      await managerService.approveLecturer(id, managerId);
      setItems((prev) => prev.filter((u) => u._id !== id));
      refreshNavBadges();
    } catch (err) {
      setError(formatErr(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id) {
    if (!window.confirm("לדחות את בקשת המרצה? יישלח מייל למבקש.")) return;
    setBusyId(id);
    setError(null);
    try {
      await managerService.rejectLecturer(id, managerId);
      setItems((prev) => prev.filter((u) => u._id !== id));
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
      title="אישור רבנים / מרצים"
      subtitle="כל הבקשות הממתינות מרוכזות כאן. אחרי אישור או דחייה — נשלח מייל אוטומטי והרשימה מתעדכנת."
      stat={loading ? "טוען…" : `${items.length} ממתינים`}
    >
      <DashboardAlerts items={alerts} />

      <DashboardPanel
        title="תור אישורים"
        hint="בדקי את פרטי המבקש ולחצי על הפעולה המתאימה."
      >
        {loading ? (
          <p className="muted2">טוען בקשות…</p>
        ) : items.length === 0 ? (
          <DashboardEmpty icon="✓" title="אין בקשות ממתינות">
            כל בקשות המרצים טופלו. בקשות חדשות יופיעו כאן עם מספר בסרגל העליון.
          </DashboardEmpty>
        ) : (
          <div className="dashQueue">
            {items.map((u) => (
              <DashboardQueueCard
                key={u._id}
                title={`${u.firstName} ${u.lastName}`}
                meta={[
                  u.email,
                  u.phone ? `טלפון: ${u.phone}` : null,
                  `נרשם: ${u.createdAt ? new Date(u.createdAt).toLocaleDateString("he-IL") : "—"}`,
                ].filter(Boolean)}
                badge="ממתין לאישור"
                badgeVariant="pending"
                footer={
                  <>
                    <DashButton
                      type="button"
                      variant="primary"
                      disabled={busyId === u._id}
                      onClick={() => handleApprove(u._id)}
                    >
                      {busyId === u._id ? "מאשרת…" : "אישור + מייל"}
                    </DashButton>
                    <DashButton
                      type="button"
                      variant="danger"
                      disabled={busyId === u._id}
                      onClick={() => handleReject(u._id)}
                    >
                      דחייה + מייל
                    </DashButton>
                  </>
                }
              />
            ))}
          </div>
        )}
      </DashboardPanel>
    </DashboardLayout>
  );
}
