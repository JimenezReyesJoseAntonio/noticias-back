const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db');

const app = express();
app.use(cors());

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use('/uploads', express.static(uploadsDir));
app.use(express.json());

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});
const upload = multer({ storage });

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const protectedUserFields = ['id_usuario', 'rol', 'estado', 'password_hash'];
const editableNewsFields = {
  titulo: 'titulo',
  resumen: 'resumen',
  contenido: 'contenido',
  imagen: 'imagen',
  id_categoria: 'id_categoria',
  destacada: 'destacada'
};

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function parseCategoryId(value) {
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    value = Number(value);
  }
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function parseFeatured(value) {
  if (value === true || value === 1 || value === '1') return 1;
  if (value === false || value === 0 || value === '0') return 0;
  return null;
}

function hasProtectedUserFields(body) {
  return protectedUserFields.some((field) => Object.hasOwn(body, field));
}

function normalizeNewsInput(body, partial = false) {
  if (!isObject(body)) return { error: 'El cuerpo de la solicitud debe ser un objeto' };
  if (Object.hasOwn(body, 'id_usuario')) {
    return { error: 'El autor se asigna desde la sesión autenticada' };
  }

  const values = {};
  for (const [field, column] of Object.entries(editableNewsFields)) {
    if (!Object.hasOwn(body, field)) continue;
    const value = body[field];

    if (field === 'id_categoria') {
      const categoryId = parseCategoryId(value);
      if (categoryId === null) return { error: 'La categoría no es válida' };
      values[column] = categoryId;
    } else if (field === 'destacada') {
      const featured = parseFeatured(value);
      if (featured === null) return { error: 'El valor de destacada no es válido' };
      values[column] = featured;
    } else if (field === 'imagen' && value === null) {
      values[column] = null;
    } else if (typeof value === 'string') {
      if (['titulo', 'resumen', 'contenido'].includes(field) && !value.trim()) {
        return { error: `${field} no puede estar vacío` };
      }
      values[column] = field === 'titulo' ? value.trim() : value;
    } else {
      return { error: `${field} no es válido` };
    }
  }

  if (Object.keys(values).length === 0) {
    return { error: 'No se proporcionaron campos de noticia válidos' };
  }

  if (!partial) {
    for (const field of ['titulo', 'resumen', 'contenido', 'id_categoria']) {
      if (!Object.hasOwn(values, field)) {
        return { error: `El campo ${field} es obligatorio` };
      }
    }
    if (!Object.hasOwn(values, 'imagen')) values.imagen = null;
    if (!Object.hasOwn(values, 'destacada')) values.destacada = 0;
  }

  return { values };
}

app.get('/', (req, res) => {
  res.send('Backend Noti-oax funcionando');
});

app.get('/api/equipo', async (req, res) => {
  const [rows] = await pool.query(`
    SELECT id_usuario, nombre, foto_perfil
    FROM usuarios
    WHERE estado = 'activo'
    ORDER BY id_usuario
  `);
  res.json(rows);
});

app.get('/api/noticias', async (req, res) => {
  const [rows] = await pool.query(`
    SELECT
      n.*,
      c.nombre_categoria,
      u.nombre AS autor
    FROM noticias n
    JOIN categorias c ON n.id_categoria = c.id_categoria
    JOIN usuarios u ON n.id_usuario = u.id_usuario
    WHERE n.estado = 'publicada'
    ORDER BY n.fecha_publicacion DESC
  `);
  res.json(rows);
});

app.get('/api/noticias/:id', async (req, res) => {
  const id = parseCategoryId(req.params.id);
  if (id === null) return res.status(400).json({ mensaje: 'El identificador no es válido' });

  const [rows] = await pool.query(`
    SELECT
      n.*,
      c.nombre_categoria,
      u.nombre AS autor
    FROM noticias n
    JOIN categorias c ON n.id_categoria = c.id_categoria
    JOIN usuarios u ON n.id_usuario = u.id_usuario
    WHERE n.id_noticia = ? AND n.estado = 'publicada'
    LIMIT 1
  `, [id]);

  if (rows.length === 0) return res.status(404).json({ mensaje: 'Noticia no encontrada' });
  res.json(rows[0]);
});

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

