function verificarNumero() {
  const numero = document.getElementById("numeroInput").value.trim();
  const mensaje = document.getElementById("mensajeResultado");

  if (numero === "") {
    mensaje.textContent = "Por favor ingresa un número.";
    mensaje.style.color = "red";
    return;
  }

  const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://laregion.onrender.com';

  fetch(`${API_URL}/verificar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ numero })
  })
  .then(response => response.json())
  .then(data => {
    if (data.estado === "Aprobado") {
      mensaje.innerHTML = `
        <p style="color: green;">✅ Aprobado</p>
        <p><strong>Tomador:</strong> ${data.tomador || 'N/A'}</p>
        <p><strong>Asegurado:</strong> ${data.asegurado || 'N/A'}</p>
      `;
    } else if (data.estado === "No aprobado") {
      mensaje.innerHTML = `
        <p style="color: red;">❌ No Aprobado</p>
        <p><strong>Tomador:</strong> ${data.tomador || 'N/A'}</p>
        <p><strong>Asegurado:</strong> ${data.asegurado || 'N/A'}</p>
      `;
    } else {
      mensaje.textContent = "⚠️ Número no encontrado";
      mensaje.style.color = "orange";
    }
  })
  .catch(error => {
    console.error("Error al consultar:", error);
    mensaje.textContent = "Error al conectar con el servidor.";
    mensaje.style.color = "red";
  });
}

