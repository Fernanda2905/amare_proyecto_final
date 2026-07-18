document.addEventListener("DOMContentLoaded", async () => {
  const WHATSAPP_NUMBER = "593958892936";

  const CHATBOT_QUOTE_KEY = "amareChatbotQuote";

  const quoteForm = document.getElementById("quoteForm");
  const eventTypeSelect = document.getElementById("eventType");
  const packageSelect = document.getElementById("package");
  const statusMessage = document.getElementById("quoteStatus");

  if (!quoteForm) return;

  function showStatus(message, type = "info") {
    if (!statusMessage) return;

    statusMessage.textContent = message;
    statusMessage.className = `form-status ${type}`;
  }

  async function cargarTiposEvento() {
    if (!eventTypeSelect) return;

    try {
      const response = await fetch("/api/public/tipos-evento");

      if (!response.ok) {
        throw new Error("No se pudieron cargar los tipos de evento");
      }

      const tipos = await response.json();

      eventTypeSelect.innerHTML = `
        <option value="">Selecciona una opción</option>
      `;

      tipos.forEach((tipo) => {
        const option = document.createElement("option");
        option.value = tipo.nombre_tipo;
        option.textContent = tipo.nombre_tipo;
        eventTypeSelect.appendChild(option);
      });
    } catch (error) {
      console.error("Error al cargar tipos de evento:", error);
    }
  }

  async function cargarPaquetes() {
    if (!packageSelect) return;

    try {
      const response = await fetch("/api/public/paquetes");

      if (!response.ok) {
        throw new Error("No se pudieron cargar los paquetes");
      }

      const paquetes = await response.json();

      packageSelect.innerHTML = `
        <option value="Personalizado">
          Personalizado / Quiero contar mi idea
        </option>
      `;

      paquetes.forEach((paquete) => {
        const option = document.createElement("option");
        option.value = paquete.nombre_paquete;
        option.textContent = paquete.nombre_paquete;
        packageSelect.appendChild(option);
      });

      const savedPackage = localStorage.getItem("amarePackage");

      if (savedPackage) {
        packageSelect.value = savedPackage;
        localStorage.removeItem("amarePackage");
      }
    } catch (error) {
      console.error("Error al cargar paquetes:", error);
    }
  }

  function normalizarTexto(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  }

  function buscarValor(object, keys) {
    if (!object || typeof object !== "object") return "";

    for (const key of keys) {
      const value = object[key];

      if (
        value !== undefined &&
        value !== null &&
        normalizarTexto(value) !== ""
      ) {
        return value;
      }
    }

    return "";
  }

  function seleccionarOpcionPorTexto(select, value) {
    if (!select || !value) return;

    const normalizedValue = normalizarTexto(value).toLowerCase();

    const matchingOption = Array.from(select.options).find((option) => {
      return option.value.trim().toLowerCase() === normalizedValue;
    });

    if (matchingOption) {
      select.value = matchingOption.value;
      return;
    }

    /*
      Si la IA guardó un tipo que todavía no existe en Airtable,
      lo añadimos temporalmente para no perder la información.
    */
    const newOption = document.createElement("option");
    newOption.value = normalizarTexto(value);
    newOption.textContent = normalizarTexto(value);
    select.appendChild(newOption);
    select.value = newOption.value;
  }

  function convertirFechaAInput(value) {
    const text = normalizarTexto(value);

    if (!text) return "";

    /*
      Si ya viene como 2026-10-29, se usa directamente.
    */
    const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (isoMatch) {
      return text;
    }

    const meses = {
      enero: "01",
      febrero: "02",
      marzo: "03",
      abril: "04",
      mayo: "05",
      junio: "06",
      julio: "07",
      agosto: "08",
      septiembre: "09",
      setiembre: "09",
      octubre: "10",
      noviembre: "11",
      diciembre: "12"
    };

    /*
      Acepta ejemplos como:
      29 de octubre
      29 de octubre de 2026
      29 octubre 2026
    */
    const spanishDateMatch = text
      .toLowerCase()
      .match(
        /(\d{1,2})\s*(?:de\s*)?([a-záéíóúñ]+)(?:\s*(?:de\s*)?(\d{4}))?/
      );

    if (!spanishDateMatch) {
      return "";
    }

    const day = spanishDateMatch[1].padStart(2, "0");
    const monthName = spanishDateMatch[2];
    const month = meses[monthName];

    if (!month) {
      return "";
    }

    const year =
      spanishDateMatch[3] || String(new Date().getFullYear());

    return `${year}-${month}-${day}`;
  }

function construirDetallesDesdeChatbot(eventData, history = []) {
  const tipoEvento = buscarValor(eventData, [
    "tipo_evento",
    "eventType",
    "tipoEvento",
    "tipo"
  ]);

  const fecha = buscarValor(eventData, [
    "fecha",
    "date",
    "eventDate"
  ]);

  const ubicacion = buscarValor(eventData, [
    "ubicacion",
    "ciudad",
    "city",
    "location"
  ]);

  const invitados = buscarValor(eventData, [
    "invitados",
    "guests",
    "guestCount"
  ]);

  const presupuesto = buscarValor(eventData, [
    "presupuesto",
    "budget",
    "budgetRange"
  ]);

  const estilo = buscarValor(eventData, [
    "estilo",
    "style",
    "theme",
    "tematica"
  ]);

  const serviciosValue = buscarValor(eventData, [
    "servicios",
    "services",
    "interestedServices"
  ]);

  const observaciones = buscarValor(eventData, [
    "observaciones",
    "details",
    "descripcion",
    "description"
  ]);

  const servicios = Array.isArray(serviciosValue)
    ? serviciosValue.join(", ")
    : normalizarTexto(serviciosValue);

  const mensajesCliente = Array.isArray(history)
    ? history
        .filter((item) => item?.role === "user")
        .map((item) => normalizarTexto(item.content))
        .filter(Boolean)
    : [];

  const lines = [
    "Información recopilada por el asistente de AMARÉ:",
    "",
    `Tipo de evento: ${tipoEvento || "Por definir"}`,
    `Fecha estimada: ${fecha || "Por definir"}`,
    `Ubicación: ${ubicacion || "Por definir"}`,
    `Número de invitados: ${invitados || "Por definir"}`,
    `Presupuesto aproximado: ${presupuesto || "Por definir"}`,
    `Estilo o temática: ${estilo || "Por definir"}`,
    `Servicios de interés: ${servicios || "Por definir"}`,
    `Observaciones: ${observaciones || "Sin observaciones adicionales"}`,
    "",
    mensajesCliente.length
      ? "Información expresada por el cliente durante la conversación:"
      : "",
    ...mensajesCliente.map(
      (mensaje, index) => `${index + 1}. ${mensaje}`
    )
  ].filter(Boolean);

  return lines.join("\n");
}

  function autollenarDesdeChatbot() {
    const savedData = localStorage.getItem(CHATBOT_QUOTE_KEY);

    if (!savedData) return;

    try {
const parsedData = JSON.parse(savedData);

const eventData =
  parsedData.eventData &&
  typeof parsedData.eventData === "object"
    ? parsedData.eventData
    : parsedData;

const history = Array.isArray(parsedData.history)
  ? parsedData.history
  : [];

      const eventType = buscarValor(eventData, [
        "tipo_evento",
        "eventType",
        "tipoEvento",
        "tipo",
        "event_type"
      ]);

      const date = buscarValor(eventData, [
        "fecha",
        "date",
        "eventDate",
        "event_date"
      ]);

      const guests = buscarValor(eventData, [
        "invitados",
        "guests",
        "guestCount",
        "cantidadInvitados"
      ]);

      const budget = buscarValor(eventData, [
        "presupuesto",
        "budget",
        "budgetRange",
        "rangoPresupuesto"
      ]);

const details = construirDetallesDesdeChatbot(
  eventData,
  history
);

      seleccionarOpcionPorTexto(eventTypeSelect, eventType);

      const dateInput = document.getElementById("date");
      const guestsInput = document.getElementById("guests");
      const budgetInput = document.getElementById("budget");
      const detailsInput = document.getElementById("details");

      const formattedDate = convertirFechaAInput(date);

      if (dateInput && formattedDate) {
        dateInput.value = formattedDate;
      }

      if (guestsInput && guests !== "") {
        guestsInput.value = guests;
      }

      if (budgetInput && budget !== "") {
        budgetInput.value = budget;
      }

      if (packageSelect) {
        packageSelect.value = "Personalizado";
      }

      if (detailsInput && details) {
        detailsInput.value = details;
      }

      showStatus(
        "Completamos el formulario con la información de tu conversación. Solo agrega tus datos de contacto y revisa los detalles.",
        "success"
      );

      /*
        Se elimina después de usarlo para no volver a cargar
        una cotización antigua en el futuro.
      */
      localStorage.removeItem(CHATBOT_QUOTE_KEY);
    } catch (error) {
      console.error(
        "No se pudo recuperar la información del chatbot:",
        error
      );

      localStorage.removeItem(CHATBOT_QUOTE_KEY);
    }
  }

  quoteForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const eventType = document.getElementById("eventType").value;
    const selectedPackage = document.getElementById("package").value;
    const date = document.getElementById("date").value;
    const guests = document.getElementById("guests").value;
    const budget = document.getElementById("budget").value;
    const details = document.getElementById("details").value.trim();

    const solicitud = {
      nombre_cliente: name,
      correo: email,
      telefono: phone,
      tipo_evento: eventType,
      paquete_interes: selectedPackage,
      fecha_evento: date || undefined,
      cantidad_invitados: guests
        ? Number(guests)
        : undefined,
      presupuesto_estimado: budget,
      descripcion_evento: details
    };

    try {
      showStatus(
        "Guardando solicitud en la base de datos...",
        "info"
      );

      const response = await fetch("/api/public/solicitudes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(solicitud)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(data);

        throw new Error(
          data.error || "No se pudo guardar la solicitud"
        );
      }

      showStatus(
        "Solicitud guardada correctamente. Abriendo WhatsApp...",
        "success"
      );

      const fechaTexto = date || "Fecha por definir";
      const invitadosTexto = guests || "No definido";

      const message = `
Hola AMARÉ, quiero cotizar un evento.

Nombre: ${name}
Correo: ${email}
Teléfono: ${phone}
Tipo de evento: ${eventType}
Paquete de interés: ${selectedPackage}
Fecha estimada: ${fechaTexto}
Número de invitados: ${invitadosTexto}
Presupuesto aproximado: ${budget}

Contexto del evento:
${details}
      `.trim();

      const whatsappUrl =
        `https://wa.me/${WHATSAPP_NUMBER}` +
        `?text=${encodeURIComponent(message)}`;

      setTimeout(() => {
        window.open(whatsappUrl, "_blank");
      }, 700);

      quoteForm.reset();
    } catch (error) {
      console.error("Error al enviar solicitud:", error);

      showStatus(
        "No se pudo guardar la solicitud. Revisa la conexión o intenta nuevamente.",
        "error"
      );
    }
  });

  /*
    Primero esperamos que se carguen las opciones de Airtable.
    Después colocamos los datos que vienen del chatbot.
  */
  await Promise.all([
    cargarTiposEvento(),
    cargarPaquetes()
  ]);

  autollenarDesdeChatbot();
});