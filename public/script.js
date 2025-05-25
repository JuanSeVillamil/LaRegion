function verificarNumero() {
  const numero = document.getElementById("numeroInput").value.trim();
  const mensaje = document.getElementById("mensajeResultado");

  if (numero === "") {
    mensaje.textContent = "Por favor ingresa un número.";
    mensaje.style.color = "red";
    return;
  }

  // Detecta si estás en local o en producción
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
      mensaje.textContent = "✅ Aprobado";
      mensaje.style.color = "green";
    } else if (data.estado === "No aprobado") {
      mensaje.textContent = "❌ No Aprobado";
      mensaje.style.color = "red";
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

