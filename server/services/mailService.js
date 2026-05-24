const nodemailer = require("nodemailer");

let transporter;
let smtpVerified = false;

const PLACEHOLDER_HOSTS = ["smtp.example.com", "example.com"];
const PLACEHOLDER_VALUES = [
  "your-smtp-user",
  "your-smtp-password",
  "your-email",
  "your@gmail.com",
  "your-16-char",
  "put_your_gmail",
  "put_app_password",
  "noreply@example.com",
];

function normalizeSmtpPass(pass) {
  /* סיסמת אפליקציה של Gmail לפעמים מגיעה עם רווחים */
  return String(pass ?? "").replace(/\s+/g, "").trim();
}

function isPlaceholder(value) {
  const v = String(value ?? "").trim().toLowerCase();
  if (!v) return true;
  return PLACEHOLDER_VALUES.some((p) => v.includes(p));
}

function getSmtpMissingFields() {
  const missing = [];
  const host = String(process.env.SMTP_HOST ?? "").trim();
  if (!host || PLACEHOLDER_HOSTS.some((h) => host.toLowerCase().includes(h))) {
    missing.push("SMTP_HOST");
  }
  const user = String(process.env.SMTP_USER ?? "").trim();
  if (!user || isPlaceholder(user)) missing.push("SMTP_USER");
  const pass = normalizeSmtpPass(process.env.SMTP_PASS);
  if (!pass || isPlaceholder(pass)) missing.push("SMTP_PASS");
  return missing;
}

function isSmtpConfigured() {
  return getSmtpMissingFields().length === 0;
}

function getSmtpConfig() {
  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure =
    process.env.SMTP_SECURE === "true" ||
    (port === 465 && process.env.SMTP_SECURE !== "false");

  return {
    host: String(process.env.SMTP_HOST).trim(),
    port,
    secure,
    auth: {
      user: String(process.env.SMTP_USER).trim(),
      pass: normalizeSmtpPass(process.env.SMTP_PASS),
    },
  };
}

function getTransporter() {
  if (!isSmtpConfigured()) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport(getSmtpConfig());
    smtpVerified = false;
  }

  return transporter;
}

function mailFrom() {
  const smtpUser = String(process.env.SMTP_USER ?? "").trim();
  /* Gmail דורש שכתובת השולח תתאים לחשבון המאומת */
  const address =
    (isPlaceholder(process.env.MAIL_FROM) ? "" : String(process.env.MAIL_FROM ?? "").trim()) ||
    smtpUser ||
    "noreply@midrasha.local";
  const name = process.env.MAIL_FROM_NAME ?? "מדרשיות";
  return `"${name}" <${address}>`;
}

function logEmailPreview({ to, subject, text, resetUrl }) {
  console.log("\n========== מייל לא נשלח (SMTP לא מוגדר) ==========");
  console.log("נמען:", to);
  console.log("נושא:", subject);
  if (resetUrl) {
    console.log("קישור איפוס סיסמה:");
    console.log(resetUrl);
  } else {
    console.log(text);
  }
  console.log("הגדירי קובץ server/.env לפי server/.env.example");
  console.log("==================================================\n");
}

/**
 * בדיקת חיבור SMTP — קוראים בהפעלת השרת
 */
