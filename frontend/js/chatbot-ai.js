// AMARÉ | Chatbot conectado al backend Express

const aiChatForm = document.querySelector("#aiChatForm");
const aiChatWindow = document.querySelector("#aiChatWindow");
const aiChatInput = document.querySelector("#aiChatInput");
const aiChatButton = document.querySelector("#aiChatButton");

const conversationHistory = [];
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
        history: previousHistory
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

    if (!data.response) {
      throw new Error("La API no devolvió una respuesta válida.");
    }

    loadingMessage.remove();
    addChatMessage(
    cleanBotText(data.response),
    "bot"
);

    conversationHistory.push({
      role: "assistant",
      content: data.response
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
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`/g, "")
    .replace(/#{1,6}\s?/g, "")
    .trim();
}