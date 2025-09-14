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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS certificados (
        id SERIAL PRIMARY KEY,
        documento_fianza TEXT UNIQUE,
        ciudad_expedicion TEXT,
        fecha_expedicion DATE,
        anexo TEXT,
        contratante TEXT,
        contratante_nit TEXT,
        contratante_direccion TEXT,
        contratante_tel TEXT,
        contratante_ciudad TEXT,
        afianzado TEXT,
        afianzado_nit TEXT,
        afianzado_direccion TEXT,
        afianzado_tel TEXT,
        afianzado_ciudad TEXT,
        beneficiario TEXT,
        beneficiario_nit TEXT,
        beneficiario_direccion TEXT,
        beneficiario_tel TEXT,
        beneficiario_ciudad TEXT,
        objeto TEXT,
        observaciones TEXT,
        valor_contrato TEXT,
        clase_contrato TEXT,
        pagare TEXT,
        fianzas JSONB,
        total_afianzado TEXT,
        costo_neto TEXT,
        costos_admin TEXT,
        iva TEXT,
        total_pagar TEXT,
        clave TEXT,
        asesor TEXT,
        participacion TEXT,
        centro_pdr TEXT
      );
    `);

    // Crear usuario admin si no existe
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

// 🔹 Middleware de protección
function protegerRuta(req, res, next) {
  if (req.session && req.session.usuario === 'admin') {
    next();
  } else {
    res.status(401).json({ mensaje: 'No autorizado' });
  }
}

// ------------------------------
// 🔐 Rutas de Autenticación
// ------------------------------
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

// ------------------------------
// 📋 Rutas de Estados (para panel)
// ------------------------------
app.post('/agregar', protegerRuta, async (req, res) => {
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
      `, [numero, estado, contratante, beneficiario, contratante_direccion, contratante_ciudad, fecha_expedicion, numero_original]);
    } else {
      await pool.query(`
        INSERT INTO estados (numero, estado, contratante, beneficiario, contratante_direccion, contratante_ciudad, fecha_expedicion)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (numero) DO UPDATE SET
          estado = EXCLUDED.estado,
          contratante = EXCLUDED.contratante,
          beneficiario = EXCLUDED.beneficiario,
          contratante_direccion = EXCLUDED.contratante_direccion,
          contratante_ciudad = EXCLUDED.contratante_ciudad,
          fecha_expedicion = EXCLUDED.fecha_expedicion;
      `, [numero, estado, contratante, beneficiario, contratante_direccion, contratante_ciudad, fecha_expedicion]);
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
      res.json({ estado: 'No aprobado' });
    }
  } catch (err) {
    res.status(500).json({ mensaje: 'Error en la base de datos' });
  }
});

app.get('/todos', protegerRuta, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT numero, estado, contratante, beneficiario, contratante_direccion, contratante_ciudad, fecha_expedicion
      FROM estados
      ORDER BY fecha_expedicion DESC NULLS LAST
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener datos' });
  }
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
    res.status(500).json({ exito: false, mensaje: 'Error en la base de datos' });
  }
});

