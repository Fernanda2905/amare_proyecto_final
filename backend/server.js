const express = require("express");
const cors = require("cors");
const axios = require("axios");
const path = require("path");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

const headers = {
  Authorization: `Bearer ${AIRTABLE_TOKEN}`,
  "Content-Type": "application/json"
};

const tables = {
  clientes: {
    id: process.env.AIRTABLE_TABLE_CLIENTES,
    fields: [
      "id_cliente",
      "nombre",
      "apellido",
      "correo",
      "telefono",
      "preferencias_generales",
      "fecha_registro"
    ],
    writeFields: [
      "nombre",
      "apellido",
      "correo",
      "telefono",
      "preferencias_generales",
      "fecha_registro"
    ],
    orderField: "id_cliente"
  },

  servicios: {
    id: process.env.AIRTABLE_TABLE_SERVICIOS,
    fields: [
      "id_servicio",
      "nombre_servicio",
      "descripcion",
      "imagen_url",
      "precio_base",
      "orden",
      "estado"
    ],
    writeFields: [
      "nombre_servicio",
      "descripcion",
      "imagen_url",
      "precio_base",
      "orden",
      "estado"
    ],
    orderField: "orden"
  },

  paquetes: {
    id: process.env.AIRTABLE_TABLE_PAQUETES,
    fields: [
      "id_paquete",
      "nombre_paquete",
      "descripcion",
      "precio_base",
      "duracion_estimada",
      "caracteristicas",
      "destacado",
      "orden",
      "estado"
    ],
    writeFields: [
      "nombre_paquete",
      "descripcion",
      "precio_base",
      "duracion_estimada",
      "caracteristicas",
      "destacado",
      "orden",
      "estado"
    ],
    orderField: "orden"
  },

  tiposEvento: {
    id: process.env.AIRTABLE_TABLE_TIPOS_EVENTO,
    fields: [
      "id_tipo_evento",
      "nombre_tipo",
      "descripcion",
      "orden",
      "estado"
    ],
    writeFields: [
      "nombre_tipo",
      "descripcion",
      "orden",
      "estado"
    ],
    orderField: "orden"
  },

  solicitudes: {
    id: process.env.AIRTABLE_TABLE_SOLICITUDES,
    fields: [
      "id_solicitud",
      "nombre_cliente",
      "correo",
      "telefono",
      "tipo_evento",
      "paquete_interes",
      "fecha_evento",
      "cantidad_invitados",
      "presupuesto_estimado",
      "descripcion_evento",
      "estado_solicitud",
      "fecha_solicitud"
    ],
    writeFields: [
      "nombre_cliente",
      "correo",
      "telefono",
      "tipo_evento",
      "paquete_interes",
      "fecha_evento",
      "cantidad_invitados",
      "presupuesto_estimado",
      "descripcion_evento",
      "estado_solicitud",
      "fecha_solicitud"
    ],
    orderField: "id_solicitud"
  },

  galeria: {
    id: process.env.AIRTABLE_TABLE_GALERIA,
    fields: [
      "id_imagen",
      "titulo",
      "imagen_url",
      "descripcion_alt",
      "categoria",
      "orden",
      "estado"
    ],
    writeFields: [
      "titulo",
      "imagen_url",
      "descripcion_alt",
      "categoria",
      "orden",
      "estado"
    ],
    orderField: "orden"
  }
};

function getTableUrl(tableKey) {
  const table = tables[tableKey];

  if (!table || !table.id) {
    throw new Error(`No existe configuración para la tabla: ${tableKey}`);
  }

  return `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(table.id)}`;
}

function mapRecord(record, tableKey) {
  const table = tables[tableKey];

  const item = {
    recordId: record.id
  };

  table.fields.forEach((field) => {
    item[field] = record.fields[field] ?? "";
  });

  return item;
}

function cleanFields(body, tableKey) {
  const table = tables[tableKey];
  const fields = {};

  table.writeFields.forEach((field) => {
    if (body[field] !== undefined) {
      fields[field] = body[field];
    }
  });

  return fields;
}

async function listRecords(tableKey, options = {}) {
  const table = tables[tableKey];
  const url = getTableUrl(tableKey);

  const params = {};

  if (table.orderField) {
    params["sort[0][field]"] = table.orderField;
    params["sort[0][direction]"] = "asc";
  }

  if (options.onlyActive) {
    params.filterByFormula = "{estado}=1";
  }

  const response = await axios.get(url, {
    headers,
    params
  });

  return response.data.records.map((record) => mapRecord(record, tableKey));
}

