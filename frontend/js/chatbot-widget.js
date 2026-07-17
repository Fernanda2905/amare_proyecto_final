/* =========================================================
   CHATBOT FLOTANTE AMARÉ
   Archivo: frontend/js/chatbot-widget.js
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const API_URL = "/api/chat";

  const STORAGE_KEY = "amareChatbotSession";
  const QUOTE_KEY = "amareChatbotQuote";

  const state = {
    history: [],
    eventData: {},
    awaitingConfirmation: false,
    confirmedByClient: false,
    readyForQuote: false,
    isSending: false
  };

  createChatbotHTML();
  loadSavedSession();
  initializeChatbot();

  function createChatbotHTML() {
    const launcher = document.createElement("button");

    launcher.type = "button";
    launcher.id = "amare-chat-launcher";
    launcher.className = "amare-chat-launcher";
    launcher.setAttribute("aria-label", "Abrir asistente de AMARÉ");
    launcher.setAttribute("aria-expanded", "false");
    launcher.innerHTML = "💬";

    const widget = document.createElement("section");

    widget.id = "amare-chat-widget";
    widget.className = "amare-chat-widget";
    widget.setAttribute("aria-label", "Asistente virtual de AMARÉ");

    widget.innerHTML = `
      <header class="amare-chat-header">
        <div class="amare-chat-brand">
          <div class="amare-chat-avatar" aria-hidden="true">A</div>

          <div class="amare-chat-heading">
            <h3>AMARÉ</h3>
            <p class="amare-chat-status">Asistente de eventos</p>
          </div>
        </div>

        <button
          type="button"
          id="amare-chat-close"
          class="amare-chat-close"
          aria-label="Cerrar asistente"
        >
          ×
        </button>
      </header>

      <div
        id="amare-chat-messages"
        class="amare-chat-messages"
        aria-live="polite"
      ></div>

      <form id="amare-chat-form" class="amare-chat-form">
        <textarea
          id="amare-chat-input"
          class="amare-chat-input"
          rows="1"
          maxlength="1000"
          placeholder="Cuéntanos qué evento imaginas..."
          aria-label="Escribe tu mensaje"
        ></textarea>

        <button
          id="amare-chat-send"
          class="amare-chat-send"
          type="submit"
          aria-label="Enviar mensaje"
        >
          ➤
        </button>
      </form>
    `;

    document.body.appendChild(launcher);
    document.body.appendChild(widget);
  }

  function initializeChatbot() {
    const launcher = document.getElementById("amare-chat-launcher");
    const widget = document.getElementById("amare-chat-widget");
    const closeButton = document.getElementById("amare-chat-close");
    const form = document.getElementById("amare-chat-form");
    const input = document.getElementById("amare-chat-input");

    launcher.addEventListener("click", () => {
      const isOpen = widget.classList.contains("is-open");

      if (isOpen) {
        closeChat();
      } else {
        openChat();
      }
    });

    closeButton.addEventListener("click", closeChat);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      await sendMessage();
    });

    input.addEventListener("keydown", async (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        await sendMessage();
      }
    });

    input.addEventListener("input", () => {
      resizeInput(input);
    });

    if (state.history.length === 0) {
      addBotMessage(
        "¡Hola! ✨ Soy el asistente de AMARÉ. Cuéntame qué evento estás imaginando y te ayudaré a organizar los primeros detalles."
      );
    } else {
      renderSavedHistory();
    }

    if (state.confirmedByClient && state.readyForQuote) {
      renderSummaryCard(state.eventData);
    }

    const params = new URLSearchParams(window.location.search);

    if (params.get("chat") === "1") {
      openChat();
    }
  }

  function openChat() {
    const launcher = document.getElementById("amare-chat-launcher");
    const widget = document.getElementById("amare-chat-widget");
    const input = document.getElementById("amare-chat-input");

    widget.classList.add("is-open");
    launcher.classList.add("is-open");

    launcher.setAttribute("aria-expanded", "true");
    launcher.innerHTML = "×";

    if (window.innerWidth <= 600) {
      document.body.classList.add("amare-chat-open");
    }

    setTimeout(() => {
      input.focus();
      scrollToBottom();
    }, 200);
  }

  function closeChat() {
    const launcher = document.getElementById("amare-chat-launcher");
    const widget = document.getElementById("amare-chat-widget");

    widget.classList.remove("is-open");
    launcher.classList.remove("is-open");

    launcher.setAttribute("aria-expanded", "false");
    launcher.innerHTML = "💬";

    document.body.classList.remove("amare-chat-open");
  }

  async function sendMessage() {
    const input = document.getElementById("amare-chat-input");
    const sendButton = document.getElementById("amare-chat-send");

    const message = input.value.trim();

    if (!message || state.isSending) {
      return;
    }

    state.isSending = true;
    sendButton.disabled = true;

    addUserMessage(message);

    input.value = "";
    resizeInput(input);

    const typingElement = showTypingIndicator();

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message,
          history: state.history,
          eventData: state.eventData,
          awaitingConfirmation: state.awaitingConfirmation
        })
      });

      const rawText = await response.text();

      if (!response.ok) {
        throw new Error(
          rawText || `El servidor respondió con estado ${response.status}`
        );
      }

      let data;

      try {
        data = JSON.parse(rawText);
      } catch (error) {
        throw new Error("El servidor no devolvió una respuesta JSON válida.");
      }

      typingElement.remove();

      const botReply =
        data.reply ||
        data.response ||
        data.message ||
        "Gracias. Sigamos definiendo los detalles de tu evento.";

      state.eventData =
        data.eventData ||
        data.mergedEventData ||
        state.eventData ||
        {};

      state.awaitingConfirmation = Boolean(data.awaitingConfirmation);
      state.confirmedByClient = Boolean(data.confirmedByClient);
      state.readyForQuote = Boolean(data.readyForQuote);

      addBotMessage(botReply);

      if (state.confirmedByClient && state.readyForQuote) {
        renderSummaryCard(state.eventData);
      }

      saveSession();
    } catch (error) {
      console.error("Error del chatbot:", error);

      typingElement.remove();

      addErrorMessage(
        "No pude conectarme con el asistente en este momento. Revisa que el servidor esté encendido e inténtalo nuevamente."
      );
    } finally {
      state.isSending = false;
      sendButton.disabled = false;
      input.focus();
    }
  }

  function addUserMessage(text) {
    addMessageToDOM(text, "user");

    state.history.push({
      role: "user",
      content: text
    });

    saveSession();
  }

  function addBotMessage(text) {
    addMessageToDOM(text, "bot");

    state.history.push({
      role: "assistant",
      content: text
    });

    saveSession();
  }

  function addErrorMessage(text) {
    addMessageToDOM(text, "error");
  }

  function addMessageToDOM(text, type) {
    const messagesContainer = document.getElementById(
      "amare-chat-messages"
    );

    const messageElement = document.createElement("div");

    messageElement.className = `amare-message ${type}`;

    const paragraph = document.createElement("p");
    paragraph.textContent = text;

    messageElement.appendChild(paragraph);
    messagesContainer.appendChild(messageElement);

    scrollToBottom();
  }

  function showTypingIndicator() {
    const messagesContainer = document.getElementById(
      "amare-chat-messages"
    );

    const typing = document.createElement("div");

    typing.className = "amare-typing";
    typing.innerHTML = `
      <span></span>
      <span></span>
      <span></span>
    `;

    messagesContainer.appendChild(typing);
    scrollToBottom();

    return typing;
  }

  function renderSummaryCard(eventData) {
    removeExistingSummary();

    const messagesContainer = document.getElementById(
      "amare-chat-messages"
    );

    const summaryCard = document.createElement("section");

    summaryCard.className = "amare-summary-card";

    const type = getEventValue(eventData, [
      "eventType",
      "tipoEvento",
      "tipo",
      "event_type"
    ]);

    const date = getEventValue(eventData, [
      "date",
      "fecha",
      "eventDate",
      "event_date"
    ]);

    const city = getEventValue(eventData, [
      "city",
      "ciudad",
      "location",
      "ubicacion"
    ]);

    const guests = getEventValue(eventData, [
      "guests",
      "invitados",
      "guestCount",
      "cantidadInvitados"
    ]);

    const budget = getEventValue(eventData, [
      "budget",
      "presupuesto",
      "budgetRange",
      "rangoPresupuesto"
    ]);

    const style = getEventValue(eventData, [
      "style",
      "estilo",
      "theme",
      "tematica"
    ]);

    const services = formatServices(
      getEventValue(eventData, [
        "services",
        "servicios",
        "interestedServices"
      ])
    );

    summaryCard.innerHTML = `
      <h4>Resumen de tu evento ✨</h4>
      <p>Estos son los detalles que confirmaste con AMARÉ.</p>

      <div class="amare-summary-list">
        ${createSummaryItem("Tipo de evento", type)}
        ${createSummaryItem("Fecha", date)}
        ${createSummaryItem("Ciudad o lugar", city)}
        ${createSummaryItem("Invitados", guests)}
        ${createSummaryItem("Presupuesto", budget)}
        ${createSummaryItem("Estilo", style)}
        ${createSummaryItem("Servicios", services)}
      </div>

      <div class="amare-summary-actions">
        <button
          type="button"
          class="amare-summary-btn quote"
          data-action="quote"
        >
          Cotizar
        </button>

        <button
          type="button"
          class="amare-summary-btn whatsapp"
          data-action="whatsapp"
        >
          WhatsApp
        </button>

        <button
          type="button"
          class="amare-summary-btn modify"
          data-action="modify"
        >
          Modificar información
        </button>
      </div>
    `;

    messagesContainer.appendChild(summaryCard);

    summaryCard
      .querySelector('[data-action="quote"]')
      .addEventListener("click", goToQuote);

    summaryCard
      .querySelector('[data-action="whatsapp"]')
      .addEventListener("click", openWhatsApp);

    summaryCard
      .querySelector('[data-action="modify"]')
      .addEventListener("click", modifyEvent);

    scrollToBottom();
  }

  function createSummaryItem(label, value) {
    const safeValue =
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
        ? escapeHTML(String(value))
        : "Por definir";

    return `
      <div class="amare-summary-item">
        <strong>${escapeHTML(label)}:</strong>
        ${safeValue}
      </div>
    `;
  }

  function getEventValue(object, keys) {
    if (!object || typeof object !== "object") {
      return "";
    }

    for (const key of keys) {
      if (
        Object.prototype.hasOwnProperty.call(object, key) &&
        object[key] !== undefined &&
        object[key] !== null &&
        object[key] !== ""
      ) {
        return object[key];
      }
    }

    return "";
  }

  function formatServices(services) {
    if (Array.isArray(services)) {
      return services.join(", ");
    }

    if (typeof services === "string") {
      return services;
    }

    return "";
  }

  function goToQuote() {
    localStorage.setItem(
      QUOTE_KEY,
      JSON.stringify(state.eventData || {})
    );

    window.location.href = "cotiza.html?origen=chatbot";
  }

  function openWhatsApp() {
    const phone = "593958892936";

    const eventData = state.eventData || {};

    const type = getEventValue(eventData, [
      "eventType",
      "tipoEvento",
      "tipo"
    ]);

    const date = getEventValue(eventData, [
      "date",
      "fecha",
      "eventDate"
    ]);

    const city = getEventValue(eventData, [
      "city",
      "ciudad",
      "location",
      "ubicacion"
    ]);

    const guests = getEventValue(eventData, [
      "guests",
      "invitados",
      "guestCount"
    ]);

    const budget = getEventValue(eventData, [
      "budget",
      "presupuesto",
      "budgetRange"
    ]);

    const style = getEventValue(eventData, [
      "style",
      "estilo",
      "theme"
    ]);

    const services = formatServices(
      getEventValue(eventData, [
        "services",
        "servicios"
      ])
    );

    const message = [
      "Hola equipo AMARÉ ✨",
      "",
      "Me gustaría solicitar una cotización para este evento:",
      "",
      `• Tipo: ${type || "Por definir"}`,
      `• Fecha: ${date || "Por definir"}`,
      `• Ciudad o lugar: ${city || "Por definir"}`,
      `• Invitados: ${guests || "Por definir"}`,
      `• Presupuesto: ${budget || "Por definir"}`,
      `• Estilo: ${style || "Por definir"}`,
      `• Servicios: ${services || "Por definir"}`,
      "",
      "Quedo pendiente de su propuesta. Gracias."
    ].join("\n");

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank", "noopener,noreferrer");
  }

  function modifyEvent() {
    state.awaitingConfirmation = false;
    state.confirmedByClient = false;
    state.readyForQuote = false;

    removeExistingSummary();

    addBotMessage(
      "Claro ✨ Dime qué información deseas cambiar y actualizaré los detalles del evento."
    );

    saveSession();

    document.getElementById("amare-chat-input").focus();
  }

  function removeExistingSummary() {
    const existingSummary = document.querySelector(
      ".amare-summary-card"
    );

    if (existingSummary) {
      existingSummary.remove();
    }
  }

  function renderSavedHistory() {
    const messagesContainer = document.getElementById(
      "amare-chat-messages"
    );

    messagesContainer.innerHTML = "";

    state.history.forEach((item) => {
      const type =
        item.role === "user"
          ? "user"
          : "bot";

      addMessageToDOM(item.content, type);
    });
  }

  function saveSession() {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          history: state.history,
          eventData: state.eventData,
          awaitingConfirmation: state.awaitingConfirmation,
          confirmedByClient: state.confirmedByClient,
          readyForQuote: state.readyForQuote
        })
      );
    } catch (error) {
      console.warn(
        "No se pudo guardar la sesión del chatbot:",
        error
      );
    }
  }

  function loadSavedSession() {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);

      if (!saved) {
        return;
      }

      const parsed = JSON.parse(saved);

      state.history = Array.isArray(parsed.history)
        ? parsed.history
        : [];

      state.eventData =
        parsed.eventData &&
        typeof parsed.eventData === "object"
          ? parsed.eventData
          : {};

      state.awaitingConfirmation = Boolean(
        parsed.awaitingConfirmation
      );

      state.confirmedByClient = Boolean(
        parsed.confirmedByClient
      );

      state.readyForQuote = Boolean(
        parsed.readyForQuote
      );
    } catch (error) {
      console.warn(
        "No se pudo recuperar la sesión anterior:",
        error
      );

      sessionStorage.removeItem(STORAGE_KEY);
    }
  }

  function resizeInput(input) {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 110)}px`;
  }

  function scrollToBottom() {
    const messagesContainer = document.getElementById(
      "amare-chat-messages"
    );

    if (!messagesContainer) {
      return;
    }

    requestAnimationFrame(() => {
      messagesContainer.scrollTop =
        messagesContainer.scrollHeight;
    });
  }

  function escapeHTML(value) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
});