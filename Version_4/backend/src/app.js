// backend/src/app.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");                   // ← AGREGADO

dotenv.config();

const catalogRoutes = require("./routes/catalog.routes");
const appointmentsRoutes = require("./routes/appointments.routes");
const paymentsRoutes = require("./routes/payments.routes");

const app = express();

app.use(cors());
app.use(express.json());

// =======================================
// SERVIR ARCHIVOS ESTÁTICOS DEL FRONTEND
// =======================================

// Ruta absoluta a la carpeta backend/src
const rootDir = path.resolve(__dirname, "..");     

// Servir TODO el frontend
app.use(express.static(path.join(rootDir, "frontend")));

// Servir explícitamente la carpeta de imágenes
app.use("/assets", express.static(path.join(rootDir, "frontend/assets")));


// =======================================
// RUTAS API
// =======================================

app.get("/api/status", (req, res) => {
    res.json({ status: "ok", message: "API TecnoForja funcionando" });
});

app.use("/api/catalogo", catalogRoutes);
app.use("/api/citas", appointmentsRoutes);
app.use("/api/pagos", paymentsRoutes);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`Servidor TecnoForja API escuchando en el puerto ${PORT}`);
});
