function verificarNumero() {
  const numero = document.getElementById("numeroInput").value.trim();
  const mensaje = document.getElementById("mensajeResultado");

  if (numero === "") {
    mensaje.textContent = "Por favor ingresa un número.";
    mensaje.style.color = "red";
    return;
  }

  fetch('http://localhost:3000/verificar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ numero })
  })
  .then(response => response.json())
  .then(data => {
    if (data.estado === "Aprobado") {
      mensaje.textContent = "✅ Aprobado";
      mensaje.style.color = "green";
    } else if (data.estado === "No aprobado") {  // ojo "No aprobado" con minúsculas
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
