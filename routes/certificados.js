const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

router.post('/generar-certificado', async (req, res) => {
  try {
    const data = req.body;

    console.log("📥 Datos recibidos en /generar-certificado:", data);

    // Crear PDF
    const doc = new PDFDocument({ margin: 50 });
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="certificado_${data.documento_fianza || 'certificado'}.pdf"`,
      });
      res.send(pdfBuffer);
    });

    // ✅ Logo opcional
    const logoPath = path.join(__dirname, '../public/logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, { fit: [120, 120], align: 'center' });
    } else {
      console.warn("⚠️ Logo no encontrado en:", logoPath);
    }

    doc.moveDown(2).fontSize(18).text('CERTIFICADO DE FIANZA DE CUMPLIMIENTO', { align: 'center' });
    doc.moveDown();

    // Ejemplo simple de datos
    doc.fontSize(14).text('Datos de Expedición', { underline: true });
    doc.fontSize(12)
      .text(`Ciudad: ${data.ciudad_expedicion || ''}`)
      .text(`Fecha: ${data.fecha_expedicion || ''}`)
      .text(`Número de Fianza: ${data.documento_fianza || ''}`)
      .text(`Anexo: ${data.anexo || ''}`)
      .moveDown();

    // ... (el resto igual que antes, con `|| ''` en cada campo para evitar errores)

    doc.end();

  } catch (err) {
    console.error('❌ Error generando PDF:', err);
    res.status(500).json({ mensaje: 'Error generando certificado', error: err.message });
  }
});

module.exports = router;
