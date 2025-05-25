require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { Pool } = require('pg');
const pgSession = require('connect-pg-simple')(session);

app.use(session({
  store: new pgSession({
    pool: pool,                // usa el mismo pool de PostgreSQL
    tableName: 'session'       // puedes cambiar el nombre si quieres
  }),
  secret: 'clave_secreta_segura',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 días
}));


const app = express();
const PORT = process.env.PORT || 3000;

// Conexión a PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'clave_secreta_segura',
  resave: false,
  saveUninitialized: false
}));

// Inicializar tablas
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
        estado TEXT NOT NULL
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

// Middleware de protección
function protegerRuta(req, res, next) {
  if (req.session.usuario) {
    next();
  } else {
    res.status(401).send('No autorizado');
  }
}

// Rutas
app.post('/login', async (req, res) => {
  const { usuario, contrasena } = req.body;

  try {
    const result = await pool.query('SELECT contrasena FROM admin WHERE usuario = $1', [usuario]);
    if (result.rows.length > 0 && result.rows[0].contrasena === contrasena) {
      req.session.usuario = usuario;
      res.json({ autenticado: true });
    } else {
      res.json({ autenticado: false });
    }
  } catch (error) {
    res.status(500).json({ autenticado: false });
  }
});

app.post('/cambiar-contrasena', async (req, res) => {
  const { usuario, contrasenaNueva } = req.body;

  if (!usuario || !contrasenaNueva) {
    return res.status(400).json({ exito: false, mensaje: 'Datos incompletos' });
  }

  try {
    const result = await pool.query('UPDATE admin SET contrasena = $1 WHERE usuario = $2', [contrasenaNueva, usuario]);
    if (result.rowCount === 0) {
      res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado' });
    } else {
      res.json({ exito: true, mensaje: 'Contraseña actualizada correctamente' });
    }
  } catch (err) {
    res.status(500).json({ exito: false, mensaje: 'Error en la base de datos' });
  }
});

app.post('/agregar', protegerRuta, async (req, res) => {
  const { numero, estado } = req.body;

  if (!numero || !estado) {
    return res.status(400).json({ exito: false, mensaje: 'Datos incompletos' });
  }

  try {
    await pool.query(`
      INSERT INTO estados (numero, estado)
      VALUES ($1, $2)
      ON CONFLICT (numero)
      DO UPDATE SET estado = EXCLUDED.estado
    `, [numero, estado]);

    res.json({ exito: true });
  } catch (err) {
    res.status(500).json({ exito: false, mensaje: 'Error al insertar' });
  }
});

app.post('/verificar', async (req, res) => {
  const { numero } = req.body;

  try {
    const result = await pool.query('SELECT estado FROM estados WHERE numero = $1', [numero]);
    if (result.rows.length > 0) {
      res.json({ estado: result.rows[0].estado });
    } else {
      res.json({ estado: 'No aprobado' });
    }
  } catch (err) {
    res.status(500).json({ mensaje: 'Error en la base de datos' });
  }
});

app.get('/todos', protegerRuta, async (req, res) => {
  try {
    const result = await pool.query('SELECT numero, estado FROM estados');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener datos' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login.html');
});

// Servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
