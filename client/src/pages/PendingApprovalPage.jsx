import React from "react";
import { useAuth } from "../auth/AuthContext";
import { DashButton } from "../components/Dashboard/DashboardLayout";
import "./DashboardPages.css";

export default function PendingApprovalPage() {
  const { user, logout } = useAuth();

  return (
    <div className="pendingApproval">
      <h1>הבקשה שלך בבדיקה</h1>
      <p>
        שלום {user?.firstName}, נרשמת כרב/מרצה. מנהלת האתר תבדוק את הבקשה ותשלח אליך מייל
        כשהחשבון יאושר.
      </p>
      <p className="muted2">עד לאישור לא ניתן לגשת לעמודי ניהול המדרשיות.</p>
      <div className="dashBtnRow dashBtnRow--start" style={{ justifyContent: "center" }}>
        <DashButton to="/" variant="ghost">
          דף הבית
        </DashButton>
        <DashButton type="button" variant="primary" onClick={logout}>
          התנתקות
        </DashButton>
      </div>
    </div>
  );
}
