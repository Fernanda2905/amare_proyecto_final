const axios = require("axios");

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "tencent/hy3";
const MAX_HISTORY_MESSAGES = 30;
const MAX_MESSAGE_LENGTH = 1000;

function normalizeText(value, maxLength = 500) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeText(item, 120))
    .filter(Boolean)
    .slice(0, 20);
}

function normalizeEventData(value = {}) {
  const data =
    value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {};

  return {
    tipo_evento: normalizeText(data.tipo_evento, 120),
    fecha: normalizeText(data.fecha, 120),
    ubicacion: normalizeText(data.ubicacion, 160),
    invitados: normalizeNumber(data.invitados),
    presupuesto: normalizeNumber(data.presupuesto),
    estilo: normalizeText(data.estilo, 160),
    servicios: normalizeStringArray(data.servicios),
    observaciones: normalizeText(data.observaciones, 600)
  };
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
- Recopila progresivamente: tipo de evento, fecha, cantidad de invitados, ubicación, presupuesto, estilo y servicios deseados.
- Acepta respuestas breves como "40", "sí", "no", "500" o "Cuenca" usando el contexto de la conversación.
- Si el cliente cambia un dato, reemplaza el valor anterior por el nuevo.
- No solicites datos sensibles ni información de pago.
- No confirmes reservas ni pagos.
- Si ya hay suficiente información, resume la solicitud y recomienda continuar por el formulario de cotización o WhatsApp.
- Mantén las respuestas breves y completas.
- Nunca termines una frase, pregunta o lista de forma incompleta.
- No menciones OpenRouter, Airtable ni que eres un modelo de lenguaje.
- No utilices Markdown, negritas con asteriscos, títulos con #, bloques de código ni texto antes o después del JSON.
- Si la consulta no está relacionada con AMARÉ o con la organización de eventos, redirígela amablemente.

FORMATO OBLIGATORIO:

Devuelve exclusivamente un objeto JSON válido con esta estructura:

{
  "response": "Mensaje breve y completo que verá el cliente",
  "eventData": {
    "tipo_evento": "",
    "fecha": "",
    "ubicacion": "",
    "invitados": null,
    "presupuesto": null,
    "estilo": "",
    "servicios": [],
    "observaciones": ""
  }
}

REGLAS PARA eventData:
- Conserva los datos de la ficha actual.
- Actualiza solamente los datos nuevos o corregidos.
- No inventes información.
- Usa null cuando invitados o presupuesto todavía no se conozcan.
- Usa texto vacío cuando un dato textual todavía no se conozca.
- Usa una lista vacía cuando todavía no existan servicios.
- response debe incluir máximo dos preguntas.

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

function parseAssistantResult(text, fallbackEventData = {}) {
  if (!text) {
    throw new Error("La IA no devolvió contenido.");
  }

  const cleanedText = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const firstBrace = cleanedText.indexOf("{");
  const lastBrace = cleanedText.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    console.warn(
      "La IA no devolvió JSON reconocible. Se conservará la ficha actual."
    );

    return {
      response: cleanedText,
      eventData: normalizeEventData(fallbackEventData)
    };
  }

  const jsonText = cleanedText.slice(firstBrace, lastBrace + 1);

  try {
    const parsed = JSON.parse(jsonText);

    return {
      response:
        typeof parsed.response === "string" && parsed.response.trim()
          ? parsed.response.trim()
          : "Cuéntame un poco más sobre el evento que deseas organizar.",
      eventData: normalizeEventData(parsed.eventData)
    };
  } catch (error) {
    console.error("JSON inválido recibido:", jsonText);

    return {
      response:
        "No pude interpretar completamente la respuesta. Cuéntame de nuevo el último dato para continuar.",
      eventData: normalizeEventData(fallbackEventData)
    };
  }
}

function mergeEventData(currentEventData, newEventData) {
  const current = normalizeEventData(currentEventData);
  const incoming = normalizeEventData(newEventData);

  return {
    tipo_evento: incoming.tipo_evento || current.tipo_evento,
    fecha: incoming.fecha || current.fecha,
    ubicacion: incoming.ubicacion || current.ubicacion,
    invitados:
      incoming.invitados !== null ? incoming.invitados : current.invitados,
    presupuesto:
      incoming.presupuesto !== null
        ? incoming.presupuesto
        : current.presupuesto,
    estilo: incoming.estilo || current.estilo,
    servicios: incoming.servicios.length
      ? incoming.servicios
      : current.servicios,
    observaciones: incoming.observaciones || current.observaciones
  };
}

