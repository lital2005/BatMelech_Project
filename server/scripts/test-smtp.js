/**
 * בדיקת שליחת מייל — מהתיקייה server:
 *   node scripts/test-smtp.js your-email@gmail.com
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { isSmtpConfigured, verifySmtpConnection, sendMail } = require("../services/mailService");

async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error("שימוש: node scripts/test-smtp.js <כתובת-מייל>");
    process.exit(1);
  }

  if (!isSmtpConfigured()) {
    console.error("SMTP לא מוגדר. צרי server/.env עם SMTP_HOST, SMTP_USER, SMTP_PASS");
    process.exit(1);
  }

  const verify = await verifySmtpConnection();
  if (!verify.ok) {
    console.error("חיבור SMTP נכשל:", verify.error ?? verify.reason);
    process.exit(1);
  }

  await sendMail({
    to,
    subject: "בדיקת מייל — מדרשיות",
    text: "אם קיבלת הודעה זו, שליחת המיילים מהשרת עובדת.",
    html: "<p>אם קיבלת הודעה זו, שליחת המיילים מהשרת עובדת.</p>",
  });

  console.log("נשלח בהצלחה ל-", to);
}

main().catch((err) => {
  console.error(err?.message ?? err);
  process.exit(1);
});
