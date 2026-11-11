const router = require('express').Router();
const multer = require('multer');
const { verificarToken } = require('../middlewares/auth');
const { subirImagen } = require('../controllers/upload.controller');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/', verificarToken, upload.single('imagen'), subirImagen);

module.exports = router;
