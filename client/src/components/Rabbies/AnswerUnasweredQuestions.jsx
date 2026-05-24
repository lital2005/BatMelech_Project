import { useEffect, useState } from "react";
import LecturerStudentChats from "./LecturerStudentChats";
import CollapsibleText from "./CollapsibleText";
import { questionsAnswersService } from "../../services";
import "./AnswerUnasweredQuestions.css";

function displayName(user) {
  if (!user || typeof user !== "object") return "משתמש";
  const n = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return n || "משתמש";
}

function roleLabel(status) {
  if (status === "lecturer") return "מרצה";
  if (status === "manager") return "מנהלת";
  if (status === "student") return "תלמידה";
  return "משתמש";
}

function initialFor(user) {
  const n = displayName(user);
  return n.slice(0, 1) || "?";
}

/**
 * כרטיס שאלה + תשובה (תלמידה למעלה, מרצה למטה)
 */
export function QAThreadCard({ q, tone = "light", clampText = true }) {
  const asker = q.askerCode;
  const lecturer = q.responderCode;
  const lecturerName = lecturer ? displayName(lecturer) : "מרצה";
  const cardClass =
    tone === "light" ? "qaFeed__card qaFeed__card--light" : "qaFeed__card";

  return (
    <article className={cardClass}>
      <section className="qaFeed__block qaFeed__block--q" aria-label="שאלה">
        <div className="qaFeed__blockHead">
          <div className="qaFeed__person">
            <div className="qaFeed__avatar" aria-hidden>
              {initialFor(asker)}
            </div>
            <div className="qaFeed__nameBlock">
              <div className="qaFeed__name">{displayName(asker)}</div>
              <div className="qaFeed__role">{roleLabel(asker?.status)}</div>
            </div>
          </div>
          <span className="qaFeed__pill qaFeed__pill--q">שאלה</span>
        </div>
        {clampText ? (
          <CollapsibleText text={q.question} maxLength={220} bodyClassName="qaFeed__question" />
        ) : (
          <p className="qaFeed__question qaFeed__question--full">{q.question}</p>
        )}
      </section>

      <div className="qaFeed__connector" aria-hidden>
        <span className="qaFeed__connectorDot" />
      </div>

      <section className="qaFeed__block qaFeed__block--a" aria-label="תשובה">
        <div className="qaFeed__blockHead">
          <div className="qaFeed__person">
            <div className="qaFeed__avatar qaFeed__avatar--lecturer" aria-hidden>
              {lecturer ? initialFor(lecturer) : lecturerName.slice(0, 1)}
            </div>
            <div className="qaFeed__nameBlock">
              <div className="qaFeed__name">{lecturerName}</div>
              <div className="qaFeed__role">
                {lecturer ? roleLabel(lecturer.status) : "מרצה"}
              </div>
            </div>
          </div>
          <span className="qaFeed__pill qaFeed__pill--a">תשובה</span>
        </div>
        {clampText ? (
          <CollapsibleText
            text={q.answer}
            maxLength={260}
            className="collapsibleText--answer"
            bodyClassName="qaFeed__answer"
          />
        ) : (
          <p className="qaFeed__answer qaFeed__answer--full">{q.answer}</p>
        )}
      </section>
    </article>
  );
}

export function QAPendingCard({ q }) {
  const asker =
    q.askerCode && typeof q.askerCode === "object" ? q.askerCode : null;
  return (
    <div className="qaPendingCard">
      <div className="qaPendingCard__row">
        <div className="qaPendingCard__avatar" aria-hidden>
          {initialFor(asker ?? {})}
        </div>
        <div>
          <div className="qaPendingCard__name">{displayName(asker)}</div>
          <div className="qaPendingCard__role">{roleLabel(asker?.status)}</div>
        </div>
      </div>
      <p className="qaPendingCard__q">{q.question}</p>
      <span className="qaPendingCard__tag">ממתין לתשובת מרצה</span>
    </div>
  );
}

export function PublicQuestionsFeed({
  embedded = false,
  limit = 24,
  hideHead = false,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    questionsAnswersService
      .listAnsweredPublic(limit)
      .then((data) => {
        if (!alive) return;
        setItems(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        if (!alive) return;
        setErr(e);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [limit]);

  const hasItems = items.length > 0;
  const sectionClass = embedded
    ? "qaFeed qaFeed--embedded qaFeed--light"
    : "qaFeed qaFeed--light";
  const trackClass = "qaFeed__track qaFeed__track--stack";

  return (
    <section
      className={sectionClass}
      aria-labelledby={embedded ? "qa-answered-block-title" : "qa-feed-title"}
    >
      <div className="qaFeed__inner">
        {!hideHead ? (
          <div className="qaFeed__head">
            <div>
              {embedded ? (
                <>
                  <h3 id="qa-answered-block-title" className="qaFeed__title">
                    שאלות שנענו
                  </h3>
                  <p className="qaFeed__subtitle">
                    שאלות שתלמידות שאלו ותשובות מרבנים ומרצים — לפי העדכני ביותר.
                  </p>
                </>
              ) : (
                <>
                  <h2 id="qa-feed-title" className="qaFeed__title">
                    מהשטח: שאלות תלמידות ותשובות ממרצות
                  </h2>
                  <p className="qaFeed__subtitle">
                    קטעים מהקהילה — מוצגים בעמוד שאלות ותשובות.
                  </p>
                </>
              )}
            </div>
          </div>
        ) : null}

        {loading && <div className="qaFeed__empty">טוענים שאלות ותשובות…</div>}
        {!loading && err && (
          <div className="qaFeed__err" role="alert">
            לא הצלחנו לטעון את הרשימה. נסו לרענן את הדף.
          </div>
        )}
        {!loading && !err && !hasItems && (
          <div className="qaFeed__empty">
            עדיין אין שאלות שנענו להצגה — מרצות יכולות לפרסם שאלה ותשובה מעמוד «שיחות עם
            תלמידים».
          </div>
        )}
        {!loading && !err && hasItems && (
          <div className={trackClass}>
            {items.map((q) => (
              <QAThreadCard key={q._id} q={q} tone="light" clampText />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default function AnswerUnansweredQuestions() {
  return (
    <div className="qaLecturerPage">
      <header className="pageHero">
        <div className="pageHero__inner">
        <h1 className="pageHero__title">שיחות עם תלמידות</h1>
        <p className="pageHero__lead">
          כל השיחות מוצגות בצד — לחצי על תלמידה כדי לפתוח את הצ׳אט. ניתן לפרסם שאלה או תשובה
          בעמוד הציבורי, ולהסיר פרסום או למחוק הודעות ששלחת.
        </p>
        </div>
      </header>

      <section className="qaLecturerPage__chat" aria-label="רשימת שיחות עם תלמידות">
        <LecturerStudentChats />
      </section>
    </div>
  );
}
