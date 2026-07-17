// AMARÉ | Chatbot conectado al backend Express

const aiChatForm = document.querySelector("#aiChatForm");
const aiChatWindow = document.querySelector("#aiChatWindow");
const aiChatInput = document.querySelector("#aiChatInput");
const aiChatButton = document.querySelector("#aiChatButton");

const eventSummary = document.querySelector("#eventSummary");
const quoteStatus = document.querySelector("#quoteStatus");

const summaryEventType = document.querySelector("#summaryEventType");
const summaryDate = document.querySelector("#summaryDate");
const summaryLocation = document.querySelector("#summaryLocation");
const summaryGuests = document.querySelector("#summaryGuests");
const summaryBudget = document.querySelector("#summaryBudget");
const summaryStyle = document.querySelector("#summaryStyle");
const summaryServices = document.querySelector("#summaryServices");

const conversationHistory = [];

let currentEventData = {
  tipo_evento: "",
  fecha: "",
  ubicacion: "",
  invitados: null,
  presupuesto: null,
  estilo: "",
  servicios: [],
  observaciones: ""
};

let currentReadyForQuote = false;

const MAX_HISTORY_MESSAGES = 30;

if (aiChatForm && aiChatWindow && aiChatInput && aiChatButton) {
  aiChatForm.addEventListener("submit", handleChatSubmit);
}

async function handleChatSubmit(event) {
  event.preventDefault();

  const userText = aiChatInput.value.trim();

  if (!userText) {
    addChatMessage("Escribe un mensaje antes de continuar.", "error");
    return;
  }

  const previousHistory = [...conversationHistory];

  addChatMessage(userText, "user");

  conversationHistory.push({
    role: "user",
    content: userText
  });

  trimHistory();

  aiChatInput.value = "";
  setChatLoading(true);

  const loadingMessage = addChatMessage(
    "Estoy revisando las opciones de AMARÉ...",
    "loading"
  );

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: userText,
        history: previousHistory,
        eventData: currentEventData
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(
        data.error || "No se pudo obtener una respuesta del asistente."
      );
      error.status = response.status;
      throw error;
    }

    if (typeof data.response !== "string" || !data.response.trim()) {
      throw new Error("La API no devolvió una respuesta válida.");
    }

    if (data.eventData && typeof data.eventData === "object") {
      currentEventData = {
        ...currentEventData,
        ...data.eventData,
        servicios: Array.isArray(data.eventData.servicios)
          ? data.eventData.servicios
          : currentEventData.servicios
      };

      currentReadyForQuote = Boolean(data.readyForQuote);

      console.log("Ficha actual del evento:", currentEventData);
      console.log("Lista para cotizar:", currentReadyForQuote);

      updateEventSummary(currentReadyForQuote);
    }

    loadingMessage.remove();

    const cleanResponse = cleanBotText(data.response);

    addChatMessage(cleanResponse, "bot");

    conversationHistory.push({
      role: "assistant",
      content: cleanResponse
    });

    trimHistory();
  } catch (error) {
    loadingMessage.remove();

    const lastMessage = conversationHistory[conversationHistory.length - 1];

    if (
      lastMessage &&
      lastMessage.role === "user" &&
      lastMessage.content === userText
    ) {
      conversationHistory.pop();
    }

    let userMessage =
      "No puedo responderte en este momento. Intenta enviar el mensaje nuevamente.";

    if (error.status === 503) {
      userMessage =
        "El asistente todavía necesita configurar la clave de OpenRouter en el backend.";
    } else if (error.status === 429) {
      userMessage =
        "Hay muchas consultas en este momento. Intenta nuevamente dentro de unos segundos.";
    } else if (error.status === 402) {
      userMessage =
        "El servicio de IA no tiene acceso disponible para responder esta consulta.";
    }

    addChatMessage(userMessage, "error");
    console.error("Error del chatbot:", error);
  } finally {
    setChatLoading(false);
    aiChatInput.focus();
  }
}

function addChatMessage(text, type) {
  const message = document.createElement("div");
  message.className = `message ${type}`;
  message.textContent = text;

  aiChatWindow.appendChild(message);
  aiChatWindow.scrollTop = aiChatWindow.scrollHeight;

  return message;
}

function setChatLoading(isLoading) {
  aiChatInput.disabled = isLoading;
  aiChatButton.disabled = isLoading;
  aiChatButton.textContent = isLoading ? "Pensando..." : "Enviar";
}

function trimHistory() {
  if (conversationHistory.length > MAX_HISTORY_MESSAGES) {
    conversationHistory.splice(
      0,
      conversationHistory.length - MAX_HISTORY_MESSAGES
    );
  }
}

function cleanBotText(text) {
  return String(text)
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`/g, "")
    .replace(/#{1,6}\s?/g, "")
    .trim();
}

function hasEventData() {
  return Boolean(
    currentEventData.tipo_evento ||
      currentEventData.fecha ||
      currentEventData.ubicacion ||
      currentEventData.invitados !== null ||
      currentEventData.presupuesto !== null ||
      currentEventData.estilo ||
      currentEventData.servicios?.length
  );
}

function formatBudget(value) {
  if (value === null || value === undefined || value === "") {
    return "Pendiente";
  }

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return String(value);
  }

  return `$${numericValue.toLocaleString("es-EC")}`;
}

function updateEventSummary(readyForQuote = false) {
  if (!eventSummary || !hasEventData()) {
    return;
  }

  eventSummary.hidden = false;

  if (summaryEventType) {
    summaryEventType.textContent =
      currentEventData.tipo_evento || "Pendiente";
  }

  if (summaryDate) {
    summaryDate.textContent = currentEventData.fecha || "Pendiente";
  }

  if (summaryLocation) {
    summaryLocation.textContent =
      currentEventData.ubicacion || "Pendiente";
  }

  if (summaryGuests) {
    summaryGuests.textContent =
      currentEventData.invitados !== null &&
      currentEventData.invitados !== undefined
        ? `${currentEventData.invitados} personas`
        : "Pendiente";
  }

  if (summaryBudget) {
    summaryBudget.textContent = formatBudget(currentEventData.presupuesto);
  }

  if (summaryStyle) {
    summaryStyle.textContent = currentEventData.estilo || "Por definir";
  }

  if (summaryServices) {
    summaryServices.textContent =
      Array.isArray(currentEventData.servicios) &&
      currentEventData.servicios.length
        ? currentEventData.servicios.join(", ")
        : "Por definir";
  }

  if (quoteStatus) {
    quoteStatus.textContent = readyForQuote
      ? "Lista para cotizar"
      : "Completando datos";

    quoteStatus.classList.toggle("ready", readyForQuote);
  }
}
