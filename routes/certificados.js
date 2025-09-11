const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const path = require('path');

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

    // 🔹 Logo centrado (asegúrate de tenerlo en /public/logo.png)
    const logoPath = path.join(__dirname, '../public/logo.png');
    try {
      doc.image(logoPath, { fit: [120, 120], align: 'center' });
    } catch (err) {
      console.warn("⚠️ No se encontró logo en public/logo.png");
    }

    doc.moveDown(2).fontSize(18).text('CERTIFICADO DE FIANZA DE CUMPLIMIENTO', { align: 'center' });
    doc.moveDown();

    // 📌 Secciones del certificado

    // Datos de expedición
    doc.fontSize(14).text('Datos de Expedición', { underline: true });
    doc.fontSize(12)
      .text(`Ciudad: ${data.ciudad_expedicion}`)
      .text(`Fecha: ${data.fecha_expedicion}`)
      .text(`Número de Fianza: ${data.documento_fianza}`)
      .text(`Anexo: ${data.anexo}`)
      .moveDown();

    // Contratante
    doc.fontSize(14).text('Contratante', { underline: true });
    doc.fontSize(12)
      .text(`Nombre: ${data.contratante}`)
      .text(`NIT: ${data.contratante_nit}`)
      .text(`Dirección: ${data.contratante_direccion}`)
      .text(`Teléfono: ${data.contratante_tel}`)
      .text(`Ciudad: ${data.contratante_ciudad}`)
      .moveDown();

    // Afianzado
    doc.fontSize(14).text('Afianzado', { underline: true });
    doc.fontSize(12)
      .text(`Nombre: ${data.afianzado}`)
      .text(`NIT: ${data.afianzado_nit}`)
      .text(`Dirección: ${data.afianzado_direccion}`)
      .text(`Teléfono: ${data.afianzado_tel}`)
      .text(`Ciudad: ${data.afianzado_ciudad}`)
      .moveDown();

    // Beneficiario
    doc.fontSize(14).text('Beneficiario', { underline: true });
    doc.fontSize(12)
      .text(`Nombre: ${data.beneficiario}`)
      .text(`NIT: ${data.beneficiario_nit}`)
      .text(`Dirección: ${data.beneficiario_direccion}`)
      .text(`Teléfono: ${data.beneficiario_tel}`)
      .text(`Ciudad: ${data.beneficiario_ciudad}`)
      .moveDown();

    // Objeto y observaciones
    doc.fontSize(14).text('Objeto y Observaciones', { underline: true });
    doc.fontSize(12)
      .text(`Objeto: ${data.objeto}`)
      .text(`Observaciones: ${data.observaciones}`)
      .moveDown();

    // Contrato
    doc.fontSize(14).text('Contrato', { underline: true });
    doc.fontSize(12)
      .text(`Valor: ${data.valor_contrato}`)
      .text(`Clase: ${data.clase_contrato}`)
      .text(`Pagaré: ${data.pagare}`)
      .moveDown();

    // Fianzas
    doc.fontSize(14).text('Fianzas', { underline: true });
    if (Array.isArray(data.fianzas) && data.fianzas.length > 0) {
      data.fianzas.forEach((f, i) => {
        doc.fontSize(12).text(
          `${i + 1}. Tipo: ${f.tipo} | Valor: ${f.valor} | Desde: ${f.desde} | Hasta: ${f.hasta}`
        );
      });
    } else {
      doc.fontSize(12).text("No se registraron fianzas");
    }
    doc.moveDown();

    // Costos
    doc.fontSize(14).text('Costos', { underline: true });
    doc.fontSize(12)
      .text(`Total Afianzado: ${data.total_afianzado}`)
      .text(`Costo Neto: ${data.costo_neto}`)
      .text(`Costos Admin: ${data.costos_admin}`)
      .text(`IVA: ${data.iva}`)
      .text(`Total a Pagar: ${data.total_pagar}`)
      .moveDown();

    // Otros datos
    doc.fontSize(14).text('Otros Datos', { underline: true });
    doc.fontSize(12)
      .text(`Clave: ${data.clave}`)
      .text(`Asesor: ${data.asesor}`)
      .text(`% Participación: ${data.participacion}`)
      .text(`Centro PDR: ${data.centro_pdr}`);

    // Finalizar PDF
    doc.end();

  } catch (err) {
    console.error('❌ Error generando PDF:', err);
    res.status(500).json({ mensaje: 'Error generando certificado' });
  }
});

module.exports = router;