function createCrudRoutes(routeName, tableKey) {
  app.get(`/api/${routeName}`, async (req, res) => {
    try {
      const data = await listRecords(tableKey);
      res.json(data);
    } catch (error) {
      console.error(`Error GET /api/${routeName}:`, error.response?.data || error.message);
      res.status(500).json({
        error: `Error al obtener ${routeName}`,
        detalle: error.response?.data || error.message
      });
    }
  });

  app.post(`/api/${routeName}`, async (req, res) => {
    try {
      const url = getTableUrl(tableKey);
      const fields = cleanFields(req.body, tableKey);

      const response = await axios.post(
        url,
        { fields },
        { headers }
      );

      res.json(mapRecord(response.data, tableKey));
    } catch (error) {
      console.error(`Error POST /api/${routeName}:`, error.response?.data || error.message);
      res.status(500).json({
        error: `Error al crear ${routeName}`,
        detalle: error.response?.data || error.message
      });
    }
  });

  app.patch(`/api/${routeName}/:recordId`, async (req, res) => {
    try {
      const { recordId } = req.params;
      const url = `${getTableUrl(tableKey)}/${recordId}`;
      const fields = cleanFields(req.body, tableKey);

      const response = await axios.patch(
        url,
        { fields },
        { headers }
      );

      res.json(mapRecord(response.data, tableKey));
    } catch (error) {
      console.error(`Error PATCH /api/${routeName}:`, error.response?.data || error.message);
      res.status(500).json({
        error: `Error al modificar ${routeName}`,
        detalle: error.response?.data || error.message
      });
    }
  });

  app.delete(`/api/${routeName}/:recordId`, async (req, res) => {
    try {
      const { recordId } = req.params;
      const url = `${getTableUrl(tableKey)}/${recordId}`;

      const response = await axios.delete(url, { headers });

      res.json(response.data);
    } catch (error) {
      console.error(`Error DELETE /api/${routeName}:`, error.response?.data || error.message);
      res.status(500).json({
        error: `Error al eliminar ${routeName}`,
        detalle: error.response?.data || error.message
      });
    }
  });
}

createCrudRoutes("clientes", "clientes");
createCrudRoutes("servicios", "servicios");
createCrudRoutes("paquetes", "paquetes");
createCrudRoutes("tipos-evento", "tiposEvento");
createCrudRoutes("solicitudes", "solicitudes");
createCrudRoutes("galeria", "galeria");

app.get("/api/public/servicios", async (req, res) => {
  try {
    const data = await listRecords("servicios", { onlyActive: true });
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error al obtener servicios públicos",
      detalle: error.response?.data || error.message
    });
  }
});

app.get("/api/public/paquetes", async (req, res) => {
  try {
    const data = await listRecords("paquetes", { onlyActive: true });
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error al obtener paquetes públicos",
      detalle: error.response?.data || error.message
    });
  }
});

app.get("/api/public/tipos-evento", async (req, res) => {
  try {
    const data = await listRecords("tiposEvento", { onlyActive: true });
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error al obtener tipos de evento públicos",
      detalle: error.response?.data || error.message
    });
  }
});

app.get("/api/public/galeria", async (req, res) => {
  try {
    const data = await listRecords("galeria", { onlyActive: true });
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: "Error al obtener galería pública",
      detalle: error.response?.data || error.message
    });
  }
});

app.post("/api/public/solicitudes", async (req, res) => {
  try {
    const url = getTableUrl("solicitudes");

    const today = new Date().toISOString().split("T")[0];

    const body = {
      ...req.body,
      estado_solicitud: req.body.estado_solicitud || "Nueva",
      fecha_solicitud: req.body.fecha_solicitud || today
    };

    const fields = cleanFields(body, "solicitudes");

    const response = await axios.post(
      url,
      { fields },
      { headers }
    );

    res.json(mapRecord(response.data, "solicitudes"));
  } catch (error) {
    console.error("Error POST /api/public/solicitudes:", error.response?.data || error.message);
    res.status(500).json({
      error: "Error al registrar la solicitud",
      detalle: error.response?.data || error.message
    });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor funcionando en http://localhost:${PORT}`);
});