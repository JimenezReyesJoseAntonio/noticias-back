const router = require('express').Router();
const { crearUsuario } = require('../controllers/usuarios.controller');
const { verificarToken, soloAdmin } = require('../middlewares/auth');

router.post('/', verificarToken, soloAdmin, crearUsuario);

module.exports = router;
