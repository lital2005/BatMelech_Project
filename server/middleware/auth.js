const User = require("../models/UsersModel");

function getUserIdFromReq(req) {
  const raw = req.headers["x-user-id"];
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

async function loadUserByHeader(req) {
  const userId = getUserIdFromReq(req);
  if (!userId) return null;
  return User.findById(userId).lean();
}

function requireUserId(req, res, next) {
  const userId = getUserIdFromReq(req);
  if (!userId) {
    return res.status(401).send({ message: "נדרשת התחברות", code: "UNAUTHORIZED" });
  }
  req.userId = userId;
  next();
}

async function requireManager(req, res, next) {
  try {
    const user = await loadUserByHeader(req);
    if (!user) {
      return res.status(401).send({ message: "נדרשת התחברות", code: "UNAUTHORIZED" });
    }
    if (user.status !== "manager") {
      return res.status(403).send({ message: "גישה למנהלת בלבד", code: "FORBIDDEN" });
    }
    req.user = user;
    req.userId = String(user._id);
    next();
  } catch (err) {
    return res.status(500).send({ message: "שגיאת שרת" });
  }
}

module.exports = {
  getUserIdFromReq,
  loadUserByHeader,
  requireUserId,
  requireManager,
};
