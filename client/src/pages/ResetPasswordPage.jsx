import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authService } from "../services";
import AuthLayout from "../components/Auth/AuthLayout";
import "./AuthPages.css";

function formatNetworkError(msg) {
  if (String(msg).includes("Failed to fetch") || String(msg).includes("NetworkError")) {
    return "לא הצלחנו להתחבר לשרת. ודאי שהשרת רץ (למשל פורט 5000).";
  }
  return msg;
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setErrorMsg(null);

    if (!token.trim()) {
      setErrorMsg("קישור האיפוס אינו תקין. בקשי קישור חדש דרך «שכחתי סיסמה».");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("סיסמה חדשה: לפחות 6 תווים.");
      return;
    }
    if (password !== passwordConfirm) {
      setErrorMsg("הסיסמאות אינן תואמות.");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.resetPassword({ token: token.trim(), password });
      navigate("/login", {
        replace: true,
        state: {
          resetSuccess:
            res?.message ?? "הסיסמה עודכנה בהצלחה. אפשר להתחבר עם הסיסמה החדשה.",
        },
      });
    } catch (err) {
      const msg =
        err?.body?.message ?? formatNetworkError(err?.message ?? "שגיאה בעדכון הסיסמה");
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!token.trim()) {
    return (
      <AuthLayout
        title="קישור לא תקין"
        subtitle="הקישור לאיפוס הסיסמה חסר או פג תוקף"
        brandLead="בקשי קישור חדש ונשלח אליך מייל עם קישור מעודכן"
        footerText="רוצה להתחבר?"
        footerLinkTo="/login"
        footerLinkLabel="לעמוד ההתחברות"
      >
        <div className="alert alert--error" role="alert">
          <p>קישור האיפוס אינו תקין או חסר.</p>
        </div>
        <p className="muted2" style={{ textAlign: "center", marginTop: 16 }}>
          <Link className="link" to="/forgot-password">
            בקשי קישור חדש לאיפוס סיסמה
          </Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="סיסמה חדשה"
      subtitle="בחרי סיסמה חזקה — לפחות 6 תווים"
      brandLead="לאחר השמירה תוכלי להתחבר עם הסיסמה החדשה"
      footerText="זוכרת את הסיסמה?"
      footerLinkTo="/login"
      footerLinkLabel="התחברות"
    >
      {errorMsg ? (
        <div className="alert alert--error" role="alert">
          <p>{errorMsg}</p>
          {errorMsg.includes("פג תוקף") || errorMsg.includes("כבר נוצל") ? (
            <p>
              <Link className="link" to="/forgot-password">
                בקשי קישור חדש
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}

      <form className="form" onSubmit={onSubmit}>
        <div className="form__row">
          <label className="label" htmlFor="reset-password">
            סיסמה חדשה
          </label>
          <input
            id="reset-password"
            className="input2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="לפחות 6 תווים"
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>

        <div className="form__row">
          <label className="label" htmlFor="reset-password-confirm">
            אימות סיסמה
          </label>
          <input
            id="reset-password-confirm"
            className="input2"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            type="password"
            placeholder="הקלידי שוב את הסיסמה"
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>

        <div className="actions actions--stack">
          <button type="submit" className="siteBtn siteBtn--primary" disabled={loading}>
            {loading ? "שומרת…" : "שמירת סיסמה חדשה"}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
