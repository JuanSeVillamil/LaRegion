const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./estado.db', (err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err.message);
  } else {
    console.log('Conectado a la base de datos SQLite');
  }
});

// Insertar datos de ejemplo
const datos = [
  { numero: '12345', estado: 'Aprobado' },
  { numero: '67890', estado: 'No Aprobado' },
  { numero: '11111', estado: 'Aprobado' }
];

datos.forEach((registro) => {
  db.run(
    'INSERT OR REPLACE INTO estados (numero, estado) VALUES (?, ?)',
    [registro.numero, registro.estado],
    (err) => {
      if (err) {
        console.error(`Error al insertar número ${registro.numero}:`, err.message);
      } else {
        console.log(`Número ${registro.numero} insertado correctamente`);
      }
    }
  );
});

// Cerrar la conexión
db.close();
