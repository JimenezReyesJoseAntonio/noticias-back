const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const pool = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});
