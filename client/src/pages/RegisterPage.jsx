import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { usersService } from "../services";
import { useAuth } from "../auth/AuthContext";
import Avatar from "../components/Avatar/Avatar";
import AuthLayout from "../components/Auth/AuthLayout";
import { normalizeProfileImageUrl } from "../utils/assetUrl";
import { canLoadImageUrl } from "../utils/imageUrl";
import "./AuthPages.css";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [status, setStatus] = useState("student");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [profileFile, setProfileFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState("");
  const [urlLoadStatus, setUrlLoadStatus] = useState("idle");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [accountExists, setAccountExists] = useState(false);

  useEffect(() => {
    if (!profileFile) {
      setFilePreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(profileFile);
    setFilePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [profileFile]);

  const normalizedUrl = useMemo(
    () => normalizeProfileImageUrl(profileImage),
    [profileImage]
  );

  useEffect(() => {
    if (profileFile || !normalizedUrl) {
      setUrlLoadStatus("idle");
      return undefined;
    }

    let cancelled = false;
    setUrlLoadStatus("checking");

    canLoadImageUrl(normalizedUrl).then((ok) => {
      if (!cancelled) setUrlLoadStatus(ok ? "ok" : "fail");
    });

    return () => {
      cancelled = true;
    };
  }, [normalizedUrl, profileFile]);

  const previewUser = useMemo(() => {
    const pi = filePreviewUrl || normalizedUrl;
    return { firstName, lastName, email, profileImage: pi || undefined };
  }, [firstName, lastName, email, filePreviewUrl, normalizedUrl]);

  function validateBeforeSubmit(fn, ln, em, pw, digits) {
    if (fn.length < 2) return "שם פרטי: נא למלא לפחות שני תווים.";
    if (ln.length < 2) return "שם משפחה: נא למלא לפחות שני תווים.";
    if (!/^\S+@\S+\.\S+$/.test(em)) return "נא להזין כתובת מייל תקינה.";
    if (!pw || pw.length < 6) return "סיסמה: נא להזין לפחות 6 תווים.";
    if (digits.length > 0 && (digits.length < 9 || digits.length > 10)) {
      return "טלפון: הזיני 9–10 ספרות בלבד, או השאירי את השדה ריק.";
    }
    return null;
  }

  function onProfileFileChange(e) {
    const file = e.target.files?.[0] ?? null;
    setProfileFile(file);
    if (file) setProfileImage("");
  }

  function onProfileUrlChange(e) {
    setProfileImage(e.target.value);
    if (e.target.value.trim()) setProfileFile(null);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setAccountExists(false);
    setLoading(true);

    try {
      const fn = firstName.trim();
      const ln = lastName.trim();
      const em = email.trim().toLowerCase();
      const digits = phone.replace(/\D/g, "");

      const localErr = validateBeforeSubmit(fn, ln, em, password, digits);
      if (localErr) {
        setError(localErr);
        setLoading(false);
        return;
      }

      if (!profileFile && normalizedUrl) {
        if (urlLoadStatus === "checking") {
          setError("בודקים את קישור התמונה — נסי שוב בעוד רגע.");
          setLoading(false);
          return;
        }
        if (urlLoadStatus === "fail") {
          setError(
            "לא הצלחנו לטעון את התמונה מהקישור. העלי קובץ מהמחשב, או הדביקי קישור ישיר לקובץ תמונה. קישורי Google Drive רגילים בדרך כלל לא עובדים."
          );
          setLoading(false);
          return;
        }
      }

      const body = {
        firstName: fn,
        lastName: ln,
        status,
        email: em,
        password,
      };

      if (digits.length >= 9 && digits.length <= 10) {
        body.phone = digits;
      }

      if (!profileFile && normalizedUrl && urlLoadStatus === "ok") {
        body.profileImage = normalizedUrl;
      }

      const created = await usersService.create(body);
      let safeUser = created ?? {};
      if (profileFile && safeUser._id) {
        safeUser = await usersService.uploadProfileImage(safeUser._id, profileFile);
      }

      const { password: _pw, ...userWithoutPassword } = safeUser;
      login(userWithoutPassword);
      if (
        userWithoutPassword.status === "lecturer" &&
        userWithoutPassword.accountStatus === "pending"
      ) {
        navigate("/pending-approval", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      if (err?.status === 409) {
        setAccountExists(true);
        setError(null);
        return;
      }
      const b = err?.body;
      let msg =
        (typeof b === "object" && b?.message) ||
        (typeof b === "string" ? b : null) ||
        err?.message ||
        "שגיאה בהרשמה";
      if (String(msg).includes("Failed to fetch") || String(msg).includes("NetworkError")) {
        msg =
          "לא הצלחנו להתחבר לשרת. ודאי שהשרת רץ (למשל פורט 5000) וש־REACT_APP_API_BASE_URL נכון.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const previewHint =
    profileFile || normalizedUrl
      ? urlLoadStatus === "checking"
        ? "בודקים את הקישור…"
        : urlLoadStatus === "fail"
          ? "הקישור לא נטען — נסי קובץ מהמחשב."
          : urlLoadStatus === "ok"
            ? "התמונה נטענה בהצלחה."
            : "תצוגה מקדימה"
      : "בלי תמונה תופיע האות הראשונה של השם.";

  const hintClass =
    urlLoadStatus === "ok"
      ? "profileHint profileHint--ok"
      : urlLoadStatus === "fail"
        ? "profileHint profileHint--fail"
        : urlLoadStatus === "checking"
          ? "profileHint profileHint--pending"
          : "profileHint";

  return (
    <AuthLayout
      wide
      title="יצירת חשבון"
      subtitle="מלאי את הפרטים — ההרשמה לוקחת דקה"
      brandLead="הצטרפי לקהילה — מצאי מדרשייה, שאלי שאלות וגשי לחומרי לימוד"
      brandPoints={["הרשמה למדרשיות", "פרופיל אישי", "שאלות למורות"]}
      footerText="כבר יש לך חשבון?"
      footerLinkTo="/login"
      footerLinkLabel="התחברות"
    >
      {accountExists ? (
        <div className="alert alert--warn" role="status">
          <p>
            <strong>החשבון עם המייל הזה כבר קיים במערכת.</strong>
          </p>
          <p>
            <Link className="link" to="/login">
              התחברי לחשבון הקיים
            </Link>
            {" "}
            או הרשמי עם מייל אחר.
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="alert alert--error" role="alert">
          <p>{String(error)}</p>
        </div>
      ) : null}

      <form className="form" onSubmit={onSubmit}>
        <fieldset className="authSection">
          <legend className="authSection__legend">פרטים אישיים</legend>

          <div className="form__row">
            <label className="label" htmlFor="reg-first">
              שם פרטי
            </label>
            <input
              id="reg-first"
              className="input2"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              minLength={2}
              autoComplete="given-name"
            />
          </div>

          <div className="form__row">
            <label className="label" htmlFor="reg-last">
              שם משפחה
            </label>
            <input
              id="reg-last"
              className="input2"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              minLength={2}
              autoComplete="family-name"
            />
          </div>

          <div className="form__row">
            <label className="label" htmlFor="reg-status">
              סטטוס
            </label>
            <div className="form__rowValue">
              <select
                id="reg-status"
                className="input2"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="student">תלמידה</option>
                <option value="lecturer">רב / מרצה (דורש אישור מנהלת)</option>
              </select>
              {status === "lecturer" ? (
                <p className="muted2">
                  לאחר ההרשמה הבקשה תועבר למנהלת האתר. תקבלי מייל כשהחשבון יאושר.
                </p>
              ) : null}
            </div>
          </div>

          <div className="form__row">
            <label className="label" htmlFor="reg-phone">
              טלפון <span className="muted2">(אופציונלי)</span>
            </label>
            <input
              id="reg-phone"
              className="input2"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05XXXXXXXX"
              autoComplete="tel"
            />
          </div>
        </fieldset>

        <fieldset className="authSection">
          <legend className="authSection__legend">חשבון</legend>

          <div className="form__row">
            <label className="label" htmlFor="reg-email">
              מייל
            </label>
            <input
              id="reg-email"
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
            <label className="label" htmlFor="reg-password">
              סיסמה
            </label>
            <input
              id="reg-password"
              className="input2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              minLength={6}
              placeholder="לפחות 6 תווים"
              autoComplete="new-password"
              required
            />
          </div>
        </fieldset>

        <fieldset className="authSection">
          <legend className="authSection__legend">תמונת פרופיל (אופציונלי)</legend>

          <div className="profileBlock">
            <div className="profileBlock__avatar">
              <Avatar user={previewUser} size={56} />
            </div>
            <div className="profileBlock__fields">
              <label className="filePick">
                {profileFile ? profileFile.name : "בחירת תמונה מהמחשב"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={onProfileFileChange}
                />
              </label>

              <div className="form__row">
                <label className="label" htmlFor="reg-photo-url">
                  קישור לתמונה
                </label>
                <div className="form__rowValue">
                  <input
                    id="reg-photo-url"
                    className="input2"
                    value={profileImage}
                    onChange={onProfileUrlChange}
                    placeholder="https://example.com/photo.jpg"
                    disabled={Boolean(profileFile)}
                  />
                </div>
              </div>

              <p
                className={
                  profileFile || normalizedUrl ? hintClass : "profileHint"
                }
              >
                {previewHint}
              </p>
            </div>
          </div>
        </fieldset>

        <div className="actions">
          <button type="submit" className="siteBtn siteBtn--primary" disabled={loading}>
            {loading ? "יוצרת חשבון…" : "הרשמה"}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
