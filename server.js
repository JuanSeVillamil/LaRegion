require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { Pool } = require('pg');
const pgSession = require('connect-pg-simple')(session);
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 🔹 Conexión a PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 🔹 Middlewares
app.use(cors({
  origin: ['https://www.afianzadoralaregional.com', 'https://afianzadoralaregional.com'],
  credentials: true
}));

app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'session'
  }),
  secret: 'clave_secreta_segura',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 días
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 🔹 Crear tablas si no existen
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin (
        id SERIAL PRIMARY KEY,
        usuario TEXT UNIQUE,
        contrasena TEXT
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS estados (
        numero TEXT PRIMARY KEY,
        estado TEXT NOT NULL,
        contratante TEXT,
        beneficiario TEXT,
        contratante_direccion TEXT,
        contratante_ciudad TEXT,
        fecha_expedicion DATE
      );
    `);

    const result = await pool.query("SELECT * FROM admin WHERE usuario = 'admin'");
    if (result.rows.length === 0) {
      await pool.query("INSERT INTO admin (usuario, contrasena) VALUES ($1, $2)", ['admin', '1234']);
      console.log('🛡️ Usuario admin creado');
    }

    console.log('✅ Tablas listas');
  } catch (err) {
    console.error('❌ Error al crear tablas:', err);
  }
})();

// 🔹 Middleware de protección (para panel y admin)
function protegerRuta(req, res, next) {
  if (req.session && req.session.usuario === 'admin') {
    next();
  } else {
    res.status(401).json({ mensaje: 'No autorizado' });
  }
}

// ------------------------------
// 🔹 Rutas normales de certificados
// ------------------------------
const certificadosRouter = require('./routes/certificados');
app.use('/', certificadosRouter);

// ------------------------------
// 🔹 RUTA DE PRUEBA PDF (desde testpdf.js)
// ------------------------------
const testPdfRouter = require('./routes/testpdf');
app.use('/test', testPdfRouter); // 👈 ahora accedes en /test/generar-test

// ------------------------------
// 🔹 Start server
// ------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
