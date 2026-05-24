import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authService } from "../services";
import { useAuth } from "../auth/AuthContext";
import AuthLayout from "../components/Auth/AuthLayout";
import "./AuthPages.css";

function formatNetworkError(msg) {
  if (String(msg).includes("Failed to fetch") || String(msg).includes("NetworkError")) {
    return "לא הצלחנו להתחבר לשרת. ודאי שהשרת רץ (למשל פורט 5000).";
  }
  return msg;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const resetSuccess = location.state?.resetSuccess;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [suggestRegister, setSuggestRegister] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErrorMsg(null);
    setSuggestRegister(false);
    setLoading(true);
    try {
      const em = email.trim().toLowerCase();
      if (!em) {
        setErrorMsg("נא למלא כתובת מייל.");
        setLoading(false);
        return;
      }
      if (!password) {
        setErrorMsg("נא למלא סיסמה.");
        setLoading(false);
        return;
      }

      const user = await authService.login({ email: em, password });
      login(user);
      if (user?.status === "lecturer" && user?.accountStatus === "pending") {
        navigate("/pending-approval", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      const code = err?.body?.code;
      const msg =
        err?.body?.message ??
        formatNetworkError(err?.message ?? "שגיאה בהתחברות");
      setErrorMsg(msg);
      setSuggestRegister(code === "USER_NOT_FOUND");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="ברוכה השבה"
      subtitle="התחברי עם המייל והסיסמה שלך כדי להמשיך ללמוד"
      brandLead="בת מלך · בית למדרשיות — לימוד, שאלות ותשובות במקום אחד"
      brandPoints={["מדרשיות", "שאלות ותשובות", "חומרי לימוד"]}
      footerText="עדיין לא נרשמת?"
      footerLinkTo="/register"
      footerLinkLabel="צרי חשבון חינם"
    >
      {resetSuccess ? (
        <div className="alert alert--success" role="status">
          <p>{resetSuccess}</p>
        </div>
      ) : null}

      {errorMsg ? (
        <div className="alert alert--error" role="alert">
          <p>{errorMsg}</p>
          {suggestRegister ? (
            <p>
              <Link className="link" to="/register">
                אין לך חשבון? מעבר לעמוד הרשמה
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}

      <form className="form" onSubmit={onSubmit}>
        <div className="form__row">
          <label className="label" htmlFor="login-email">
            מייל
          </label>
          <input
            id="login-email"
            className="input2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="name@example.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="form__row">
          <label className="label" htmlFor="login-password">
            סיסמה
          </label>
          <div className="form__rowValue">
            <input
              id="login-password"
              className="input2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
            <div className="form__rowMeta">
              <Link className="link link--sm" to="/forgot-password">
                שכחתי סיסמה
              </Link>
            </div>
          </div>
        </div>

        <div className="actions">
          <button type="submit" className="siteBtn siteBtn--primary" disabled={loading}>
            {loading ? "מתחברת…" : "התחברות"}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
