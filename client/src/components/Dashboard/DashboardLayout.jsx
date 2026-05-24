import React from "react";
import { Link } from "react-router-dom";
import "../../pages/DashboardPages.css";

/** כפתור בסגנון הסרגל (siteBtn / dashBtn) */
export function DashButton({
  children,
  variant = "primary",
  size,
  block,
  type = "button",
  className = "",
  to,
  ...props
}) {
  const cn = [
    "siteBtn",
    "dashBtn",
    variant !== "soft" ? `siteBtn--${variant}` : "siteBtn--soft",
    variant !== "soft" ? `dashBtn--${variant}` : "dashBtn--soft",
    size === "sm" ? "siteBtn--sm dashBtn--sm" : "",
    block ? "dashBtn--block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (to) {
    return (
      <Link to={to} className={cn} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={cn} {...props}>
      {children}
    </button>
  );
}

export function DashboardLayout({ title, subtitle, stat, children }) {
  return (
    <div className="dash">
      <header className="dash__hero pageHero">
        <div className="pageHero__inner pageHero__row dash__heroText">
          <div>
            <h1 className="dash__title pageHero__title">{title}</h1>
            {subtitle ? <p className="dash__subtitle pageHero__lead">{subtitle}</p> : null}
          </div>
          {stat != null ? <div className="dash__stat pageHero__stat">{stat}</div> : null}
        </div>
      </header>
      <div className="dash__body">{children}</div>
    </div>
  );
}

export function DashboardAlerts({ items }) {
  if (!items?.length) return null;
  return (
    <div className="dash__alerts" role="status" aria-live="polite">
      {items.map((a) => (
        <div
          key={a.id}
          className={`dashAlert dashAlert--${a.type}`}
          role={a.type === "error" ? "alert" : "status"}
        >
          <span className="dashAlert__text">{a.message}</span>
          {a.onDismiss ? (
            <button type="button" className="dashAlert__dismiss" onClick={a.onDismiss} aria-label="סגירה">
              ×
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function DashboardTabs({ tabs, active, onChange }) {
  return (
    <div className="dashTabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={active === t.id}
          className={`dashTabs__btn${active === t.id ? " dashTabs__btn--active" : ""}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {t.badge != null && t.badge > 0 ? (
            <span className="dashTabs__badge">{t.badge}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function DashboardPanel({ title, hint, children, className = "" }) {
  return (
    <section className={`dashPanel ${className}`.trim()}>
      {title ? (
        <header className="dashPanel__head">
          <h2 className="dashPanel__title">{title}</h2>
          {hint ? <p className="dashPanel__hint">{hint}</p> : null}
        </header>
      ) : null}
      <div className="dashPanel__body">{children}</div>
    </section>
  );
}

export function DashboardEmpty({ icon, title, children }) {
  return (
    <div className="dashEmpty">
      {icon ? <div className="dashEmpty__icon" aria-hidden>{icon}</div> : null}
      {title ? <p className="dashEmpty__title">{title}</p> : null}
      {children ? <p className="dashEmpty__text">{children}</p> : null}
    </div>
  );
}

export function DashboardQueueCard({
  title,
  meta = [],
  badge,
  badgeVariant = "pending",
  detail,
  footer,
  children,
}) {
  return (
    <article className="dashQueueCard">
      <div className="dashQueueCard__head">
        <div className="dashQueueCard__main">
          <h3 className="dashQueueCard__title">{title}</h3>
          {meta.map((line) => (
            <p key={line} className="dashQueueCard__meta">
              {line}
            </p>
          ))}
        </div>
        {badge ? (
          <span className={`dashBadge dashBadge--${badgeVariant}`}>{badge}</span>
        ) : null}
      </div>
      {detail ? <p className="dashQueueCard__detail">{detail}</p> : null}
      {children}
      {footer ? <div className="dashQueueCard__foot">{footer}</div> : null}
    </article>
  );
}

export function DashboardInboxItem({ title, body, time, unread, onRead }) {
  return (
    <article className={`dashInboxItem${unread ? " dashInboxItem--unread" : ""}`}>
      <div className="dashInboxItem__dot" aria-hidden />
      <div className="dashInboxItem__content">
        <h3 className="dashInboxItem__title">{title}</h3>
        <p className="dashInboxItem__body">{body}</p>
        {time ? <time className="dashInboxItem__time">{time}</time> : null}
      </div>
      {unread && onRead ? (
        <DashButton type="button" variant="ghost" size="sm" onClick={onRead}>
          סימון כנקרא
        </DashButton>
      ) : null}
    </article>
  );
}

export function SeminaryManageCard({
  name,
  location,
  about,
  badges,
  actions,
}) {
  return (
    <article className="dashSemCard">
      <div className="dashSemCard__main">
        <h3 className="dashSemCard__title">{name}</h3>
        {location ? <p className="dashSemCard__loc">{location}</p> : null}
        {about ? <p className="dashSemCard__about">{about}</p> : null}
        {badges?.length ? (
          <div className="dashSemCard__badges">{badges}</div>
        ) : null}
      </div>
      {actions ? <div className="dashSemCard__actions">{actions}</div> : null}
    </article>
  );
}
