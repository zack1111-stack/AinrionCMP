// backend/middleware/uploadAvatar.js
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Ensure upload folder exists
const avatarDir = path.join(__dirname, '../uploads/avatars');
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${req.params.id || Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

module.exports = upload;
