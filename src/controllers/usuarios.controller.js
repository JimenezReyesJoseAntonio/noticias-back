const bcrypt = require('bcryptjs');
const pool = require('../db');
const { emailPattern, isObject, normalizeEmail, hasProtectedUserFields } = require('../validators/common');

async function crearUsuario(req, res) {
  if (!isObject(req.body)) {
    return res.status(400).json({ mensaje: 'El cuerpo de la solicitud no es válido' });
  }
  if (hasProtectedUserFields(req.body)) {
    return res.status(400).json({ mensaje: 'No se pueden establecer id, rol, estado ni password_hash' });
  }

  const nombre = typeof req.body.nombre === 'string' ? req.body.nombre.trim() : '';
  const correo = normalizeEmail(req.body.correo);
  const { password } = req.body;
  if (!nombre || nombre.length > 100) {
    return res.status(400).json({ mensaje: 'El nombre es obligatorio y no debe exceder 100 caracteres' });
  }
  if (!emailPattern.test(correo) || correo.length > 100) {
    return res.status(400).json({ mensaje: 'El correo no es válido' });
  }
  if (
    typeof password !== 'string' ||
    password.length < 8 ||
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 8 caracteres y no exceder 72 bytes' });
  }

  const { rows: existingUsers } = await pool.query(
    'SELECT id_usuario FROM notioax.usuarios WHERE lower(correo) = $1 LIMIT 1',
    [correo]
  );
  if (existingUsers.length > 0) {
    return res.status(409).json({ mensaje: 'El correo ya está registrado' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const result = await pool.query(
      `INSERT INTO notioax.usuarios (nombre, correo, password_hash, rol, estado)
       VALUES ($1, $2, $3, 'user', 'activo') RETURNING id_usuario`,
      [nombre, correo, passwordHash]
    );
    res.status(201).json({
      mensaje: 'Usuario creado correctamente',
      usuario: {
        id_usuario: result.rows[0].id_usuario,
        nombre,
        correo,
        rol: 'user',
        estado: 'activo'
      }
    });
  } catch (error) {
    if (error.code === '23505' && ['usuarios_correo_key', 'usuarios_correo_normalizado_key'].includes(error.constraint)) {
      return res.status(409).json({ mensaje: 'El correo ya está registrado' });
    }
    throw error;
  }
}

module.exports = { crearUsuario };
