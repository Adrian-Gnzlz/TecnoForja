// backend/src/routes/appointments.routes.js
const express = require("express");
const { pool } = require("../db");
const { sendAppointmentConfirmationEmail } = require("../email");

const router = express.Router();


// Helper para generar el folio TF-AAAA-00001
function generateFolio(id, dateStr) {
    // dateStr viene como "YYYY-MM-DD"
    let year = "0000";
    if (typeof dateStr === "string" && dateStr.length >= 4) {
        year = dateStr.slice(0, 4);
    }
    const paddedId = String(id).padStart(5, "0");
    return `TF-${year}-${paddedId}`;
}

// GET /api/citas
// Devuelve las citas con los campos originales + los nuevos de BD
router.get("/", async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT 
                id,
                folio,
                fecha AS date,
                hora AS time,
                nombre_cliente AS clientName,
                telefono AS phone,
                correo AS email,
                direccion AS address,
                comentarios AS comments,
                monto_estimado AS estimatedAmount,
                estado AS status,
                work_status AS workStatus,
                payment_status AS paymentStatus,
                prioridad,
                admin_notes AS adminNotes
            FROM citas
            ORDER BY fecha DESC, hora DESC`
        );

        res.json(rows);
    } catch (error) {
        console.error("Error al listar citas:", error);
        res.status(500).json({ message: "Error al obtener las citas" });
    }
});

// POST /api/citas
// Crea la cita y los items asociados
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

    if (!date || !time || !clientName || !phone || !address || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            message: "Faltan datos obligatorios para registrar la cita."
        });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1) Insertar cita básica
        const [result] = await connection.query(
            `INSERT INTO citas (
                fecha,
                hora,
                nombre_cliente,
                telefono,
                correo,
                direccion,
                comentarios,
                monto_estimado,
                estado,
                work_status,
                payment_status,
                prioridad,
                admin_notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente', 'pendiente_visita', 'sin_pago', 'media', NULL)`,            
            [
                date,
                time,
                clientName,
                phone,
                email || "",
                address,
                comments || "",
                estimatedAmount || 0
            ]
        );

        const appointmentId = result.insertId;

        // 2) Generar y guardar folio
        const folio = generateFolio(appointmentId, date);
        await connection.query(
            "UPDATE citas SET folio = ? WHERE id = ?",
            [folio, appointmentId]
        );

        // 3) Insertar items de la cita
        if (Array.isArray(items)) {
            for (const item of items) {
                const productId = item.id || null;
                const name = item.name || "";
                const price = item.price || 0;

                await connection.query(
                    `INSERT INTO cita_items (
                        cita_id,
                        producto_id,
                        nombre_producto,
                        precio_unitario
                    ) VALUES (?, ?, ?, ?)`,
                    [appointmentId, productId, name, price]
                );
            }
        }

        await connection.commit();

        // 4) Respuesta al frontend (manteniendo forma anterior)
        const appointmentResponse = {
            id: appointmentId,
            folio,
            date,
            time,
            clientName,
            phone,
            email: email || "",
            address,
            comments: comments || "",
            estimatedAmount: estimatedAmount || 0,
            status: "Pendiente",          // compatibilidad con código actual
            workStatus: "pendiente_visita",
            paymentStatus: "sin_pago",
            priority: "media",
            adminNotes: null
        };

        try {
            await sendAppointmentConfirmationEmail(appointmentResponse);
        } catch (emailError) {
            console.error("Error al enviar correo de confirmación de cita:", emailError);
        }


        res.status(201).json(appointmentResponse);
    } catch (error) {
        await connection.rollback();
        console.error("Error al crear cita:", error);
        res.status(500).json({ message: "Error al crear la cita" });
    } finally {
        connection.release();
    }
});

// PUT /api/citas/:id
// Pensado para la vista de administrador: actualizar estado_trabajo, estado_pago, prioridad y notas_admin
router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const {
        workStatus,     // estado_trabajo
        paymentStatus,  // estado_pago
        priority,       // prioridad
        adminNotes      // notas_admin
    } = req.body;

    if (!id) {
        return res.status(400).json({ message: "Falta el id de la cita." });
    }

    try {
        await pool.query(
            `UPDATE citas
             SET
                work_status    = COALESCE(?, work_status),
                payment_status = COALESCE(?, payment_status),
                prioridad      = COALESCE(?, prioridad),
                admin_notes    = COALESCE(?, admin_notes)
             WHERE id = ?`,
            [
                workStatus || null,
                paymentStatus || null,
                priority || null,
                adminNotes !== undefined ? adminNotes : null,
                id
            ]
        );

        // Devolver la cita actualizada
        const [rows] = await pool.query(
            `SELECT 
                id,
                folio,
                fecha AS date,
                hora AS time,
                nombre_cliente AS clientName,
                telefono AS phone,
                correo AS email,
                direccion AS address,
                comentarios AS comments,
                monto_estimado AS estimatedAmount,
                estado AS status,
                work_status AS workStatus,
                payment_status AS PaymentStatus,
                prioridad,
                admin_notes AS adminNotes
            FROM citas
            WHERE id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Cita no encontrada" });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error("Error al actualizar cita:", error);
        res.status(500).json({ message: "Error al actualizar la cita" });
    }
});

module.exports = router;
