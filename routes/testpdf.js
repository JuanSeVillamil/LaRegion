const express = require('express');
const PDFDocument = require('pdfkit');
const router = express.Router();

router.post('/test/generar-test', async (req, res) => {
  try {
    const doc = new PDFDocument();
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

    doc.fontSize(20).text('✅ PDF generado correctamente en Render', 100, 100);

    doc.end();
  } catch (err) {
    console.error('❌ Error generando PDF:', err);
    res.status(500).json({ mensaje: 'Error generando test PDF' });
  }
});

module.exports = router;
