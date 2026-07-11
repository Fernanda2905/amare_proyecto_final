const axios = require("axios");
require("dotenv").config();

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

const TABLES = {
  servicios: process.env.AIRTABLE_TABLE_SERVICIOS,
  paquetes: process.env.AIRTABLE_TABLE_PAQUETES,
  tiposEvento: process.env.AIRTABLE_TABLE_TIPOS_EVENTO,
  galeria: process.env.AIRTABLE_TABLE_GALERIA
};

const headers = {
  Authorization: `Bearer ${AIRTABLE_TOKEN}`,
  "Content-Type": "application/json"
};

function getUrl(tableId) {
  return `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableId)}`;
}

async function getRecords(tableId) {
  const response = await axios.get(getUrl(tableId), { headers });
  return response.data.records;
}

async function createRecord(tableId, fields) {
  const response = await axios.post(
    getUrl(tableId),
    { fields },
    { headers }
  );

  return response.data;
}

async function updateRecord(tableId, recordId, fields) {
  const response = await axios.patch(
    `${getUrl(tableId)}/${recordId}`,
    { fields },
    { headers }
  );

  return response.data;
}

async function deleteRecord(tableId, recordId) {
  const response = await axios.delete(
    `${getUrl(tableId)}/${recordId}`,
    { headers }
  );

  return response.data;
}

async function upsertByField({ tableId, uniqueField, records, label }) {
  console.log(`\nMigrando ${label}...`);

  const existingRecords = await getRecords(tableId);

  for (const record of existingRecords) {
    const value = record.fields[uniqueField];

    if (!value) {
      console.log(`Eliminando registro vacío en ${label}: ${record.id}`);
      await deleteRecord(tableId, record.id);
    }
  }

  const cleanExistingRecords = await getRecords(tableId);

  for (const item of records) {
    const existing = cleanExistingRecords.find(
      record => record.fields[uniqueField] === item[uniqueField]
    );

    if (existing) {
      await updateRecord(tableId, existing.id, item);
      console.log(`Actualizado: ${item[uniqueField]}`);
    } else {
      await createRecord(tableId, item);
      console.log(`Creado: ${item[uniqueField]}`);
    }
  }
}

const servicios = [
  {
    nombre_servicio: "Decoración & ambientación",
    descripcion: "Diseño de espacios, paleta de colores, flores, mesa principal, detalles visuales y montaje.",
    imagen_url: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80",
    precio_base: 80,
    orden: 1,
    estado: true
  },
  {
    nombre_servicio: "Planificación completa",
    descripcion: "Organización del evento desde la idea inicial hasta el día de la celebración.",
    imagen_url: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80",
    precio_base: 150,
    orden: 2,
    estado: true
  },
  {
    nombre_servicio: "Coordinación de proveedores",
    descripcion: "Apoyo con proveedores de catering, fotografía, repostería, música, mobiliario y más.",
    imagen_url: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=800&q=80",
    precio_base: 100,
    orden: 3,
    estado: true
  },
  {
    nombre_servicio: "Experiencias personalizadas",
    descripcion: "Eventos creados según tu historia: cumpleaños, pedidas, aniversarios, showers, cenas y celebraciones íntimas.",
    imagen_url: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=800&q=80",
    precio_base: 120,
    orden: 4,
    estado: true
  }
];

const paquetes = [
  {
    nombre_paquete: "Esencial",
    descripcion: "Una propuesta íntima y delicada para eventos pequeños.",
    precio_base: 120,
    duracion_estimada: "2 a 3 horas",
    caracteristicas: "Concepto visual base\nDecoración principal\nPaleta de color\nLista de detalles sugeridos",
    destacado: false,
    orden: 1,
    estado: true
  },
  {
    nombre_paquete: "Encanto",
    descripcion: "Para celebraciones con más presencia visual y acompañamiento.",
    precio_base: 220,
    duracion_estimada: "3 a 5 horas",
    caracteristicas: "Diseño de experiencia\nDecoración y mesa principal\nCoordinación de detalles\nPropuesta de proveedores",
    destacado: true,
    orden: 2,
    estado: true
  },
  {
    nombre_paquete: "AMARÉ Total",
    descripcion: "Organización completa para delegar el evento sin perder tu estilo.",
    precio_base: 350,
    duracion_estimada: "Servicio completo",
    caracteristicas: "Planificación completa\nProveedores y cronograma\nDiseño visual integral\nSeguimiento previo al evento",
    destacado: false,
    orden: 3,
    estado: true
  }
];

