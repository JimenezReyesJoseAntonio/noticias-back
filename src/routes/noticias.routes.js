const router = require('express').Router();
const { listarNoticias, obtenerNoticia, crearNoticia, actualizarNoticia, eliminarNoticia } = require('../controllers/noticias.controller');
const { verificarToken, verificarAutorOAdmin } = require('../middlewares/auth');

router.get('/', listarNoticias);
router.get('/:id', obtenerNoticia);
router.post('/', verificarToken, crearNoticia);
router.put('/:id', verificarToken, verificarAutorOAdmin, actualizarNoticia);
router.delete('/:id', verificarToken, verificarAutorOAdmin, eliminarNoticia);

module.exports = router;
