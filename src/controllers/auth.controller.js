const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { emailPattern, isObject, normalizeEmail } = require('../validators/common');

async function login(req, res) {
  if (!isObject(req.body)) {
    return res.status(400).json({ mensaje: 'El cuerpo de la solicitud no es válido' });
  }

  const correo = normalizeEmail(req.body.correo);
  const { password } = req.body;
  if (!emailPattern.test(correo) || typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({ mensaje: 'Correo o contraseña no válidos' });
  }

  const { rows } = await pool.query(
    'SELECT id_usuario, nombre, correo, password_hash, rol, estado FROM notioax.usuarios WHERE lower(correo) = $1 LIMIT 1',
    [correo]
  );
  if (rows.length === 0) {
    return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos' });
  }

  const user = rows[0];
  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos' });
  }
  if (user.estado !== 'activo') {
    return res.status(403).json({ mensaje: 'La cuenta está inactiva' });
  }
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET no está configurado');

  const token = jwt.sign(
    { sub: String(user.id_usuario) },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
  res.json({
    token,
    usuario: {
      id_usuario: user.id_usuario,
      nombre: user.nombre,
      correo: user.correo,
      rol: user.rol
    }
  });
}

module.exports = { login };