const tiposEvento = [
  {
    nombre_tipo: "Cumpleaños",
    descripcion: "Celebración personalizada para cumpleaños íntimos, juveniles o familiares.",
    orden: 1,
    estado: true
  },
  {
    nombre_tipo: "Boda",
    descripcion: "Evento romántico y elegante para ceremonias y celebraciones de boda.",
    orden: 2,
    estado: true
  },
  {
    nombre_tipo: "Aniversario",
    descripcion: "Experiencia especial para celebrar una fecha importante en pareja.",
    orden: 3,
    estado: true
  },
  {
    nombre_tipo: "Baby shower",
    descripcion: "Evento delicado y personalizado para celebrar la llegada de un bebé.",
    orden: 4,
    estado: true
  },
  {
    nombre_tipo: "Cena íntima",
    descripcion: "Experiencia pequeña, cuidada y estética para momentos especiales.",
    orden: 5,
    estado: true
  },
  {
    nombre_tipo: "Evento personalizado",
    descripcion: "Evento creado desde cero según la historia, presupuesto y estilo del cliente.",
    orden: 6,
    estado: true
  }
];

const galeria = [
  {
    titulo: "Mesa decorada para evento",
    imagen_url: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=700&q=80",
    descripcion_alt: "Mesa decorada para evento",
    categoria: "Inspiración",
    orden: 1,
    estado: true
  },
  {
    titulo: "Decoración de boda",
    imagen_url: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=700&q=80",
    descripcion_alt: "Decoración de boda",
    categoria: "Bodas",
    orden: 2,
    estado: true
  },
  {
    titulo: "Pastel de evento",
    imagen_url: "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=700&q=80",
    descripcion_alt: "Pastel de evento",
    categoria: "Detalles",
    orden: 3,
    estado: true
  },
  {
    titulo: "Copas rosadas de celebración",
    imagen_url: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=700&q=80",
    descripcion_alt: "Copas rosadas de celebración",
    categoria: "Celebración",
    orden: 4,
    estado: true
  },
  {
    titulo: "Invitación elegante",
    imagen_url: "https://images.unsplash.com/photo-1478146896981-b80fe463b330?auto=format&fit=crop&w=700&q=80",
    descripcion_alt: "Invitación elegante",
    categoria: "Papelería",
    orden: 5,
    estado: true
  },
  {
    titulo: "Mesa de cena elegante",
    imagen_url: "https://images.unsplash.com/photo-1505236858219-8359eb29e329?auto=format&fit=crop&w=700&q=80",
    descripcion_alt: "Mesa de cena elegante",
    categoria: "Cena íntima",
    orden: 6,
    estado: true
  }
];

async function runSeed() {
  try {
    if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
      throw new Error("Falta AIRTABLE_TOKEN o AIRTABLE_BASE_ID en el archivo .env");
    }

    for (const [name, tableId] of Object.entries(TABLES)) {
      if (!tableId) {
        throw new Error(`Falta configurar la tabla ${name} en el archivo .env`);
      }
    }

    await upsertByField({
      tableId: TABLES.servicios,
      uniqueField: "nombre_servicio",
      records: servicios,
      label: "SERVICIOS"
    });

    await upsertByField({
      tableId: TABLES.paquetes,
      uniqueField: "nombre_paquete",
      records: paquetes,
      label: "PAQUETES"
    });

    await upsertByField({
      tableId: TABLES.tiposEvento,
      uniqueField: "nombre_tipo",
      records: tiposEvento,
      label: "TIPOS_EVENTO"
    });

    await upsertByField({
      tableId: TABLES.galeria,
      uniqueField: "titulo",
      records: galeria,
      label: "GALERIA"
    });

    console.log("\nMigración completada correctamente.");
    console.log("Ahora revisa Airtable y luego abre http://localhost:3000/admin.html");
  } catch (error) {
    console.error("\nError durante la migración:");
    console.error(error.response?.data || error.message);
  }
}

runSeed();
