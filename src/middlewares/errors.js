const multer = require('multer');

function rutaNoEncontrada(req, res) {
  res.status(404).json({ mensaje: 'Ruta no encontrada' });
}

function manejarError(error, req, res, next) {
  if (res.headersSent) return next(error);
  console.error(error);
  const isInvalidRequest = error instanceof multer.MulterError || error.type === 'entity.parse.failed';
  const status = isInvalidRequest ? 400 : 500;
  res.status(status).json({
    mensaje: isInvalidRequest ? 'La solicitud no es válida' : 'Error interno del servidor'
  });
}

module.exports = { rutaNoEncontrada, manejarError };
