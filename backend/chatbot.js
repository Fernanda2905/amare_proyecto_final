const axios = require("axios");

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openrouter/free";
const MAX_HISTORY_MESSAGES = 30;
const MAX_MESSAGE_LENGTH = 1000;

function normalizeText(value, maxLength = 500) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeHistory(history, currentMessage) {
  if (!Array.isArray(history)) return [];

  const cleaned = history
    .filter((item) => item && ["user", "assistant"].includes(item.role))
    .map((item) => ({
      role: item.role,
      content: normalizeText(item.content, 1500)
    }))
    .filter((item) => item.content)
    .slice(-MAX_HISTORY_MESSAGES);

  const last = cleaned[cleaned.length - 1];

  if (
    last &&
    last.role === "user" &&
    last.content.toLowerCase() === currentMessage.toLowerCase()
  ) {
    cleaned.pop();
  }

  return cleaned;
}

function formatList(title, items, formatter) {
  if (!items.length) {
    return `${title}: no hay información disponible en este momento.`;
  }

  return [
    `${title}:`,
    ...items.slice(0, 20).map((item, index) => `${index + 1}. ${formatter(item)}`)
  ].join("\n");
}

function formatPrice(value) {
  if (value === "" || value === null || value === undefined) {
    return "precio no especificado";
  }

  return `precio base: ${normalizeText(value, 80)}`;
}

async function getAmareKnowledge(listRecords) {
  async function safeList(tableKey) {
    try {
      return await listRecords(tableKey, { onlyActive: true });
    } catch (error) {
      console.warn(
        `No se pudo consultar ${tableKey} para el chatbot:`,
        error.response?.data || error.message
      );
      return [];
    }
  }

  const [servicios, paquetes, tiposEvento] = await Promise.all([
    safeList("servicios"),
    safeList("paquetes"),
    safeList("tiposEvento")
  ]);

  return [
    "INFORMACIÓN ACTUAL DE AMARÉ",
    "",
    formatList("Servicios disponibles", servicios, (item) => {
      const nombre = normalizeText(item.nombre_servicio, 120) || "Servicio";
      const descripcion = normalizeText(item.descripcion, 350);
      const precio = formatPrice(item.precio_base);

      return [nombre, descripcion, precio].filter(Boolean).join(" — ");
    }),
    "",
    formatList("Paquetes disponibles", paquetes, (item) => {
      const nombre = normalizeText(item.nombre_paquete, 120) || "Paquete";
      const descripcion = normalizeText(item.descripcion, 350);
      const caracteristicas = normalizeText(item.caracteristicas, 350);
      const duracion = normalizeText(item.duracion_estimada, 100);
      const precio = formatPrice(item.precio_base);

      return [
        nombre,
        descripcion,
        caracteristicas ? `incluye: ${caracteristicas}` : "",
        duracion ? `duración estimada: ${duracion}` : "",
        precio
      ]
        .filter(Boolean)
        .join(" — ");
    }),
    "",
    formatList("Tipos de evento disponibles", tiposEvento, (item) => {
      const nombre = normalizeText(item.nombre_tipo, 120) || "Tipo de evento";
      const descripcion = normalizeText(item.descripcion, 350);

      return [nombre, descripcion].filter(Boolean).join(" — ");
    })
  ].join("\n");
}

function buildSystemPrompt(knowledge) {
  return `
Eres el asistente virtual oficial de AMARÉ, una empresa dedicada a organizar eventos y experiencias personalizadas.

Tu objetivo es orientar al cliente, comprender su idea y ayudarle a identificar una opción adecuada dentro de los servicios y paquetes disponibles.

REGLAS OBLIGATORIAS:
- Responde en español con un tono cálido, juvenil, claro y profesional.
- Usa solamente la información empresarial incluida debajo.
- No inventes precios, servicios, promociones, fechas disponibles, reservas ni condiciones.
- Cuando falte un dato, indica que debe confirmarlo el equipo humano de AMARÉ.
- Haz máximo una o dos preguntas por respuesta.
- Recopila progresivamente: tipo de evento, fecha, cantidad de invitados, ubicación, presupuesto y servicios deseados.
- No solicites datos sensibles ni información de pago.
- No confirmes reservas ni pagos.
- Si ya hay suficiente información, resume la solicitud y recomienda continuar por el formulario de cotización o WhatsApp.
- Mantén las respuestas breves y útiles, normalmente entre 2 y 5 párrafos cortos.
- Evita mencionar que eres un modelo de lenguaje, OpenRouter o Airtable.
- Si la consulta no está relacionada con AMARÉ o con la organización de eventos, redirígela amablemente al tema.
- Nunca termines una respuesta dejando una frase, pregunta o lista incompleta.
- Formula respuestas breves pero completas.
- No utilices Markdown.
- No uses **negritas**, # títulos, listas Markdown ni código.


${knowledge}
`.trim();
}

function extractResponseText(data) {
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item?.text === "string" ? item.text : ""))
      .join("\n")
      .trim();
  }

  return "";
}

module.exports = function registerChatbotRoutes(app, { listRecords }) {
  if (!app || typeof app.post !== "function") {
    throw new Error("No se recibió una aplicación Express válida.");
  }

  if (typeof listRecords !== "function") {
    throw new Error("No se recibió la función listRecords.");
  }

  app.post("/api/chat", async (req, res) => {
    const message = normalizeText(req.body?.message, MAX_MESSAGE_LENGTH);

   if (!message) {
  return res.status(400).json({
    error: "Escribe un mensaje antes de continuar."
  });
}

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return res.status(503).json({
        error:
          "El asistente todavía no está configurado. Falta OPENROUTER_API_KEY en backend/.env."
      });
    }

    const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
    const history = normalizeHistory(req.body?.history, message);

    try {
      const knowledge = await getAmareKnowledge(listRecords);
      const systemPrompt = buildSystemPrompt(knowledge);

      const openRouterResponse = await axios.post(
        OPENROUTER_API_URL,
        {
          model,
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            ...history,
            {
              role: "user",
              content: message
            }
          ],
          temperature: 0.3,
          max_completion_tokens: 800,
          reasoning_effort: "none",
          stream: false
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          timeout: 60000
        }
      );
console.log(
  JSON.stringify(openRouterResponse.data, null, 2)
);

      const responseText = extractResponseText(openRouterResponse.data);

      if (!responseText) {
        throw new Error("OpenRouter no devolvió texto.");
      }

      return res.json({
        response: responseText,
        model: openRouterResponse.data?.model || model
      });
    } catch (error) {
      const providerStatus = error.response?.status;

      console.error(
        "Error POST /api/chat:",
        error.response?.data || error.message
      );

      if (providerStatus === 401 || providerStatus === 403) {
        return res.status(502).json({
          error:
            "La clave de OpenRouter no es válida o no tiene permisos. Revisa backend/.env."
        });
      }

      if (providerStatus === 402) {
        return res.status(402).json({
          error:
            "OpenRouter no tiene saldo o acceso disponible para completar esta consulta."
        });
      }

      if (providerStatus === 429) {
        return res.status(429).json({
          error:
            "El asistente recibió demasiadas consultas. Intenta nuevamente en un momento."
        });
      }

      return res.status(502).json({
        error:
          "No fue posible obtener una respuesta del asistente en este momento."
      });
    }
  });
};
