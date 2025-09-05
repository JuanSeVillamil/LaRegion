const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer'); // ✅ puppeteer normal (no core)

// 🚀 Generar certificado PDF
router.post('/generar-certificado', async (req, res) => {
  try {
    const data = req.body;

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; margin: 40px; }
            h1 { text-align: center; font-size: 20px; }
            h2 { margin-top: 30px; font-size: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            table, th, td { border: 1px solid #444; }
            th, td { padding: 6px; text-align: center; }
            .logo { text-align: center; margin-bottom: 20px; }
            .watermark {
              position: fixed;
              top: 35%;
              left: 15%;
              opacity: 0.1;
              font-size: 100px;
              color: #000;
              transform: rotate(-30deg);
              z-index: -1;
            }
          </style>
        </head>
        <body>
          <div class="logo">
            <img src="https://www.afianzadoralaregional.com/logo.png" width="120"/>
          </div>
          <div class="watermark">FIANZA</div>
          <h1>Certificado de Fianza de Cumplimiento</h1>

          <h2>Datos de Expedición</h2>
          <p><b>Ciudad:</b> ${data.ciudad_expedicion}</p>
          <p><b>Fecha:</b> ${data.fecha_expedicion}</p>
          <p><b>Número de Fianza:</b> ${data.documento_fianza}</p>
          <p><b>Anexo:</b> ${data.anexo}</p>

          <h2>Contratante</h2>
          <p><b>Nombre:</b> ${data.contratante}</p>
          <p><b>NIT:</b> ${data.contratante_nit}</p>
          <p><b>Dirección:</b> ${data.contratante_direccion}</p>
          <p><b>Teléfono:</b> ${data.contratante_tel}</p>
          <p><b>Ciudad:</b> ${data.contratante_ciudad}</p>

          <h2>Afianzado</h2>
          <p><b>Nombre:</b> ${data.afianzado}</p>
          <p><b>NIT:</b> ${data.afianzado_nit}</p>
          <p><b>Dirección:</b> ${data.afianzado_direccion}</p>
          <p><b>Teléfono:</b> ${data.afianzado_tel}</p>
          <p><b>Ciudad:</b> ${data.afianzado_ciudad}</p>

          <h2>Beneficiario</h2>
          <p><b>Nombre:</b> ${data.beneficiario}</p>
          <p><b>NIT:</b> ${data.beneficiario_nit}</p>
          <p><b>Dirección:</b> ${data.beneficiario_direccion}</p>
          <p><b>Teléfono:</b> ${data.beneficiario_tel}</p>
          <p><b>Ciudad:</b> ${data.beneficiario_ciudad}</p>

          <h2>Objeto y Observaciones</h2>
          <p><b>Objeto:</b> ${data.objeto}</p>
          <p><b>Observaciones:</b> ${data.observaciones}</p>

          <h2>Contrato</h2>
          <p><b>Valor:</b> ${data.valor_contrato}</p>
          <p><b>Clase:</b> ${data.clase_contrato}</p>
          <p><b>Pagaré:</b> ${data.pagare}</p>

          <h2>Fianzas</h2>
          <table>
            <thead>
              <tr><th>Tipo</th><th>Valor</th><th>Desde</th><th>Hasta</th></tr>
            </thead>
            <tbody>
              ${(data.fianzas || []).map(f =>
                `<tr>
                  <td>${f.tipo}</td>
                  <td>${f.valor}</td>
                  <td>${f.desde}</td>
                  <td>${f.hasta}</td>
                </tr>`).join('')}
            </tbody>
          </table>

          <h2>Costos</h2>
          <p><b>Total Afianzado:</b> ${data.total_afianzado}</p>
          <p><b>Costo Neto:</b> ${data.costo_neto}</p>
          <p><b>Costos Admin:</b> ${data.costos_admin}</p>
          <p><b>IVA:</b> ${data.iva}</p>
          <p><b>Total a Pagar:</b> ${data.total_pagar}</p>

          <h2>Otros</h2>
          <p><b>Clave:</b> ${data.clave}</p>
          <p><b>Asesor:</b> ${data.asesor}</p>
          <p><b>% Participación:</b> ${data.participacion}</p>
          <p><b>Centro PDR:</b> ${data.centro_pdr}</p>
        </body>
      </html>
    `;

    // 🚀 Puppeteer con Chromium incluido en node_modules
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage'
      ]
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({ format: 'A4' });
    await browser.close();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="certificado_${data.documento_fianza || 'certificado'}.pdf"`,
    });
    res.send(pdfBuffer);

  } catch (err) {
    console.error('Error en /generar-certificado:', err);
    res.status(500).json({ mensaje: 'Error generando certificado', detalle: err.message });
  }
});

module.exports = router;
