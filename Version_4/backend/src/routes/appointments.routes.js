// backend/src/routes/appointments.routes.js
const express = require("express");
const { pool } = require("../db");

const router = express.Router();

// GET /api/citas
router.get("/", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT id, fecha AS date, hora AS time, nombre_cliente AS clientName, telefono AS phone, correo AS email, direccion AS address, comentarios AS comments, monto_estimado AS estimatedAmount, estado AS status FROM citas ORDER BY fecha DESC, hora DESC"
        );

        res.json(rows);
    } catch (error) {
        console.error("Error al listar citas:", error);
        res.status(500).json({ message: "Error al listar citas" });
    }
});

// POST /api/citas
router.post("/", async (req, res) => {
    const {
        date,
        time,
        clientName,
        phone,
        email,
        address,
        comments,
        items,
        estimatedAmount
    } = req.body;

    if (!date || !time || !clientName || !phone || !address) {
        return res.status(400).json({
            message: "Faltan datos obligatorios (fecha, hora, nombre, teléfono, dirección)."
        });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [result] = await connection.query(
            `INSERT INTO citas 
            (fecha, hora, nombre_cliente, telefono, correo, direccion, comentarios, monto_estimado, estado, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente', NOW())`,
            [date, time, clientName, phone, email || "", address, comments || "", estimatedAmount || 0]
        );

        const appointmentId = result.insertId;

        if (Array.isArray(items)) {
            for (const item of items) {
                await connection.query(
                    `INSERT INTO cita_items (cita_id, producto_id, nombre_producto, precio_unitario)
                     VALUES (?, ?, ?, ?)`,
                    [
                        appointmentId,
                        item.id || null,
                        item.name || "",
                        item.price || 0
                    ]
                );
            }
        }

        await connection.commit();

        const appointmentResponse = {
            id: appointmentId,
            date,
            time,
            clientName,
            phone,
            email: email || "",
            address,
            comments: comments || "",
            estimatedAmount: estimatedAmount || 0,
            status: "Pendiente"
        };

        res.status(201).json(appointmentResponse);
    } catch (error) {
        await connection.rollback();
        console.error("Error al crear cita:", error);
        res.status(500).json({ message: "Error al crear la cita" });
    } finally {
        connection.release();
    }
});

module.exports = router;
