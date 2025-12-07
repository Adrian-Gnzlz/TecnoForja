// backend/src/routes/payments.routes.js
const express = require("express");
const { pool } = require("../db");

const router = express.Router();

// GET /api/pagos
router.get("/", async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT 
                p.id,
                p.cita_id AS appointmentId,
                p.nombre_cliente AS clientName,
                p.metodo AS method,
                p.monto AS amount,
                p.estado AS status,
                DATE_FORMAT(p.fecha_registro, '%Y-%m-%d %H:%i:%s') AS date
             FROM pagos p
             ORDER BY p.fecha_registro DESC`
        );

        res.json(rows);
    } catch (error) {
        console.error("Error al listar pagos:", error);
        res.status(500).json({ message: "Error al obtener los pagos" });
    }
});

// POST /api/pagos
// Registra un pago y actualiza la cita correspondiente
router.post("/", async (req, res) => {
    const { appointmentId, clientName, method, amount } = req.body;

    if (!appointmentId || !clientName || !method || !amount) {
        return res.status(400).json({
            message: "Faltan datos para registrar el pago."
        });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const now = new Date();

        // 1) Insertar registro en pagos
        const [result] = await connection.query(
            `INSERT INTO pagos (
                cita_id,
                nombre_cliente,
                metodo,
                monto,
                estado,
                fecha_registro
            ) VALUES (?, ?, ?, ?, 'Registrado', ?)`,
            [
                appointmentId,
                clientName,
                method,
                amount,
                now.toISOString().slice(0, 19).replace("T", " ")
            ]
        );

        const paymentId = result.insertId;

        // 2) Actualizar estado de la cita:
        //    - estado (texto antiguo) lo dejamos como "Con pago registrado" por compatibilidad
        //    - estado_pago pasa a "pago_registrado"
        //    - monto_pagado se incrementa con el nuevo pago
        //    - monto_presupuestado se actualiza con el monto total del pago actual (si quieres otra lógica, se ajusta)
        await connection.query(
            `UPDATE citas
             SET 
                estado = 'Con pago registrado',
                estado_pago = 'pago_registrado',
                monto_pagado = monto_pagado + ?,
                monto_presupuestado = ?
             WHERE id = ?`,
            [amount, amount, appointmentId]
        );

        await connection.commit();

        const paymentResponse = {
            id: paymentId,
            appointmentId,
            clientName,
            method,
            amount,
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
