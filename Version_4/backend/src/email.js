// backend/src/email.js
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

// Transporter configurado con Brevo
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : 587,
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Envía el correo de confirmación de cita
async function sendAppointmentConfirmationEmail(appointment) {
    const {
        folio,
        clientName,
        email,
        date,
        time,
        address,
        estimatedAmount
    } = appointment;

    if (!email) {
        console.log("Cita creada sin correo electrónico, no se envía email.");
        return;
    }

    const subject = `Confirmación de cita TecnoForja - Folio ${folio}`;

    const textBody = `
Hola ${clientName},

Tu cita en TecnoForja ha sido registrada correctamente.

Datos de la cita:
Folio: ${folio}
Fecha: ${date}
Hora: ${time}
Dirección del servicio: ${address}
Monto estimado (si aplica): ${estimatedAmount} MXN

Con este folio podrás:
- Consultar el estado de tu cita.
- Realizar el pago más adelante dentro de la página web en la sección de pagos.

Si tienes alguna duda, responde a este correo o contáctanos directamente.

Gracias por confiar en TecnoForja.
`;

    const htmlBody = `
<p>Hola ${clientName},</p>
<p>Tu cita en TecnoForja ha sido registrada correctamente.</p>

<p>Datos de la cita:</p>
<ul>
  <li><strong>Folio:</strong> ${folio}</li>
  <li><strong>Fecha:</strong> ${date}</li>
  <li><strong>Hora:</strong> ${time}</li>
  <li><strong>Dirección del servicio:</strong> ${address}</li>
  <li><strong>Monto estimado (si aplica):</strong> ${estimatedAmount} MXN</li>
</ul>

<p>Con este folio podrás:</p>
<ul>
  <li>Consultar el estado de tu cita.</li>
  <li>Realizar el pago más adelante dentro de la página web en la sección de pagos.</li>
</ul>

<p>Si tienes alguna duda, responde a este correo o contáctanos directamente.</p>

<p>Gracias por confiar en TecnoForja.</p>
`;

    const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: subject,
        text: textBody,
        html: htmlBody
    };

    console.log("Enviando correo de confirmación a:", email, "con folio:", folio);

    await transporter.sendMail(mailOptions);
}

module.exports = {
    sendAppointmentConfirmationEmail
};
