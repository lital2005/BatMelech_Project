const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const SCRYPT_SALT = "midrasha-app-v1";

let devKeyWarned = false;

/**
 * מפתח AES-256 נגזר מ-ENCRYPTION_KEY ב-.env
 * בפיתוח: אם חסר — משתמש במפתח זמני (לא לפרודקשן!)
 */
function getEncryptionKey() {
  const secret = process.env.ENCRYPTION_KEY;

  if (!secret || !String(secret).trim()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ENCRYPTION_KEY חייב להיות מוגדר בסביבת production");
    }
    if (!devKeyWarned) {
      console.warn(
        "[encryption] ENCRYPTION_KEY לא הוגדר — משתמש במפתח פיתוח זמני. הגדירי מפתח ב-.env לפני עלייה לאוויר."
      );
      devKeyWarned = true;
    }
    return crypto.scryptSync("dev-only-insecure-key", SCRYPT_SALT, KEY_LENGTH);
  }

  return crypto.scryptSync(String(secret).trim(), SCRYPT_SALT, KEY_LENGTH);
}

/**
 * טוקן אקראי (hex) — קישורי איפוס סיסמה וכו׳
 */
function generateSecureToken(byteLength = 32) {
  return crypto.randomBytes(byteLength).toString("hex");
}

/**
 * גיבוב חד-כיווני (SHA-256) — שמירת טוקנים במסד בלי לשמור את הערך המקורי
 */
function hashValue(value) {
  return crypto.createHash("sha256").update(String(value), "utf8").digest("hex");
}

/**
 * השוואה בטוחה של ערכים מגובבים (hex)
 */
function secureCompareHex(a, b) {
  if (!a || !b) return false;
  try {
    const bufA = Buffer.from(String(a), "hex");
    const bufB = Buffer.from(String(b), "hex");
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * הצפנת מחרוזת — מחזיר Base64 (IV + AuthTag + CipherText)
 */
function encrypt(plaintext) {
  const text = String(plaintext ?? "");
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

/**
 * פענוח מחרוזת שהוצפנה ב-encrypt()
 */
function decrypt(encodedPayload) {
  if (!encodedPayload) {
    throw new Error("נתונים מוצפנים חסרים");
  }

  const buffer = Buffer.from(String(encodedPayload), "base64");
  const minLength = IV_LENGTH + AUTH_TAG_LENGTH + 1;

  if (buffer.length < minLength) {
    throw new Error("פורמט הצפנה לא תקין");
  }

  const iv = buffer.subarray(0, IV_LENGTH);
  const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const data = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}

/**
 * יצירת מפתח הצפנה חדש (להדבקה ב-.env) — להרצה חד-פעמית:
 * node -e "console.log(require('./utils/encryption').generateEncryptionKey())"
 */
function generateEncryptionKey() {
  return crypto.randomBytes(KEY_LENGTH).toString("base64");
}

module.exports = {
  generateSecureToken,
  hashValue,
  secureCompareHex,
  encrypt,
  decrypt,
  generateEncryptionKey,
};
