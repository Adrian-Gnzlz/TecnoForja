// backend/src/routes/payments.routes.js
const express = require("express");
const { pool } = require("../db");

const router = express.Router();

// GET /api/pagos
router.get("/", async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, cita_id AS appointmentId, nombre_cliente AS clientName,
                    metodo AS method, monto AS amount, estado AS status,
                    DATE_FORMAT(fecha_registro, '%Y-%m-%d %H:%i:%s') AS date
             FROM pagos
             ORDER BY fecha_registro DESC`
        );

        res.json(rows);
    } catch (error) {
        console.error("Error al listar pagos:", error);
        res.status(500).json({ message: "Error al listar pagos" });
    }
});

// POST /api/pagos
router.post("/", async (req, res) => {
    const { appointmentId, clientName, method, amount } = req.body;

    if (!appointmentId || !clientName || !method) {
        return res.status(400).json({
            message: "Faltan datos obligatorios (cita, nombre, método)."
        });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const montoFinal = amount || 0;

        const [result] = await connection.query(
            `INSERT INTO pagos (cita_id, nombre_cliente, metodo, monto, estado, fecha_registro)
             VALUES (?, ?, ?, ?, 'Registrado', NOW())`,
            [appointmentId, clientName, method, montoFinal]
        );

        await connection.query(
            "UPDATE citas SET estado = 'Con pago registrado', monto_estimado = ? WHERE id = ?",
            [montoFinal, appointmentId]
        );

        await connection.commit();

        const now = new Date();
        const paymentResponse = {
            id: result.insertId,
            appointmentId,
            clientName,
            method,
            amount: montoFinal,
            status: "Registrado",
            date: now.toISOString().slice(0, 19).replace("T", " ")
        };

        res.status(201).json(paymentResponse);
    } catch (error) {
        await connection.rollback();
        console.error("Error al registrar pago:", error);
        res.status(500).json({ message: "Error al registrar el pago" });
    } finally {
        connection.release();
    }
});

module.exports = router;