async function verifySmtpConnection() {
  if (!isSmtpConfigured()) {
    return { ok: false, reason: "not_configured" };
  }

  try {
    const transport = getTransporter();
    await transport.verify();
    smtpVerified = true;
    console.log(`[mail] SMTP מחובר (${process.env.SMTP_HOST})`);
    return { ok: true };
  } catch (err) {
    smtpVerified = false;
    transporter = undefined;
    console.error("[mail] SMTP verify failed:", err?.message ?? err);
    return { ok: false, reason: "verify_failed", error: err?.message };
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendMail({ to, subject, text, html, resetUrl }) {
  const transport = getTransporter();

  if (!transport) {
    logEmailPreview({ to, subject, text, resetUrl });
    return { ok: true, preview: true };
  }

  try {
    const info = await transport.sendMail({
      from: mailFrom(),
      to,
      subject,
      text,
      html,
    });
    console.log(`[mail] נשלח ל-${to} (messageId: ${info.messageId})`);
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error("[mail] send failed:", err?.message ?? err);
    throw err;
  }
}

async function sendJoinInitialApprovalEmail({
  to,
  studentName,
  seminaryName,
  seminaryPhone,
  seminaryEmail,
}) {
  const subject = `בקשתך להצטרפות למדרשייה ${seminaryName} התקבלה`;
  const contactLines = [];
  if (seminaryPhone) contactLines.push(`טלפון: ${seminaryPhone}`);
  if (seminaryEmail) contactLines.push(`דוא״ל: ${seminaryEmail}`);
  const contactBlock = contactLines.length
    ? `\n\nפרטי קשר של המדרשייה:\n${contactLines.join("\n")}`
    : "";

  const text = `שלום ${studentName},

בקשתך להצטרף למדרשייה "${seminaryName}" התקבלה בהצלחה.

המדרשייה תיצור איתך קשר בקרוב להמשך תהליך ההצטרפות.${contactBlock}

בברכה,
צוות מדרשיות`;

  const html = `<p>שלום <strong>${escapeHtml(studentName)}</strong>,</p>
<p>בקשתך להצטרף למדרשייה <strong>${escapeHtml(seminaryName)}</strong> התקבלה בהצלחה.</p>
<p>המדרשייה תיצור איתך קשר בקרוב להמשך תהליך ההצטרפות.</p>
${
  contactLines.length
    ? `<p><strong>פרטי קשר של המדרשייה:</strong><br>${contactLines
        .map((l) => escapeHtml(l))
        .join("<br>")}</p>`
    : ""
}
<p>בברכה,<br>צוות מדרשיות</p>`;

  return sendMail({ to, subject, text, html });
}

async function sendPasswordResetEmail({ to, userName, resetUrl }) {
  const subject = "איפוס סיסמה — מדרשיות";
  const text = `שלום ${userName},

קיבלנו בקשה לאיפוס הסיסמה שלך במערכת מדרשיות.

לחצי על הקישור הבא כדי לבחור סיסמה חדשה (תוקף מוגבל):
${resetUrl}

אם לא ביקשת לאפס את הסיסמה — התעלמי ממייל זה.

בברכה,
צוות מדרשיות`;

  const html = `<p>שלום <strong>${escapeHtml(userName)}</strong>,</p>
<p>קיבלנו בקשה לאיפוס הסיסמה שלך במערכת מדרשיות.</p>
<p><a href="${escapeHtml(resetUrl)}">לחצי כאן לבחירת סיסמה חדשה</a></p>
<p>אם הכפתור לא עובד, העתיקי את הקישור לדפדפן:<br><span dir="ltr">${escapeHtml(resetUrl)}</span></p>
<p>אם לא ביקשת לאפוס את הסיסמה — התעלמי ממייל זה.</p>
<p>בברכה,<br>צוות מדרשיות</p>`;

  return sendMail({ to, subject, text, html, resetUrl });
}

async function sendLecturerApprovedEmail({ to, userName }) {
  const subject = "הבקשה שלך להצטרף לאתר BatMelech אושרה";
  const text = `שלום ${userName},

שמחים לבשר שהבקשה שלך להירשם לאתר BatMelech כרב/מרצה אושרה.

כעת תוכלי להתחבר ולנהל מדרשיות, לענות לשאלות תלמידות ועוד.

בברכה,
צוות BatMelech`;

  const html = `<p>שלום <strong>${escapeHtml(userName)}</strong>,</p>
<p>שמחים לבשר שהבקשה שלך להירשם לאתר <strong>BatMelech</strong> כרב/מרצה <strong>אושרה</strong>.</p>
<p>כעת תוכלי להתחבר ולנהל מדרשיות, לענות לשאלות תלמידות ועוד.</p>
<p>בברכה,<br>צוות BatMelech</p>`;

  return sendMail({ to, subject, text, html });
}

async function sendLecturerRejectedEmail({ to, userName }) {
  const subject = "עדכון לגבי בקשת ההרשמה שלך — BatMelech";
  const text = `שלום ${userName},

לאחר בדיקה, לא ניתן לאשר כרגע את בקשתך להצטרף לאתר BatMelech כרב/מרצה.

לשאלות נוספות ניתן לפנות למנהלת האתר.

בברכה,
צוות BatMelech`;

  const html = `<p>שלום <strong>${escapeHtml(userName)}</strong>,</p>
<p>לאחר בדיקה, לא ניתן לאשר כרגע את בקשתך להצטרף לאתר BatMelech כרב/מרצה.</p>
<p>לשאלות נוספות ניתן לפנות למנהלת האתר.</p>
<p>בברכה,<br>צוות BatMelech</p>`;

  return sendMail({ to, subject, text, html });
}

async function sendSeminaryApprovedEmail({ to, userName, seminaryName }) {
  const subject = `המדרשייה "${seminaryName}" אושרה לפרסום`;
  const text = `שלום ${userName},

המדרשייה "${seminaryName}" ששלחת לאישור אושרה על ידי מנהלת האתר.

היכנסי לעמוד «ניהול מדרשיות» ולחצי «פרסם באתר» כדי להציג את המדרשייה לתלמידות.

בברכה,
צוות BatMelech`;

  const html = `<p>שלום <strong>${escapeHtml(userName)}</strong>,</p>
<p>המדרשייה <strong>${escapeHtml(seminaryName)}</strong> ששלחת לאישור <strong>אושרה</strong>.</p>
<p>היכנסי לעמוד «ניהול מדרשיות» ולחצי «פרסם באתר» כדי להציג אותה לתלמידות.</p>
<p>בברכה,<br>צוות BatMelech</p>`;

  return sendMail({ to, subject, text, html });
}

async function sendSeminaryRejectedEmail({ to, userName, seminaryName }) {
  const subject = `עדכון לגבי המדרשייה "${seminaryName}"`;
  const text = `שלום ${userName},

לאחר בדיקה, לא ניתן לאשר כרגע את המדרשייה "${seminaryName}" לפרסום באתר.

פרטים נוספים מופיעים בהודעה בעמוד ניהול המדרשיות שלך.

בברכה,
צוות BatMelech`;

  const html = `<p>שלום <strong>${escapeHtml(userName)}</strong>,</p>
<p>לאחר בדיקה, לא ניתן לאשר כרגע את המדרשייה <strong>${escapeHtml(seminaryName)}</strong> לפרסום באתר.</p>
<p>פרטים נוספים מופיעים בהודעה בעמוד «ניהול מדרשיות».</p>
<p>בברכה,<br>צוות BatMelech</p>`;

  return sendMail({ to, subject, text, html });
}

module.exports = {
  isSmtpConfigured,
  getSmtpMissingFields,
  verifySmtpConnection,
  sendJoinInitialApprovalEmail,
  sendPasswordResetEmail,
  sendLecturerApprovedEmail,
  sendLecturerRejectedEmail,
  sendSeminaryApprovedEmail,
  sendSeminaryRejectedEmail,
  sendMail,
};
