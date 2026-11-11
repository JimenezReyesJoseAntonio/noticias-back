const router = require('express').Router();
const { obtenerEquipo } = require('../controllers/equipo.controller');

router.get('/', obtenerEquipo);

module.exports = router;
