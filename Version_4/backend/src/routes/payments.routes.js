// backend/src/routes/payments.routes.js
const express = require("express");
const { pool } = require("../db");

const Stripe = require("stripe");
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
const stripe = stripeSecretKey ? Stripe(stripeSecretKey) : null;


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

// POST /api/pagos/crear-intento
// Crea un PaymentIntent en Stripe y devuelve el clientSecret
router.post("/crear-intento", async (req, res) => {
    if (!stripe) {
        return res.status(500).json({
            message: "Stripe no está configurado en el servidor."
        });
    }

    const { amount, appointmentId, clientName } = req.body;

    if (!amount || amount <= 0) {
        return res.status(400).json({
            message: "Monto inválido para el pago."
        });
    }

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(Number(amount) * 100), // Stripe trabaja en centavos
            currency: "mxn",
            automatic_payment_methods: {
                enabled: true
            },
            metadata: {
                appointmentId: appointmentId ? String(appointmentId) : "",
                clientName: clientName || ""
            }
        });

        res.json({
            clientSecret: paymentIntent.client_secret
        });
    } catch (error) {
        console.error("Error al crear PaymentIntent:", error);
        res.status(500).json({
            message: "No se pudo crear el intento de pago."
        });
    }
});


// POST /api/pagos
// Registra un pago y actualiza la cita correspondiente
// POST /api/pagos
// Registra un pago (tarjeta ya procesada en Stripe o efectivo) y actualiza la cita
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
        const nowStr = now.toISOString().slice(0, 19).replace("T", " ");

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
                nowStr
            ]
        );

        const paymentId = result.insertId;

        // 2) Actualizar estado de la cita:
        //    - estado: texto amigable
        //    - payment_status: campo nuevo en la tabla citas
        await connection.query(
            `UPDATE citas
             SET 
                estado = 'Con pago registrado',
                payment_status = 'pago_registrado'
             WHERE id = ?`,
            [appointmentId]
        );

        await connection.commit();

        const paymentResponse = {
            id: paymentId,
            appointmentId,
            clientName,
            method,
            amount,
            status: "Registrado",
            date: nowStr
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
