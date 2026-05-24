/**
 * הגדרת SMTP בקובץ .env — הרצה מתוך server:
 *   node scripts/setup-smtp.js
 */
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const envPath = path.join(__dirname, "..", ".env");

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

function upsertEnvLine(lines, key, value) {
  const re = new RegExp(`^${key}=`);
  const line = `${key}=${value}`;
  const idx = lines.findIndex((l) => re.test(l));
  if (idx >= 0) lines[idx] = line;
  else lines.push(line);
}

async function main() {
  console.log("\n=== הגדרת שליחת מייל (Gmail) ===\n");
  console.log("נדרשת סיסמת אפליקציה (לא סיסמת החשבון):");
  console.log("https://myaccount.google.com/apppasswords\n");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const email = (await ask(rl, "כתובת Gmail (SMTP_USER): ")).trim().toLowerCase();
  const appPass = (await ask(rl, "סיסמת אפליקציה (16 תווים, אפשר עם רווחים): "))
    .replace(/\s+/g, "")
    .trim();

  rl.close();

  if (!email || !email.includes("@")) {
    console.error("כתובת מייל לא תקינה.");
    process.exit(1);
  }
  if (!appPass || appPass.length < 10) {
    console.error("סיסמת אפליקציה קצרה מדי.");
    process.exit(1);
  }

  let lines = [];
  if (fs.existsSync(envPath)) {
    lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  } else {
    lines = fs.readFileSync(path.join(__dirname, "..", ".env.example"), "utf8").split(/\r?\n/);
  }

  upsertEnvLine(lines, "SMTP_HOST", "smtp.gmail.com");
  upsertEnvLine(lines, "SMTP_PORT", "587");
  upsertEnvLine(lines, "SMTP_SECURE", "false");
  upsertEnvLine(lines, "SMTP_USER", email);
  upsertEnvLine(lines, "SMTP_PASS", appPass);
  upsertEnvLine(lines, "MAIL_FROM", email);

  fs.writeFileSync(envPath, lines.join("\n"), "utf8");

  console.log("\n✓ נשמר ב-server/.env");
  console.log("הפעילי מחדש את השרת, ואז:");
  console.log(`  node scripts/test-smtp.js ${email}\n`);
}

main().catch((err) => {
  console.error(err?.message ?? err);
  process.exit(1);
});
