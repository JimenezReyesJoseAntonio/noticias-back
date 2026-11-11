const pool = require('../db');

async function obtenerEquipo(req, res) {
  const [rows] = await pool.query(`
    SELECT id_usuario, nombre, foto_perfil
    FROM usuarios
    WHERE estado = 'activo'
    ORDER BY id_usuario
  `);
  res.json(rows);
}

module.exports = { obtenerEquipo };
