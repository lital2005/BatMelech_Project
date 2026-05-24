import React from "react";
import { useAuth } from "../auth/AuthContext";
import { PublicQuestionsFeed } from "../components/Rabbies/AnswerUnasweredQuestions";
import "./pages.css";
import "./QAPage.css";

export default function QAPage() {
  const { user } = useAuth();
  const isLecturer = user?.status === "lecturer";

  return (
    <div className="qaPageShell qaPageShell--noAside">
      <div className="qaPageShell__main">
        <header className="pageHero qaPageShell__intro">
          <div className="pageHero__inner">
            <h1 className="pageHero__title">שאלות ותשובות מהקהילה</h1>
            <p className="pageHero__lead">
              כאן תוכלו לקרוא שאלות שתלמידות שאלו ותשובות מרבנים ומרצים.
              {isLecturer
                ? " לשיחה אישית עם תלמידות — השתמשו בפריט «שיחות עם תלמידות» בתפריט למעלה."
                : " לשיחה אישית עם מרצה או רב — השתמשו בפריט «שאל את הרב» בתפריט למעלה."}
            </p>
          </div>
        </header>

        <PublicQuestionsFeed embedded hideHead limit={80} />
      </div>
    </div>
  );
}
