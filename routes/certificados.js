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

    // 🔹 Logo con validación
    try {
      const logoPath = path.join(__dirname, '../public/logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, { fit: [120, 120], align: 'center' });
      } else {
        console.warn("⚠️ Logo no encontrado en:", logoPath);
        doc.fontSize(16).text('AFIANZADORA LA REGIONAL', { align: 'center' });
      }
    } catch (e) {
      console.error("❌ Error cargando logo:", e.message);
      doc.fontSize(16).text('AFIANZADORA LA REGIONAL', { align: 'center' });
    }

    doc.moveDown(2).fontSize(18).text('CERTIFICADO DE FIANZA', { align: 'center' });
    doc.moveDown();

    // 🔹 Datos de expedición
    doc.fontSize(14).text('Datos de Expedición', { underline: true });
    doc.fontSize(12).text(`Ciudad: ${data.ciudad_expedicion}`);
    doc.text(`Fecha: ${data.fecha_expedicion}`);
    doc.text(`Número de Fianza: ${data.documento_fianza}`);
    doc.text(`Anexo: ${data.anexo}`);
    doc.moveDown();

    // 🔹 Contratante
    doc.fontSize(14).text('Contratante', { underline: true });
    doc.fontSize(12).text(`Nombre: ${data.contratante}`);
    doc.text(`NIT: ${data.contratante_nit}`);
    doc.text(`Dirección: ${data.contratante_direccion}`);
    doc.text(`Teléfono: ${data.contratante_tel}`);
    doc.text(`Ciudad: ${data.contratante_ciudad}`);
    doc.moveDown();

    // 🔹 Afianzado
    doc.fontSize(14).text('Afianzado', { underline: true });
    doc.fontSize(12).text(`Nombre: ${data.afianzado}`);
    doc.text(`NIT: ${data.afianzado_nit}`);
    doc.text(`Dirección: ${data.afianzado_direccion}`);
    doc.text(`Teléfono: ${data.afianzado_tel}`);
    doc.text(`Ciudad: ${data.afianzado_ciudad}`);
    doc.moveDown();

    // 🔹 Beneficiario
    doc.fontSize(14).text('Beneficiario', { underline: true });
    doc.fontSize(12).text(`Nombre: ${data.beneficiario}`);
    doc.text(`NIT: ${data.beneficiario_nit}`);
    doc.text(`Dirección: ${data.beneficiario_direccion}`);
    doc.text(`Teléfono: ${data.beneficiario_tel}`);
    doc.text(`Ciudad: ${data.beneficiario_ciudad}`);
    doc.moveDown();

    // 🔹 Fianzas (lista simple)
    doc.fontSize(14).text('Fianzas', { underline: true });
    (data.fianzas || []).forEach((f, i) => {
      doc.fontSize(12).text(
        `${i + 1}. Tipo: ${f.tipo} | Valor: ${f.valor} | Desde: ${f.desde} | Hasta: ${f.hasta}`
      );
    });
    doc.moveDown();

    // 🔹 Costos
    doc.fontSize(14).text('Costos', { underline: true });
    doc.fontSize(12).text(`Total Afianzado: ${data.total_afianzado}`);
    doc.text(`Costo Neto: ${data.costo_neto}`);
    doc.text(`Costos Admin: ${data.costos_admin}`);
    doc.text(`IVA: ${data.iva}`);
    doc.text(`Total a Pagar: ${data.total_pagar}`);
    doc.moveDown();

    // 🔹 Otros
    doc.fontSize(14).text('Otros Datos', { underline: true });
    doc.fontSize(12).text(`Clave: ${data.clave}`);
    doc.text(`Asesor: ${data.asesor}`);
    doc.text(`% Participación: ${data.participacion}`);
    doc.text(`Centro PDR: ${data.centro_pdr}`);

    // 🔹 Finalizar
    doc.end();

  } catch (err) {
    console.error('❌ Error generando PDF:', err);
    res.status(500).json({ mensaje: 'Error generando certificado' });
  }
});

module.exports = router;
