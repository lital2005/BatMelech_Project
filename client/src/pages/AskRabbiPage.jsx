import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import AskRabbiPanel from "../components/Rabbies/AskRabbiPanel";
import "./AskRabbiPage.css";

export default function AskRabbiPage() {
  const { user } = useAuth();
  if (user?.status === "manager") {
    return <Navigate to="/manager/lecturers" replace />;
  }
  if (user?.status === "lecturer") {
    return <Navigate to="/lecturer/questions" replace />;
  }

  return (
    <div className="askRabbiPage">
      <header className="pageHero">
        <div className="pageHero__inner">
        <h1 className="pageHero__title">שאל את הרב</h1>
        <p className="pageHero__lead">
          בחרי מרצה או רב מהרשימה — ופתחי שיחה אישית. אורחות יכולות לצפות ברשימה; לשליחת הודעה
          נדרשת הרשמה והתחברות כתלמידה.
        </p>
        </div>
      </header>
      <AskRabbiPanel layout="page" />
    </div>
  );
}
