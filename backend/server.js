const express = require("express");
const cors = require("cors");
const axios = require("axios");
const path = require("path");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// Servir archivos del frontend
app.use(express.static(path.join(__dirname, "../frontend")));

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME;

const airtableURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`;

const headers = {
  Authorization: `Bearer ${AIRTABLE_TOKEN}`,
  "Content-Type": "application/json"
};

// Ruta principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// Obtener clientes
app.get("/api/clientes", async (req, res) => {
  try {
    const response = await axios.get(airtableURL, { headers });

    const clientes = response.data.records.map((record) => ({
      recordId: record.id,
      id_cliente: record.fields.id_cliente || "",
      nombre: record.fields.nombre || "",
      apellido: record.fields.apellido || "",
      correo: record.fields.correo || "",
      telefono: record.fields.telefono || "",
      preferencias_generales: record.fields.preferencias_generales || "",
      fecha_registro: record.fields.fecha_registro || ""
    }));

    res.json(clientes);
  } catch (error) {
    console.error("Error al obtener clientes:", error.response?.data || error.message);
    res.status(500).json({
      error: "Error al obtener clientes",
      detalle: error.response?.data || error.message
    });
  }
});

// Insertar cliente
app.post("/api/clientes", async (req, res) => {
  try {
    const {
      nombre,
      apellido,
      correo,
      telefono,
      preferencias_generales,
      fecha_registro
    } = req.body;

    const response = await axios.post(
      airtableURL,
      {
        fields: {
          nombre,
          apellido,
          correo,
          telefono,
          preferencias_generales,
          fecha_registro
        }
      },
      { headers }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error al insertar cliente:", error.response?.data || error.message);
    res.status(500).json({
      error: "Error al insertar cliente",
      detalle: error.response?.data || error.message
    });
  }
});

// Modificar cliente
app.patch("/api/clientes/:recordId", async (req, res) => {
  try {
    const { recordId } = req.params;

    const {
      nombre,
      apellido,
      correo,
      telefono,
      preferencias_generales,
      fecha_registro
    } = req.body;

    const response = await axios.patch(
      `${airtableURL}/${recordId}`,
      {
        fields: {
          nombre,
          apellido,
          correo,
          telefono,
          preferencias_generales,
          fecha_registro
        }
      },
      { headers }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error al modificar cliente:", error.response?.data || error.message);
    res.status(500).json({
      error: "Error al modificar cliente",
      detalle: error.response?.data || error.message
    });
  }
});

// Eliminar cliente
app.delete("/api/clientes/:recordId", async (req, res) => {
  try {
    const { recordId } = req.params;

    const response = await axios.delete(`${airtableURL}/${recordId}`, { headers });

    res.json(response.data);
  } catch (error) {
    console.error("Error al eliminar cliente:", error.response?.data || error.message);
    res.status(500).json({
      error: "Error al eliminar cliente",
      detalle: error.response?.data || error.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor funcionando en http://localhost:${PORT}`);
});