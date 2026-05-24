import React, { useCallback, useEffect, useMemo, useState } from "react";
import { enrollmentService } from "../services";
import { useAuth } from "../auth/AuthContext";
import "./pages.css";

function apiMessage(err, fallback) {
  const msg = err?.body?.message;
  return typeof msg === "string" && msg.trim() ? msg : fallback;
}

function statusLabel(status) {
  if (status === "pending") return "ממתינה לאישור";
  if (status === "initial_approved") return "אושרה — נשלח מייל לתלמידה";
  if (status === "rejected") return "נדחתה";
  return status ?? "";
}

function studentName(row) {
  const s = row?.studentId;
  if (!s || typeof s !== "object") return "תלמידה";
  return [s.firstName, s.lastName].filter(Boolean).join(" ").trim() || "תלמידה";
}

export default function LecturerSeminaryStudentsPage() {
  const { user } = useAuth();
  const userId = user?._id;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [seminaryFilter, setSeminaryFilter] = useState("");
  const [approvingId, setApprovingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await enrollmentService.listForLecturer(userId);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const seminariesInList = useMemo(() => {
    const map = new Map();
    for (const row of items) {
      const sem = row?.seminaryId;
      if (sem?._id && !map.has(sem._id)) {
        map.set(sem._id, sem.name ?? "מדרשייה");
      }
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((row) => {
      if (statusFilter && row.status !== statusFilter) return false;
      if (seminaryFilter && String(row?.seminaryId?._id ?? row?.seminaryId) !== seminaryFilter) {
        return false;
      }
      return true;
    });
  }, [items, statusFilter, seminaryFilter]);

  async function handleInitialApproval(requestId) {
    if (!userId || !requestId) return;
    setApprovingId(requestId);
    setSuccessMsg("");
    setError(null);
    try {
      const updated = await enrollmentService.sendInitialApproval(requestId, userId);
      setItems((prev) =>
        prev.map((row) => (String(row._id) === String(requestId) ? updated : row))
      );
      setSuccessMsg("נשלח אישור ראשוני והודעה במייל לתלמידה.");
    } catch (err) {
      setError(err);
    } finally {
      setApprovingId(null);
    }
  }

  return (
    <div className="page page--lecturer-students">
      <header className="pageHero pageHero--compact">
        <div className="pageHero__inner">
        <h1 className="pageHero__title">ניהול תלמידות במדרשייה</h1>
        <p className="pageHero__lead">
          בקשות הצטרפות שנשלחו מדף המדרשיות. לאחר אישור ראשוני התלמידה תקבל מייל שהבקשה התקבלה
          והמדרשייה תיצור איתה קשר להמשך.
        </p>
        </div>
      </header>

      {successMsg ? <div className="panel panel--success">{successMsg}</div> : null}
      {error ? (
        <div className="panel panel--error">
          {apiMessage(error, "שגיאה בטעינת הבקשות")}
        </div>
      ) : null}

      <div className="enrollmentFilters">
        <label className="enrollmentFilters__field">
          <span className="enrollmentFilters__label">סטטוס</span>
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="pending">ממתינות לאישור</option>
            <option value="initial_approved">אושרו (נשלח מייל)</option>
            <option value="rejected">נדחו</option>
            <option value="">הכל</option>
          </select>
        </label>
        <label className="enrollmentFilters__field">
          <span className="enrollmentFilters__label">מדרשייה</span>
          <select
            className="input"
            value={seminaryFilter}
            onChange={(e) => setSeminaryFilter(e.target.value)}
          >
            <option value="">כל המדרשיות שלי</option>
            {seminariesInList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="siteBtn siteBtn--ghost" onClick={load} disabled={loading}>
          רענון
        </button>
      </div>

      {loading ? <div className="panel">טוען בקשות…</div> : null}

      {!loading && !filtered.length ? (
        <div className="panel">אין בקשות להצגה לפי הסינון שנבחר.</div>
      ) : null}

      {!loading && filtered.length > 0 ? (
        <div className="enrollmentTableWrap">
          <table className="enrollmentTable">
            <thead>
              <tr>
                <th>תלמידה</th>
                <th>מייל</th>
                <th>טלפון</th>
                <th>מדרשייה</th>
                <th>תאריך בקשה</th>
                <th>סטטוס</th>
                <th>פעולה</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const student = row.studentId;
                const sem = row.seminaryId;
                const canApprove = row.status === "pending";
                return (
                  <tr key={row._id}>
                    <td>{studentName(row)}</td>
                    <td dir="ltr">{student?.email ?? "—"}</td>
                    <td dir="ltr">{student?.phone ?? "—"}</td>
                    <td>
                      {sem?.name ?? "—"}
                      {sem?.city ? (
                        <span className="muted enrollmentTable__sub"> · {sem.city}</span>
                      ) : null}
                    </td>
                    <td>
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleDateString("he-IL")
                        : "—"}
                    </td>
                    <td>
                      <span
                        className={
                          row.status === "pending"
                            ? "enrollmentBadge enrollmentBadge--pending"
                            : row.status === "initial_approved"
                              ? "enrollmentBadge enrollmentBadge--ok"
                              : "enrollmentBadge"
                        }
                      >
                        {statusLabel(row.status)}
                      </span>
                    </td>
                    <td>
                      {canApprove ? (
                        <button
                          type="button"
                          className="siteBtn siteBtn--primary siteBtn--sm"
                          disabled={approvingId === row._id}
                          onClick={() => handleInitialApproval(row._id)}
                        >
                          {approvingId === row._id ? "שולח…" : "שלח אישור ראשוני"}
                        </button>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
