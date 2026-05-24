import React from "react";
import { Link } from "react-router-dom";
import BatMelechLogo from "../Brand/BatMelechLogo";
import "../../pages/AuthPages.css";

export default function AuthLayout({
  title,
  subtitle,
  wide = false,
  brandLead,
  brandPoints = [],
  footerText,
  footerLinkTo,
  footerLinkLabel,
  children,
}) {
  return (
    <div className={`authPage${wide ? " authPage--wide" : ""}`}>
      <div className="authPage__glow authPage__glow--1" aria-hidden="true" />
      <div className="authPage__glow authPage__glow--2" aria-hidden="true" />

      <div className="authPage__center">
        <div className="authPage__hero">
          <BatMelechLogo variant="hero" className="batLogo--light authPage__logo" />
          {brandLead ? <p className="authPage__tagline">{brandLead}</p> : null}
          {brandPoints.length > 0 ? (
            <ul className="authPage__chips" aria-label="יתרונות">
              {brandPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="authCard">
          <header className="authCard__head">
            <h1 className="authCard__title">{title}</h1>
            {subtitle ? <p className="authCard__subtitle">{subtitle}</p> : null}
          </header>

          <div className="authCard__body">{children}</div>

          {footerText && footerLinkTo ? (
            <footer className="authCard__foot">
              <span className="authCard__footText">{footerText}</span>
              <Link className="authCard__footLink" to={footerLinkTo}>
                {footerLinkLabel}
              </Link>
            </footer>
          ) : null}
        </div>
      </div>
    </div>
  );
}
