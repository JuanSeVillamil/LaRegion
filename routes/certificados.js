// routes/certificados.js
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const ejs = require('ejs');
const dayjs = require('dayjs');
require('dayjs/locale/es');
const QRCode = require('qrcode');
const puppeteer = require('puppeteer-core');
const chromium = require('chrome-aws-lambda');

dayjs.locale('es');

const router = express.Router();

// 🔹 Ruta pública para generar certificado
router.post('/generar-certificado', async (req, res) => {
  try {
    const body = req.body || {};

    // --- Extraer datos ---
    const {
      ciudad_expedicion,
      fecha_expedicion,
      documento_fianza,
      anexo,
      contratante, contratante_nit, contratante_direccion, contratante_tel, contratante_ciudad,
      afianzado, afianzado_nit, afianzado_direccion, afianzado_tel, afianzado_ciudad,
      beneficiario, beneficiario_nit, beneficiario_direccion, beneficiario_tel, beneficiario_ciudad,
      objeto, observaciones,
      valor_contrato, clase_contrato, pagare,
      total_afianzado, costo_neto, costos_admin, iva, total_pagar,
      clave, asesor, participacion, centro_pdr
    } = body;

    // --- Fianzas ---
    let fianzas = [];
    if (Array.isArray(body.fianzas)) {
      fianzas = body.fianzas;
    } else if (Array.isArray(body.tipo_fianza)) {
      for (let i = 0; i < body.tipo_fianza.length; i++) {
        fianzas.push({
          tipo: body.tipo_fianza[i],
          valor: body.valor_afianzado?.[i] ?? '',
          desde: body.desde?.[i] ?? '',
          hasta: body.hasta?.[i] ?? ''
        });
      }
    }

    let totalAfianzadoCalc = 0;
    if ((!total_afianzado || total_afianzado === '') && fianzas.length) {
      totalAfianzadoCalc = fianzas.reduce((s, f) => s + (Number(f.valor) || 0), 0);
    }

    const fmt = d => (d ? dayjs(d).format('D [de] MMMM [de] YYYY') : '');
    const fechaExpFmt = fmt(fecha_expedicion);
    const hoy = fmt(new Date());

    const verificarUrl = `https://afianzadoralaregional.com/?n=${encodeURIComponent(documento_fianza || '')}`;
    const qrDataUrl = await QRCode.toDataURL(verificarUrl, { margin: 0 });

    // Leer imágenes (si existen)
    const logoPath = path.join(__dirname, '../assets/img/logo.png');
    const watermarkPath = path.join(__dirname, '../assets/img/watermark.png');
    const [logoB64, watermarkB64] = await Promise.all([
      fs.readFile(logoPath).then(b => `data:image/png;base64,${b.toString('base64')}`).catch(() => null),
      fs.readFile(watermarkPath).then(b => `data:image/png;base64,${b.toString('base64')}`).catch(() => null)
    ]);

    // Render EJS -> HTML
    const html = await ejs.renderFile(
      path.join(__dirname, '../templates/certificado.ejs'),
      {
        ciudad_expedicion,
        fecha_expedicion: fechaExpFmt,
        documento_fianza,
        anexo,
        contratante, contratante_nit, contratante_direccion, contratante_tel, contratante_ciudad,
        afianzado, afianzado_nit, afianzado_direccion, afianzado_tel, afianzado_ciudad,
        beneficiario, beneficiario_nit, beneficiario_direccion, beneficiario_tel, beneficiario_ciudad,
        objeto, observaciones,
        valor_contrato, clase_contrato, pagare,
        total_afianzado: total_afianzado || totalAfianzadoCalc,
        costo_neto, costos_admin, iva, total_pagar,
        clave, asesor, participacion, centro_pdr,
        fianzas,
        hoy,
        qrDataUrl,
        logoDataUrl: logoB64,
        watermarkDataUrl: watermarkB64
      },
      { async: true }
    );

    // 🔹 Lanzar Puppeteer con chrome-aws-lambda
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // CSS adicional
    const cssPath = path.join(__dirname, '../templates/certificado.css');
    await page.addStyleTag({ path: cssPath }).catch(() => {});

    // Generar PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '18mm', right: '12mm', bottom: '18mm', left: '12mm' }
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=certificado_${documento_fianza || 'sin_numero'}.pdf`);
    return res.send(pdfBuffer);

  } catch (err) {
    console.error('Error en /generar-certificado:', err);
    return res.status(500).json({ mensaje: 'Error generando certificado', detalle: err.message });
  }
});

module.exports = router;
