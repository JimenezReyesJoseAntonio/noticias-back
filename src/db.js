require('dotenv').config();
const fs = require('fs');
const { Pool, types } = require('pg');

types.setTypeParser(1082, (value) => new Date(`${value}T00:00:00`));
types.setTypeParser(1114, (value) => new Date(value.replace(' ', 'T')));

if (process.env.DATABASE_SSL && !['true', 'false'].includes(process.env.DATABASE_SSL)) {
  throw new Error('DATABASE_SSL debe ser true o false');
}
if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  for (const option of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) {
    if (url.searchParams.has(option)) {
      throw new Error(`No incluyas ${option} en DATABASE_URL; configura DATABASE_SSL por separado`);
    }
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'false'
    ? false
    : {
        rejectUnauthorized: true,
        ...(process.env.DATABASE_CA_CERT_PATH
          ? { ca: fs.readFileSync(process.env.DATABASE_CA_CERT_PATH, 'utf8') }
          : {})
      },
  max: 10
});

module.exports = pool;
