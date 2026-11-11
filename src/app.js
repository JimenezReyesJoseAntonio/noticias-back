require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { uploadsDir } = require('./upload');
const { rutaNoEncontrada, manejarError } = require('./middlewares/errors');

const app = express();
app.use(cors());
app.use('/uploads', express.static(uploadsDir));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Backend Noti-oax funcionando');
});

app.use('/api/equipo', require('./routes/equipo.routes'));
app.use('/api/noticias', require('./routes/noticias.routes'));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/usuarios', require('./routes/usuarios.routes'));
app.use('/api/upload', require('./routes/upload.routes'));

app.use(rutaNoEncontrada);
app.use(manejarError);

module.exports = app;