// ------------------------------
// 📑 Rutas de Certificados
// ------------------------------
app.post('/guardar-certificado', async (req, res) => {
  try {
    const data = req.body;

    // Guardar certificado completo
    await pool.query(`
      INSERT INTO certificados (
        documento_fianza, ciudad_expedicion, fecha_expedicion, anexo,
        contratante, contratante_nit, contratante_direccion, contratante_tel, contratante_ciudad,
        afianzado, afianzado_nit, afianzado_direccion, afianzado_tel, afianzado_ciudad,
        beneficiario, beneficiario_nit, beneficiario_direccion, beneficiario_tel, beneficiario_ciudad,
        objeto, observaciones, valor_contrato, clase_contrato, pagare,
        fianzas, total_afianzado, costo_neto, costos_admin, iva, total_pagar,
        clave, asesor, participacion, centro_pdr
      )
      VALUES (
        $1,$2,$3,$4,
        $5,$6,$7,$8,$9,
        $10,$11,$12,$13,$14,
        $15,$16,$17,$18,$19,
        $20,$21,$22,$23,$24,
        $25,$26,$27,$28,$29,$30,
        $31,$32,$33,$34
      )
      ON CONFLICT (documento_fianza) DO UPDATE SET
        ciudad_expedicion = EXCLUDED.ciudad_expedicion,
        fecha_expedicion = EXCLUDED.fecha_expedicion,
        anexo = EXCLUDED.anexo,
        contratante = EXCLUDED.contratante,
        contratante_nit = EXCLUDED.contratante_nit,
        contratante_direccion = EXCLUDED.contratante_direccion,
        contratante_tel = EXCLUDED.contratante_tel,
        contratante_ciudad = EXCLUDED.contratante_ciudad,
        afianzado = EXCLUDED.afianzado,
        afianzado_nit = EXCLUDED.afianzado_nit,
        afianzado_direccion = EXCLUDED.afianzado_direccion,
        afianzado_tel = EXCLUDED.afianzado_tel,
        afianzado_ciudad = EXCLUDED.afianzado_ciudad,
        beneficiario = EXCLUDED.beneficiario,
        beneficiario_nit = EXCLUDED.beneficiario_nit,
        beneficiario_direccion = EXCLUDED.beneficiario_direccion,
        beneficiario_tel = EXCLUDED.beneficiario_tel,
        beneficiario_ciudad = EXCLUDED.beneficiario_ciudad,
        objeto = EXCLUDED.objeto,
        observaciones = EXCLUDED.observaciones,
        valor_contrato = EXCLUDED.valor_contrato,
        clase_contrato = EXCLUDED.clase_contrato,
        pagare = EXCLUDED.pagare,
        fianzas = EXCLUDED.fianzas,
        total_afianzado = EXCLUDED.total_afianzado,
        costo_neto = EXCLUDED.costo_neto,
        costos_admin = EXCLUDED.costos_admin,
        iva = EXCLUDED.iva,
        total_pagar = EXCLUDED.total_pagar,
        clave = EXCLUDED.clave,
        asesor = EXCLUDED.asesor,
        participacion = EXCLUDED.participacion,
        centro_pdr = EXCLUDED.centro_pdr
    `, [
      data.documento_fianza, data.ciudad_expedicion, data.fecha_expedicion, data.anexo,
      data.contratante, data.contratante_nit, data.contratante_direccion, data.contratante_tel, data.contratante_ciudad,
      data.afianzado, data.afianzado_nit, data.afianzado_direccion, data.afianzado_tel, data.afianzado_ciudad,
      data.beneficiario, data.beneficiario_nit, data.beneficiario_direccion, data.beneficiario_tel, data.beneficiario_ciudad,
      data.objeto, data.observaciones, data.valor_contrato, data.clase_contrato, data.pagare,
      JSON.stringify(data.fianzas || []), data.total_afianzado, data.costo_neto, data.costos_admin, data.iva, data.total_pagar,
      data.clave, data.asesor, data.participacion, data.centro_pdr
    ]);

    // Guardar resumen en estados (para panel y consulta pública)
    await pool.query(`
      INSERT INTO estados (numero, estado, contratante, beneficiario, contratante_direccion, contratante_ciudad, fecha_expedicion)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (numero) DO UPDATE SET
        estado = EXCLUDED.estado,
        contratante = EXCLUDED.contratante,
        beneficiario = EXCLUDED.beneficiario,
        contratante_direccion = EXCLUDED.contratante_direccion,
        contratante_ciudad = EXCLUDED.contratante_ciudad,
        fecha_expedicion = EXCLUDED.fecha_expedicion
    `, [
      data.documento_fianza,
      'Aprobado',
      data.contratante,
      data.beneficiario,
      data.contratante_direccion,
      data.contratante_ciudad,
      data.fecha_expedicion
    ]);

    res.json({ exito: true });
  } catch (error) {
    console.error('❌ Error en /guardar-certificado:', error);
    res.status(500).json({ exito: false, mensaje: 'Error guardando certificado' });
  }
});

app.get('/certificados/:documento_fianza', async (req, res) => {
  try {
    const { documento_fianza } = req.params;
    const result = await pool.query('SELECT * FROM certificados WHERE documento_fianza = $1', [documento_fianza]);

    if (result.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Certificado no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error obteniendo certificado' });
  }
});

// ------------------------------
// 🔹 Start server
// ------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
