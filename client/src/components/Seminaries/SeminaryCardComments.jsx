import React, { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 3;

function displayName(user) {
  if (!user || typeof user !== "object") return "משתמש";
  const n = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return n || "משתמש";
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("he-IL");
  } catch {
    return "";
  }
}

export function StarsDisplay({ value }) {
  const v = Number(value);
  if (!Number.isInteger(v) || v < 1 || v > 5) return null;
  return (
    <div className="starRating starRating--readonly" dir="ltr" aria-label={`דירוג ${v} מתוך 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={n <= v ? "starRating__icon starRating__icon--on" : "starRating__icon"}
          aria-hidden
        >
          ★
        </span>
      ))}
    </div>
  );
}

export function StarsInput({ value, onChange, disabled }) {
  const v = Number.isInteger(value) && value >= 1 && value <= 5 ? value : 5;
  return (
    <div className="starRating starRating--input" role="group" aria-label="דירוג המדרשייה">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={n <= v ? "starRating__btn starRating__btn--on" : "starRating__btn"}
          onClick={() => onChange(n)}
          disabled={disabled}
          aria-label={`בחירת דירוג ${n} מתוך 5`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function SeminaryCardComments({
  seminaryId,
  comments,
  isLoggedIn,
  draft,
  rating,
  posting,
  onDraftChange,
  onRatingChange,
  onSubmit,
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [seminaryId, comments?.length]);

  const sorted = useMemo(() => {
    return [...(comments ?? [])].sort((a, b) => {
      const ta = new Date(a.createdAt ?? a.date ?? 0).getTime();
      const tb = new Date(b.createdAt ?? b.date ?? 0).getTime();
      return tb - ta;
    });
  }, [comments]);

  const visible = sorted.slice(0, visibleCount);
  const hasMore = sorted.length > visibleCount;

  return (
    <aside className="seminaryCard__comments" aria-label="תגובות על המדרשייה">
      <h4 className="seminaryCard__sideTitle">תגובות</h4>

      {visible.length ? (
        <div className="commentList commentList--side">
          {visible.map((c) => {
            const author = displayName(c.userCode);
            const when = formatDate(c.createdAt ?? c.date);
            return (
              <div key={c._id} className="commentBubble commentBubble--compact">
                <div className="commentBubble__meta">
                  <span className="commentBubble__author">{author}</span>
                  {when ? <span className="commentBubble__when muted">{when}</span> : null}
                </div>
                <StarsDisplay value={c.rating} />
                <div className="commentBubble__text">{c.content}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="seminaryCard__sideEmpty muted">אין עדיין תגובות. היי הראשונה לכתוב!</p>
      )}

      {hasMore ? (
        <button
          type="button"
          className="seminaryCard__moreBtn"
          onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
        >
          לתגובות נוספות…
        </button>
      ) : null}

      {isLoggedIn ? (
        <div className="commentComposer commentComposer--side">
          <div className="commentComposer__rating">
            <span className="commentComposer__ratingLabel muted">דירוג</span>
            <StarsInput value={rating} disabled={posting} onChange={onRatingChange} />
          </div>
          <textarea
            className="input input--textarea"
            rows={3}
            placeholder="כתבי תגובה…"
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            maxLength={1000}
          />
          <div className="commentComposer__footer">
            <span className="muted" style={{ fontSize: 12 }}>
              {draft.length}/1000
            </span>
            <button
              type="button"
              className="siteBtn siteBtn--primary"
              disabled={posting || draft.trim().length < 2}
              onClick={onSubmit}
            >
              {posting ? "שולח…" : "פרסם"}
            </button>
          </div>
        </div>
      ) : (
        <p className="muted seminaryCard__loginHint">כדי לפרסם תגובה יש להתחבר.</p>
      )}
    </aside>
  );
}
