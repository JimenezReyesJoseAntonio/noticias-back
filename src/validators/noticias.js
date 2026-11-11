const { isObject, parseCategoryId, parseFeatured } = require('./common');

const editableNewsFields = {
  titulo: 'titulo',
  resumen: 'resumen',
  contenido: 'contenido',
  imagen: 'imagen',
  id_categoria: 'id_categoria',
  destacada: 'destacada'
};

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

module.exports = { editableNewsFields, normalizeNewsInput };
