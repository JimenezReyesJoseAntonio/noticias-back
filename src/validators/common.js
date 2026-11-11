const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const protectedUserFields = ['id_usuario', 'rol', 'estado', 'password_hash'];

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

module.exports = { emailPattern, isObject, normalizeEmail, parseCategoryId, parseFeatured, hasProtectedUserFields };
