// backend/src/routes/catalog.routes.js
const express = require("express");
const { pool } = require("../db");  // OJO: se desestructura { pool }

const router = express.Router();

// GET /api/catalogo
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
          id,
          nombre,
          descripcion,
          precio_base AS price,
          tipo,
          categoria,
          badge,
          imagen_url
       FROM productos
       WHERE activo = 1
       ORDER BY id ASC`
    );

    res.json(rows);
  } catch (error) {
    console.error("Error al obtener catálogo:", error);
    res.status(500).json({ message: "Error al obtener el catálogo" });
  }
});

module.exports = router;
