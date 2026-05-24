/**
 * יצירת / עדכון משתמשת מנהלת ראשית (הרצה חד-פעמית).
 * שימוש: node scripts/seed-manager.js
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { connectDB } = require("../config/db");
const User = require("../models/UsersModel");

const ADMIN = {
  firstName: "ליטל",
  lastName: "שמנוב",
  email: "lital122105@gmail.com",
  password: "211205",
  status: "manager",
};

async function main() {
  await connectDB({ failFast: true });

  const emailNorm = ADMIN.email.trim().toLowerCase();
  const existing = await User.findOne({
    $expr: { $eq: [{ $toLower: "$email" }, emailNorm] },
  }).select("+password");

  if (existing) {
    existing.firstName = ADMIN.firstName;
    existing.lastName = ADMIN.lastName;
    existing.status = "manager";
    existing.accountStatus = "approved";
    existing.password = ADMIN.password;
    await existing.save();
    console.log("✅ עודכנה משתמשת מנהלת קיימת:", emailNorm);
  } else {
    const lastUser = await User.findOne({}, { userCode: 1 })
      .sort({ userCode: -1 })
      .lean();
    const userCode = (lastUser?.userCode ?? 0) + 1;

    await User.create({
      userCode,
      firstName: ADMIN.firstName,
      lastName: ADMIN.lastName,
      email: emailNorm,
      password: ADMIN.password,
      status: ADMIN.status,
      accountStatus: "approved",
    });
    console.log("✅ נוצרה משתמשת מנהלת:", emailNorm);
  }

  const countManagers = await User.countDocuments({ status: "manager" });
  console.log(`ℹ️  סה"כ מנהלים במערכת: ${countManagers}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ seed-manager נכשל:", err?.message ?? err);
  process.exit(1);
});
