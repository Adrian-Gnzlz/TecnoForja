// backend/src/app.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const catalogRoutes = require("./routes/catalog.routes");
const appointmentsRoutes = require("./routes/appointments.routes");
const paymentsRoutes = require("./routes/payments.routes");

const app = express();

app.use(cors());
app.use(express.json());

// Servir frontend y assets estáticos
const path = require("path");
const frontendPath = path.join(__dirname, "..", "frontend");

app.use(express.static(frontendPath));
app.use("/assets", express.static(path.join(frontendPath, "assets")));

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
