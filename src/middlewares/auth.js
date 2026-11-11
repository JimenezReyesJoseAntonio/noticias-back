const jwt = require('jsonwebtoken');
const pool = require('../db');
const { parseCategoryId } = require('../validators/common');

async function verificarToken(req, res, next) {
  const authorization = req.headers.authorization;
  const match = typeof authorization === 'string'
    ? authorization.match(/^Bearer\s+(\S+)$/i)
    : null;
  if (!match) return res.status(401).json({ mensaje: 'Se requiere un token Bearer' });
  if (!process.env.JWT_SECRET) return next(new Error('JWT_SECRET no está configurado'));

  let claims;
  try {
    claims = jwt.verify(match[1], process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ mensaje: 'Token inválido o expirado' });
  }

  const userId = Number(claims.sub ?? claims.id);
  if (!Number.isSafeInteger(userId) || userId < 1) {
    return res.status(401).json({ mensaje: 'Token inválido o expirado' });
  }

  const [rows] = await pool.query(
    'SELECT id_usuario, rol, estado FROM usuarios WHERE id_usuario = ? LIMIT 1',
    [userId]
  );
  if (rows.length === 0) return res.status(401).json({ mensaje: 'La cuenta ya no está disponible' });
  if (rows[0].estado !== 'activo') {
    return res.status(403).json({ mensaje: 'La cuenta está inactiva' });
  }

  req.user = {
    id_usuario: rows[0].id_usuario,
    rol: rows[0].rol
  };
  next();
}

function soloAdmin(req, res, next) {
  if (req.user.rol !== 'admin') {
    return res.status(403).json({ mensaje: 'Se requieren permisos de administrador' });
  }
  next();
}

async function verificarAutorOAdmin(req, res, next) {
  const id = parseCategoryId(req.params.id);
  if (id === null) return res.status(400).json({ mensaje: 'El identificador no es válido' });

  const [rows] = await pool.query(
    'SELECT id_usuario FROM noticias WHERE id_noticia = ? LIMIT 1',
    [id]
  );
  if (rows.length === 0) return res.status(404).json({ mensaje: 'Noticia no encontrada' });
  if (req.user.rol !== 'admin' && Number(rows[0].id_usuario) !== Number(req.user.id_usuario)) {
    return res.status(403).json({ mensaje: 'No tienes permiso para modificar esta noticia' });
  }

  req.noticiaId = id;
  next();
}

module.exports = { verificarToken, soloAdmin, verificarAutorOAdmin };
