const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { uploadsDir } = require("./upload");

const profilesDir = path.join(uploadsDir, "profiles");

function ensureProfilesDir() {
  if (!fs.existsSync(profilesDir)) {
    fs.mkdirSync(profilesDir, { recursive: true });
  }
}

ensureProfilesDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureProfilesDir();
    cb(null, profilesDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    const safeExt = [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext) ? ext : ".jpg";
    cb(null, `profile-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

const uploadProfile = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype && String(file.mimetype).startsWith("image/");
    if (!ok) {
      return cb(new Error("רק קובצי תמונה מותרים"));
    }
    cb(null, true);
  },
});

module.exports = {
  uploadProfile,
  profilesDir,
};
