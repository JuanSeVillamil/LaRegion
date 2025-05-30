require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { Pool } = require('pg');
const pgSession = require('connect-pg-simple')(session);
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(cors({
  origin: ['https://www.afianzadoralaregional.com', 'https://afianzadoralaregional.com'], // agrega tus dominios
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
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

function protegerRuta(req, res, next) {
  if (req.session && req.session.usuario === 'admin') {
    next();
  } else {
    res.status(401).json({ mensaje: 'No autorizado' });
  }
}

app.get('/verificar-sesion', (req, res) => {
  if (req.session && req.session.usuario === 'admin') {
    res.json({ activa: true });
  } else {
    res.json({ activa: false });
  }
});


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

app.post('/cambiar-contrasena', protegerRuta, async (req, res) => {
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

app.post('/agregar', async (req, res) => {
  const {
    numero,
    numero_original,
    estado,
    contratante,
    beneficiario,
    contratante_direccion,
    contratante_ciudad,
    fecha_expedicion
  } = req.body;

  try {
    if (numero_original && numero_original !== numero) {
      // Se cambió el número de fianza
      await pool.query(`
        UPDATE estados SET
          numero = $1,
          estado = $2,
          contratante = $3,
          beneficiario = $4,
          contratante_direccion = $5,
          contratante_ciudad = $6,
          fecha_expedicion = $7
        WHERE numero = $8
      `, [
        numero,
        estado,
        contratante,
        beneficiario,
        contratante_direccion,
        contratante_ciudad,
        fecha_expedicion,
        numero_original
      ]);
    } else {
      // Insertar o actualizar sin cambio de número
      const query = `
        INSERT INTO estados (numero, estado, contratante, beneficiario, contratante_direccion, contratante_ciudad, fecha_expedicion)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (numero) DO UPDATE SET
          estado = EXCLUDED.estado,
          contratante = EXCLUDED.contratante,
          beneficiario = EXCLUDED.beneficiario,
          contratante_direccion = EXCLUDED.contratante_direccion,
          contratante_ciudad = EXCLUDED.contratante_ciudad,
          fecha_expedicion = EXCLUDED.fecha_expedicion;
      `;

      await pool.query(query, [
        numero,
        estado,
        contratante,
        beneficiario,
        contratante_direccion,
        contratante_ciudad,
        fecha_expedicion
      ]);
    }

    res.json({ exito: true });
  } catch (error) {
    console.error('Error en /agregar:', error);
    res.json({ exito: false, mensaje: error.message });
  }
});


app.post('/verificar', async (req, res) => {
  const { numero } = req.body;

  try {
    const result = await pool.query(`
      SELECT estado, contratante, beneficiario, contratante_direccion, contratante_ciudad, fecha_expedicion
      FROM estados
      WHERE numero = $1
    `, [numero]);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.json({ estado: 'No aprobado' }); // También podrías usar: { estado: 'No encontrado' }
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error en la base de datos' });
  }
});
app.get('/todos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT numero, estado, contratante, beneficiario, contratante_direccion, contratante_ciudad, fecha_expedicion
      FROM estados
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener datos' });
  }
});


app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('❌ Error al cerrar sesión:', err);
      return res.status(500).json({ mensaje: 'Error al cerrar sesión' });
    }

    res.clearCookie('connect.sid');
    res.json({ mensaje: 'Sesión cerrada correctamente' });
  });
});

app.post('/eliminar', protegerRuta, async (req, res) => {
  const { numero } = req.body;

  try {
    const result = await pool.query('DELETE FROM estados WHERE numero = $1', [numero]);
    if (result.rowCount > 0) {
      res.json({ exito: true });
    } else {
      res.json({ exito: false, mensaje: 'Registro no encontrado' });
    }
  } catch (error) {
    console.error('Error en /eliminar:', error);
    res.status(500).json({ exito: false, mensaje: 'Error en la base de datos' });
  }
});


app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});

