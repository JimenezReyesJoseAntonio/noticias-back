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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});
