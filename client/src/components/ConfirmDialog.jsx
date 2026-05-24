import "./ConfirmDialog.css";

/**
 * חלון אישור קטן במרכז המסך (במקום alert/confirm של הדפדפן).
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "אישור",
  cancelLabel = "ביטול",
  variant = "primary",
  busy = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  const isDanger = variant === "danger";
  const boxClass = isDanger ? "confirmDlg__box confirmDlg__box--danger" : "confirmDlg__box";
  const confirmClass = isDanger
    ? "confirmDlg__btn confirmDlg__btn--danger"
    : "confirmDlg__btn confirmDlg__btn--confirm";

  return (
    <div
      className="confirmDlg"
      role="presentation"
      onClick={busy ? undefined : onCancel}
      onKeyDown={(e) => {
        if (e.key === "Escape" && !busy) onCancel?.();
      }}
    >
      <div
        className={boxClass}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmDlg-title"
        aria-describedby="confirmDlg-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirmDlg__icon" aria-hidden>
          {isDanger ? "⚠" : "?"}
        </div>
        <h3 id="confirmDlg-title" className="confirmDlg__title">
          {title}
        </h3>
        <p id="confirmDlg-desc" className="confirmDlg__message">
          {message}
        </p>
        <div className="confirmDlg__actions">
          <button
            type="button"
            className="confirmDlg__btn confirmDlg__btn--cancel"
            disabled={busy}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={confirmClass}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "מבצע…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
