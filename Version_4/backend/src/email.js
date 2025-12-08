// backend/src/email.js

// Usamos fetch nativo de Node 18+ (no necesitamos axios)
const apiKey = process.env.BREVO_API_KEY;

// Exportamos en CommonJS porque el proyecto usa require()
async function sendAppointmentConfirmationEmail(to, folio, date, time, name, amount, address) {
  const htmlContent = `
    <p>Hola ${name},</p>
    <p>Tu cita en TecnoForja ha sido registrada correctamente.</p>
    <p><strong>Folio:</strong> ${folio}</p>
    <p><strong>Fecha:</strong> ${date}</p>
    <p><strong>Hora:</strong> ${time}</p>
    <p><strong>Dirección:</strong> ${address}</p>
    <p><strong>Monto estimado (si aplica):</strong> ${amount} MXN</p>
    <p>Gracias por confiar en TecnoForja.</p>
  `;

  const body = {
    sender: { name: "TecnoForja", email: "tecnoforja.parral@gmail.com" },
    to: [{ email: to }],
    subject: `Confirmación de cita - Folio ${folio}`,
    htmlContent: htmlContent
  };

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error("Error al enviar correo vía API:", response.status, errorText);
    throw new Error(`Error al enviar correo vía API: ${response.status}`);
  }

  console.log("Correo enviado vía API a:", to);
}

module.exports = {
  sendAppointmentConfirmationEmail,
};
