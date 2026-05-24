const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadsDir = path.join(__dirname, '..', 'uploads');

function ensureUploadsDir() {
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
}

ensureUploadsDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeExt = path.extname(file.originalname || '').slice(0, 16);
    const base = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${base}${safeExt}`);
  },
});

/** Accept common documents + images + archives + audio/video */
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

module.exports = {
  upload,
  uploadsDir,
};
