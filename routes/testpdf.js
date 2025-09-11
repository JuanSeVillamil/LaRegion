const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');

router.get('/test-pdf', (req, res) => {
  try {
    const doc = new PDFDocument({ margin: 50 });
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="test.pdf"',
      });
      res.send(pdfBuffer);
    });

    // Contenido mínimo
    doc.fontSize(20).text('🚀 PDF de prueba en Render', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text('Si ves este archivo, significa que PDFKit funciona en producción.');
    doc.moveDown();
    doc.text('Fecha: ' + new Date().toLocaleString());

    // Finalizar
    doc.end();

  } catch (err) {
    console.error('❌ Error en /test-pdf:', err);
    res.status(500).json({ mensaje: 'Error generando PDF de prueba' });
  }
});

module.exports = router;
