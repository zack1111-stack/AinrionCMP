const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserById,
  updateAvatar // ✅ Avatar controller
} = require('../controllers/userController');

// ✅ Multer setup for avatar upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/avatars');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${req.params.id}${ext}`);
  }
});

// ✅ Load from middleware file (Multer config)
const upload = require('../middleware/uploadAvatar');

// ✅ Existing routes
router.get('/', getAllUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.get('/:id', getUserById);

// ✅ New route for avatar upload
router.put('/:id/avatar', upload.single('avatar'), updateAvatar);

module.exports = router;
