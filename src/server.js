const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const pool = require("./db");

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
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
  }
});
const upload = multer({ storage });

app.get("/", (req, res) => {
  res.send("Backend Noti-oax funcionando");
});

app.get("/api/noticias", async (req, res) => {
  try {
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener noticias" });
  }
});

function verificarToken(req, res, next){
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Token requerido" });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user;
    next();
  });
}

function soloAdmin(req, res, next) {
  if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admin' });
  next();
}

app.post('/api/auth/login', async (req, res) => {
  const {correo, password} = req.body;
  const [rows] = await pool.query("SELECT * FROM usuarios WHERE correo = ?", [correo]);

  if(rows.length === 0)
     return res.status(401).json({ error: "Correo o contraseña incorrectos" });
   
  const user = rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Contraseña incorrecta' });

   const token = jwt.sign({ id: user.id_usuario, rol: user.rol }, process.env.JWT_SECRET, { expiresIn: '1d' });
  res.json({ token, usuario: { id: user.id_usuario, nombre: user.nombre, rol: user.rol } });
  });

  app.post('/api/noticias', verificarToken, soloAdmin, async (req, res) => {
  try {
    const { titulo, resumen, contenido, imagen, id_categoria, destacada } = req.body;
    const [result] = await pool.query(
      `INSERT INTO noticias (id_usuario, id_categoria, titulo, resumen, contenido, imagen, fecha, destacada, estado, fecha_publicacion)
       VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?, 'publicada', NOW())`,
      [req.user.id, id_categoria, titulo, resumen, contenido, imagen, destacada || false]
    );
    res.status(201).json({ id: result.insertId, mensaje: 'Noticia creada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear noticia' });
  }
});

app.put('/api/noticias/:id', verificarToken, soloAdmin, async (req, res) => {
  try {
    const { titulo, resumen, contenido, imagen, id_categoria, destacada } = req.body
    await pool.query(
      'UPDATE noticias SET titulo=?, resumen=?, contenido=?, imagen=?, id_categoria=?, destacada=? WHERE id_noticia=?',
      [titulo, resumen, contenido, imagen, id_categoria, destacada ? 1 : 0, req.params.id]
    )
    res.json({ mensaje: 'Noticia actualizada' })
  } catch (e) {
    console.log(e)
    res.status(500).json({ error: 'Error al actualizar' })
  }
});

app.delete('/api/noticias/:id', verificarToken, soloAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM noticias WHERE id_noticia=?', [req.params.id])
    res.json({ mensaje: 'Noticia eliminada' })
  } catch (e) {
    console.log(e)
    res.status(500).json({ error: 'Error al eliminar' })
  }
});

app.post('/api/upload', verificarToken, soloAdmin, upload.single('imagen'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Sin archivo' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});
