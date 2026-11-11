const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const { uploadsDir } = require('../upload');
const { verificarToken } = require('../middlewares/auth');
const { subirImagen } = require('../controllers/upload.controller');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});
const upload = multer({ storage });

router.post('/', verificarToken, upload.single('imagen'), subirImagen);

module.exports = router;
