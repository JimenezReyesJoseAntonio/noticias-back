const { randomUUID } = require('crypto');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function subirImagen(req, res) {
  if (!req.file) return res.status(400).json({ mensaje: 'No se recibió ningún archivo' });
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_STORAGE_BUCKET) {
    throw new Error('La configuración de Supabase Storage está incompleta');
  }
  const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const ext = path.extname(req.file.originalname).toLowerCase();
  const filename = `${randomUUID()}${ext}`;
  const bucket = client.storage.from(SUPABASE_STORAGE_BUCKET);
  const { error } = await bucket.upload(filename, req.file.buffer, {
    contentType: req.file.mimetype,
    upsert: false
  });
  if (error) throw error;
  const { data } = bucket.getPublicUrl(filename);
  res.json({ url: data.publicUrl });
}

module.exports = { subirImagen };
