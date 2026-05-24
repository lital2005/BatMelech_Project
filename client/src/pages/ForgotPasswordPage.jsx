import React, { useState } from "react";
import { Link } from "react-router-dom";
import { authService } from "../services";
import AuthLayout from "../components/Auth/AuthLayout";
import "./AuthPages.css";

function formatNetworkError(msg) {
  if (String(msg).includes("Failed to fetch") || String(msg).includes("NetworkError")) {
    return "לא הצלחנו להתחבר לשרת. ודאי שהשרת רץ (למשל פורט 5000).";
  }
  return msg;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [devResetUrl, setDevResetUrl] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setDevResetUrl(null);
    setLoading(true);

    try {
      const em = email.trim().toLowerCase();
      if (!em) {
        setErrorMsg("נא למלא כתובת מייל.");
        setLoading(false);
        return;
      }

      const res = await authService.forgotPassword(em);
      setSuccessMsg(
        res?.message ??
          "אם כתובת המייל רשומה במערכת, נשלח אליך קישור לאיפוס הסיסמה. בדקי גם בתיקיית דואר זבל."
      );
      if (res?.devResetUrl) setDevResetUrl(res.devResetUrl);
      setEmail("");
    } catch (err) {
      const msg =
        err?.body?.message ?? formatNetworkError(err?.message ?? "שגיאה בשליחת הבקשה");
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="שכחתי סיסמה"
      subtitle="נשלח לך קישור לאיפוס הסיסמה לכתובת המייל שאיתה נרשמת"
      brandLead="איפוס סיסמה מאובטח — בכמה צעדים פשוטים"
      footerText="זוכרת את הסיסמה?"
      footerLinkTo="/login"
      footerLinkLabel="חזרה להתחברות"
    >
      {errorMsg ? (
        <div className="alert alert--error" role="alert">
          <p>{errorMsg}</p>
        </div>
      ) : null}

      {successMsg ? (
        <div className="alert alert--success" role="status">
          <p>{successMsg}</p>
          {devResetUrl ? (
            <p className="auth__devLink">
              <a className="link" href={devResetUrl}>
                לחצי כאן לאיפוס סיסמה (קישור ישיר לפיתוח)
              </a>
            </p>
          ) : null}
        </div>
      ) : null}

      {!successMsg ? (
        <form className="form" onSubmit={onSubmit}>
          <div className="form__row">
            <label className="label" htmlFor="forgot-email">
              כתובת מייל
            </label>
            <input
              id="forgot-email"
              className="input2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="name@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="actions actions--stack">
            <button type="submit" className="siteBtn siteBtn--primary" disabled={loading}>
              {loading ? "שולחת…" : "שליחת קישור לאיפוס"}
            </button>
          </div>
        </form>
      ) : (
        <div className="actions actions--stack">
          <Link className="siteBtn siteBtn--primary" to="/login">
            חזרה להתחברות
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}