function isReadyForQuote(eventData) {
  return Boolean(
    eventData.tipo_evento &&
      eventData.fecha &&
      eventData.ubicacion &&
      Number.isFinite(eventData.invitados) &&
      eventData.invitados > 0 &&
      Number.isFinite(eventData.presupuesto) &&
      eventData.presupuesto > 0 &&
      eventData.estilo &&
      Array.isArray(eventData.servicios) &&
      eventData.servicios.length > 0
  );
}



function isExplicitConfirmation(message) {
  const text = normalizeText(message).toLowerCase();

  const negativeWords = [
    "no",
    "cambiar",
    "cambio",
    "modificar",
    "incorrecto",
    "corregir"
  ];

  const hasNegativeWord = negativeWords.some((word) =>
    text.includes(word)
  );

  if (hasNegativeWord) {
    return false;
  }

  const confirmations = [
    "si",
    "sí",
    "correcto",
    "confirmo",
    "confirmado",
    "todo correcto",
    "está bien",
    "esta bien",
    "perfecto",
    "listo",
    "dale",
    "ok",
    "okay"
  ];

  return confirmations.some((confirmation) =>
    text.includes(confirmation)
  );
}

function buildEventSummary(eventData) {
  const services =
    Array.isArray(eventData.servicios) &&
    eventData.servicios.length > 0
      ? eventData.servicios.join(", ")
      : "Por definir";

  return [
    "¡Perfecto! ✨ Antes de continuar, revisa el resumen de tu evento:",
    "",
    `• Tipo de evento: ${eventData.tipo_evento || "Por definir"}`,
    `• Fecha: ${eventData.fecha || "Por definir"}`,
    `• Ubicación: ${eventData.ubicacion || "Por definir"}`,
    `• Invitados: ${eventData.invitados ?? "Por definir"}`,
    `• Presupuesto: ${
      eventData.presupuesto
        ? `$${eventData.presupuesto}`
        : "Por definir"
    }`,
    `• Estilo: ${eventData.estilo || "Por definir"}`,
    `• Servicios: ${services}`,
    "",
    "¿Todo está correcto? Puedes responder “sí” o indicarme qué deseas modificar."
  ].join("\n");
}

function buildSummary(eventData) {
  return [
    "¡Perfecto! Antes de continuar revisa este resumen:",
    "",
    `• Evento: ${eventData.tipo_evento}`,
    `• Fecha: ${eventData.fecha}`,
    `• Lugar: ${eventData.ubicacion}`,
    `• Invitados: ${eventData.invitados}`,
    `• Presupuesto: $${eventData.presupuesto}`,
    "",
    "¿Todo está correcto?"
  ].join("\n");
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
    const currentEventData = normalizeEventData(req.body?.eventData);
const awaitingConfirmation = Boolean(
  req.body?.awaitingConfirmation
);

if (
  awaitingConfirmation &&
  isReadyForQuote(currentEventData) &&
  isExplicitConfirmation(message)
) {
  return res.json({
    response:
      "¡Perfecto! Tu información ha sido confirmada. Ya puedes solicitar la cotización o escribirnos por WhatsApp. ✨",
    eventData: currentEventData,
    awaitingConfirmation: false,
    confirmedByClient: true,
    readyForQuote: true,
    model
  });
}

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
              content: `
FICHA ACTUAL DEL EVENTO:
${JSON.stringify(currentEventData, null, 2)}

NUEVO MENSAJE DEL CLIENTE:
${message}
`.trim()
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
        "Modelo:",
        openRouterResponse.data?.model,
        "| Estado:",
        openRouterResponse.data?.choices?.[0]?.finish_reason
      );

      const responseText = extractResponseText(openRouterResponse.data);

      if (!responseText) {
        throw new Error("OpenRouter no devolvió texto.");
      }

      const assistantResult = parseAssistantResult(
        responseText,
        currentEventData
      );

      const mergedEventData = mergeEventData(
        currentEventData,
        assistantResult.eventData
      );

const readyForQuote = isReadyForQuote(mergedEventData);

if (readyForQuote) {
  return res.json({
    response: buildEventSummary(mergedEventData),
    eventData: mergedEventData,
    awaitingConfirmation: true,
    confirmedByClient: false,
    readyForQuote: false,
    model: openRouterResponse.data?.model || model
  });
}

return res.json({
  response: assistantResult.response,
  eventData: mergedEventData,
  awaitingConfirmation: false,
  confirmedByClient: false,
  readyForQuote: false,
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
