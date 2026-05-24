/**
 * כתובות הלקוח (React) — CORS וקישורים במייל (איפוס סיסמה).
 *
 * ב-Render (שרת):
 *   CLIENT_URL=https://batmelechclientstatic.onrender.com
 *   CORS_ORIGINS=http://localhost:3000,https://batmelechclientstatic.onrender.com
 *
 * אם CORS_ORIGINS לא מוגדר — משתמשים רק ב-CLIENT_URL (+ localhost בפיתוח).
 */

function parseOriginList(raw) {
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

function getAllowedOrigins() {
  const explicit = parseOriginList(process.env.CORS_ORIGINS);
  const primary = parseOriginList(process.env.CLIENT_URL);
  const merged = [...new Set([...explicit, ...primary])];

  if (merged.length > 0) return merged;

  return ["http://localhost:3000"];
}

/** כתובת האתר לקישורים במייל — לא localhost אם יש כתובת פרודקשן */
function getClientBaseUrl() {
  const origins = getAllowedOrigins();
  const production = origins.find(
    (o) => !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(o)
  );
  return production || origins[0] || "http://localhost:3000";
}

function corsOriginCallback(origin, callback) {
  const allowed = getAllowedOrigins();
  if (!origin || allowed.includes(origin.replace(/\/+$/, ""))) {
    callback(null, true);
    return;
  }
  callback(new Error(`CORS blocked for origin: ${origin}`));
}

module.exports = {
  getAllowedOrigins,
  getClientBaseUrl,
  corsOriginCallback,
};
