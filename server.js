const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = 3000;

// Middleware para parsear JSON
app.use(express.json());

// Configurar sesión
app.use(session({
  secret: 'tu_clave_secreta_aqui', // cambia por algo seguro
  resave: false,
  saveUninitialized: false,
}));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Base de datos SQLite
const db = new sqlite3.Database('./basedatos.db', (err) => {
  if (err) {
    console.error('❌ Error al conectar con SQLite:', err.message);
  } else {
    console.log('✅ Conectado a la base de datos SQLite');
  }
});

db.run(`
  CREATE TABLE IF NOT EXISTS admin (
    id INTEGER PRIMARY KEY,
    usuario TEXT UNIQUE,
    contrasena TEXT
  )
`, (err) => {
  if (err) {
    console.error('Error creando tabla admin:', err.message);
  } else {
    // Insertar usuario admin y contraseña inicial si no existe
    db.get("SELECT * FROM admin WHERE usuario = 'admin'", (err, row) => {
      if (err) return console.error(err.message);
      if (!row) {
        db.run("INSERT INTO admin (usuario, contrasena) VALUES (?, ?)", ['admin', '1234']);
      }
    });
  }
});


db.run(`
  CREATE TABLE IF NOT EXISTS estados (
    numero TEXT PRIMARY KEY,
    estado TEXT NOT NULL
  )
`);

// Ruta login
app.post('/login', (req, res) => {
  const { usuario, contrasena } = req.body;

  db.get('SELECT contrasena FROM admin WHERE usuario = ?', [usuario], (err, row) => {
    if (err) {
      return res.status(500).json({ autenticado: false });
    }
    if (row && row.contrasena === contrasena) {
      req.session.usuario = usuario; // GUARDAR SESION
      res.json({ autenticado: true });
    } else {
      res.json({ autenticado: false });
    }
  });
});

app.post('/cambiar-contrasena', (req, res) => {
  const { usuario, contrasenaNueva } = req.body;

  if (!usuario || !contrasenaNueva) {
    return res.status(400).json({ exito: false, mensaje: 'Datos incompletos' });
  }

  db.run('UPDATE admin SET contrasena = ? WHERE usuario = ?', [contrasenaNueva, usuario], function (err) {
    if (err) {
      return res.status(500).json({ exito: false, mensaje: 'Error al actualizar contraseña' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado' });
    }
    res.json({ exito: true, mensaje: 'Contraseña actualizada correctamente' });
  });
});

app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ mensaje: 'Error al cerrar sesión' });
    }
    res.json({ mensaje: 'Sesión cerrada correctamente' });
  });
});




// Middleware para proteger rutas
function protegerRuta(req, res, next) {
  if (req.session.usuario) {
    next();
  } else {
    res.status(401).send('No autorizado');
  }
}

// Ruta protegida ejemplo
app.get('/panel.html', protegerRuta, (req, res, next) => {
  // Esto funciona porque express.static sirve archivos,
  // pero para proteger la ruta hacemos esto antes
  next();
});

// Otras rutas (agregar, verificar, todos) igual que antes

// Ruta para agregar o actualizar número
app.post('/agregar', protegerRuta, (req, res) => {
  const { numero, estado } = req.body;

  if (!numero || !estado) {
    return res.status(400).json({ exito: false, mensaje: 'Datos incompletos' });
  }

  db.run('INSERT OR REPLACE INTO estados (numero, estado) VALUES (?, ?)', [numero, estado], function (err) {
    if (err) {
      res.status(500).json({ exito: false, mensaje: 'Error al insertar' });
    } else {
      res.json({ exito: true });
    }
  });
});

// Ruta para verificar número (abierta)
app.post('/verificar', (req, res) => {
  const { numero } = req.body;
  db.get('SELECT estado FROM estados WHERE numero = ?', [numero], (err, row) => {
    if (err) {
      res.status(500).json({ mensaje: 'Error en la base de datos' });
    } else if (row) {
      res.json({ estado: row.estado });
    } else {
      res.json({ estado: 'No aprobado' });
    }
  });
});

// Ruta para obtener todos los números (protegida)
app.get('/todos', protegerRuta, (req, res) => {
  db.all('SELECT numero, estado FROM estados', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: 'Error al obtener datos' });
    } else {
      res.json(rows);
    }
  });
});

// Servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
