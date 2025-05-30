function verificarNumero() {
  const numero = document.getElementById("numeroInput").value.trim();
  const mensaje = document.getElementById("mensajeResultado");
  const infoBox = document.getElementById("infoAdicional");

  // Limpia resultados anteriores
  mensaje.textContent = "";
  infoBox.style.display = "none";
  infoBox.innerHTML = ""; // Limpiar contenido previo

  if (numero === "") {
    mensaje.textContent = "Por favor ingresa un número.";
    mensaje.style.color = "red";
    return;
  }

  const API_URL = ['localhost', 'www.afianzadoralaregional.com', 'afianzadoralaregional.com'].includes(window.location.hostname)
    ? 'https://laregion.onrender.com'
    : 'https://laregion.onrender.com';

  fetch(`${API_URL}/verificar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ numero })
  })
    .then(response => response.json())
    .then(data => {
      // Función para capitalizar cada palabra
      function capitalizarNombre(str = '') {
        return str.replace(/\b\w/g, c => c.toUpperCase());
      }

      // Mostrar estado aprobado o no aprobado
      if (data.estado === "Aprobado") {
        mensaje.textContent = "✅ APROBADO";
        mensaje.style.color = "#4CAF50";
        mensaje.style.fontWeight = "bold";
        mensaje.style.fontSize = "1.4rem";
      } else if (data.estado === "No aprobado") {
        mensaje.textContent = "❌ NO APROBADO";
        mensaje.style.color = "red";
        mensaje.style.fontWeight = "bold";
        mensaje.style.fontSize = "1.4rem";
      } else {
        mensaje.textContent = "⚠️ Número no encontrado";
        mensaje.style.color = "orange";
        mensaje.style.fontWeight = "normal";
        mensaje.style.fontSize = "1.1rem";
      }

      // Mostrar datos adicionales
      if (data.contratante || data.beneficiario || data.contratante_direccion || data.contratante_ciudad || data.fecha_expedicion) {
        infoBox.style.display = "block";

        // Formatea la fecha si existe
        let fechaFormateada = '---';
        if (data.fecha_expedicion) {
          const [año, mes, día] = data.fecha_expedicion.split('T')[0].split('-');
          fechaFormateada = `${día}/${mes}/${año}`;
        }


        infoBox.innerHTML = `
          <div class="resultado-item"><span class="etiqueta">Contratante:</span> <span class="valor">${capitalizarNombre(data.contratante || '---')}</span></div>
          <div class="resultado-item"><span class="etiqueta">Beneficiario:</span> <span class="valor">${capitalizarNombre(data.beneficiario || '---')}</span></div>
          <div class="resultado-item"><span class="etiqueta">Dirección:</span> <span class="valor">${data.contratante_direccion || '---'}</span></div>
          <div class="resultado-item"><span class="etiqueta">Ciudad:</span> <span class="valor">${capitalizarNombre(data.contratante_ciudad || '---')}</span></div>
          <div class="resultado-item"><span class="etiqueta">Fecha de expedición:</span> <span class="valor">${fechaFormateada}</span></div>
        `;
      } else {
        infoBox.style.display = "none";
      }
    })
    .catch(error => {
      console.error("Error al consultar:", error);
      mensaje.textContent = "Error al conectar con el servidor.";
      mensaje.style.color = "red";
    });
}
