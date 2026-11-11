const pool = require('../db');
const { parseCategoryId } = require('../validators/common');
const { editableNewsFields, normalizeNewsInput } = require('../validators/noticias');

async function listarNoticias(req, res) {
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
}

async function obtenerNoticia(req, res) {
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
}

async function crearNoticia(req, res) {
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
}

async function actualizarNoticia(req, res) {
  const { values, error } = normalizeNewsInput(req.body, true);
  if (error) return res.status(400).json({ mensaje: error });

  const fields = Object.keys(values);
  const assignments = fields.map((field) => `${editableNewsFields[field]} = ?`).join(', ');
  await pool.query(
    `UPDATE noticias SET ${assignments} WHERE id_noticia = ?`,
    [...fields.map((field) => values[field]), req.noticiaId]
  );
  res.json({ mensaje: 'Noticia actualizada' });
}

async function eliminarNoticia(req, res) {
  await pool.query('DELETE FROM noticias WHERE id_noticia = ?', [req.noticiaId]);
  res.json({ mensaje: 'Noticia eliminada' });
}

module.exports = { listarNoticias, obtenerNoticia, crearNoticia, actualizarNoticia, eliminarNoticia };
