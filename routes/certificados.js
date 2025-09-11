const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

router.post('/generar-certificado', async (req, res) => {
  try {
    const data = req.body;

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

    // 🔹 Logo
    const logoPath = path.join(__dirname, '../public/logo.png');
    console.log("🔍 Ruta en Render:", logoPath, "¿Existe?", fs.existsSync(logoPath));

    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, { fit: [120, 120], align: 'center' });
    } else {
      doc.fontSize(10).fillColor('red').text('⚠ Logo no encontrado en servidor', { align: 'center' });
    }

    doc.moveDown(2).fontSize(18).fillColor('black').text('CERTIFICADO DE FIANZA', { align: 'center' });
    doc.moveDown();

    // Datos de expedición
    doc.fontSize(14).text('Datos de Expedición', { underline: true });
    doc.fontSize(12).text(`Ciudad: ${data.ciudad_expedicion}`);
    doc.text(`Fecha: ${data.fecha_expedicion}`);
    doc.text(`Número de Fianza: ${data.documento_fianza}`);
    doc.text(`Anexo: ${data.anexo}`);
    doc.moveDown();

    // Contratante
    doc.fontSize(14).text('Contratante', { underline: true });
    doc.fontSize(12).text(`Nombre: ${data.contratante}`);
    doc.text(`NIT: ${data.contratante_nit}`);
    doc.text(`Dirección: ${data.contratante_direccion}`);
    doc.text(`Teléfono: ${data.contratante_tel}`);
    doc.text(`Ciudad: ${data.contratante_ciudad}`);
    doc.moveDown();

    // Finalizar PDF
    doc.end();

  } catch (err) {
    console.error('❌ Error generando PDF:', err);
    res.status(500).json({ mensaje: 'Error generando certificado' });
  }
});

module.exports = router;