app.post('/api/auth/login', async (req, res) => {
  if (!isObject(req.body)) {
    return res.status(400).json({ mensaje: 'El cuerpo de la solicitud no es válido' });
  }

  const correo = normalizeEmail(req.body.correo);
  const { password } = req.body;
  if (!emailPattern.test(correo) || typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({ mensaje: 'Correo o contraseña no válidos' });
  }

  const [rows] = await pool.query(
    'SELECT id_usuario, nombre, correo, password_hash, rol, estado FROM usuarios WHERE correo = ? LIMIT 1',
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
});

app.post('/api/usuarios', verificarToken, soloAdmin, async (req, res) => {
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

  const [existingUsers] = await pool.query(
    'SELECT id_usuario FROM usuarios WHERE correo = ? LIMIT 1',
    [correo]
  );
  if (existingUsers.length > 0) {
    return res.status(409).json({ mensaje: 'El correo ya está registrado' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const [result] = await pool.query(
      `INSERT INTO usuarios (nombre, correo, password_hash, rol, estado)
       VALUES (?, ?, ?, 'user', 'activo')`,
      [nombre, correo, passwordHash]
    );
    res.status(201).json({
      mensaje: 'Usuario creado correctamente',
      usuario: {
        id_usuario: result.insertId,
        nombre,
        correo,
        rol: 'user',
        estado: 'activo'
      }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ mensaje: 'El correo ya está registrado' });
    }
    throw error;
  }
});

app.post('/api/noticias', verificarToken, async (req, res) => {
  const { values, error } = normalizeNewsInput(req.body);
  if (error) return res.status(400).json({ mensaje: error });

  const [result] = await pool.query(
    `INSERT INTO noticias
      (id_usuario, id_categoria, titulo, resumen, contenido, imagen, fecha, destacada, estado, fecha_publicacion)
     VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?, 'publicada', NOW())`,
    [
      req.user.id_usuario,
      values.id_categoria,
      values.titulo,
      values.resumen,
      values.contenido,
      values.imagen,
      values.destacada
    ]
  );
  res.status(201).json({ id: result.insertId, mensaje: 'Noticia creada' });
});

app.put('/api/noticias/:id', verificarToken, verificarAutorOAdmin, async (req, res) => {
  const { values, error } = normalizeNewsInput(req.body, true);
  if (error) return res.status(400).json({ mensaje: error });

  const fields = Object.keys(values);
  const assignments = fields.map((field) => `${editableNewsFields[field]} = ?`).join(', ');
  await pool.query(
    `UPDATE noticias SET ${assignments} WHERE id_noticia = ?`,
    [...fields.map((field) => values[field]), req.noticiaId]
  );
  res.json({ mensaje: 'Noticia actualizada' });
});

app.delete('/api/noticias/:id', verificarToken, verificarAutorOAdmin, async (req, res) => {
  await pool.query('DELETE FROM noticias WHERE id_noticia = ?', [req.noticiaId]);
  res.json({ mensaje: 'Noticia eliminada' });
});

app.post('/api/upload', verificarToken, upload.single('imagen'), (req, res) => {
  if (!req.file) return res.status(400).json({ mensaje: 'No se recibió ningún archivo' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

app.use((req, res) => {
  res.status(404).json({ mensaje: 'Ruta no encontrada' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error(error);
  const isInvalidRequest = error instanceof multer.MulterError || error.type === 'entity.parse.failed';
  const status = isInvalidRequest ? 400 : 500;
  res.status(status).json({
    mensaje: isInvalidRequest ? 'La solicitud no es válida' : 'Error interno del servidor'
  });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor en http://localhost:${PORT}`);
  });
}

module.exports = app;
