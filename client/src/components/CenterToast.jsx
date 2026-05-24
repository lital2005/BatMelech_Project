import "./CenterToast.css";

/**
 * הודעה מרכזית קטנה (הצלחה / שגיאה / מידע) — במקום alert של הדפדפן.
 */
export default function CenterToast({
  open,
  type = "ok",
  title,
  message,
  onClose,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  showClose = true,
}) {
  if (!open) return null;

  const icons = { ok: "✓", error: "!", info: "i" };
  const boxClass = `centerToast__box centerToast__box--${type}`;

  return (
    <div
      className="centerToast"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose?.()}
    >
      <div
        className={boxClass}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="centerToast-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="centerToast__icon" aria-hidden>
          {icons[type] ?? "·"}
        </div>
        {title ? (
          <h3 id="centerToast-title" className="centerToast__title">
            {title}
          </h3>
        ) : null}
        {message ? <p className="centerToast__message">{message}</p> : null}
        <div className="centerToast__actions">
          {actionLabel && onAction ? (
            <button type="button" className="centerToast__btn centerToast__btn--primary" onClick={onAction}>
              {actionLabel}
            </button>
          ) : null}
          {secondaryLabel && onSecondary ? (
            <button type="button" className="centerToast__btn centerToast__btn--ghost" onClick={onSecondary}>
              {secondaryLabel}
            </button>
          ) : null}
          {showClose && !actionLabel ? (
            <button type="button" className="centerToast__btn centerToast__btn--primary" onClick={onClose}>
              הבנתי
            </button>
          ) : null}
        </div>
        {showClose && actionLabel ? (
          <button type="button" className="centerToast__btn centerToast__btn--close" onClick={onClose}>
            סגירה
          </button>
        ) : null}
      </div>
    </div>
  );
}
