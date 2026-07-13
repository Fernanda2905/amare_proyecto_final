document.addEventListener("DOMContentLoaded", () => {
  const WHATSAPP_NUMBER = "593 95 889 2936";

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
        <option value="Personalizado">Personalizado / Quiero contar mi idea</option>
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
      cantidad_invitados: guests ? Number(guests) : undefined,
      presupuesto_estimado: budget,
      descripcion_evento: details
    };

    try {
      showStatus("Guardando solicitud en la base de datos...", "info");

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
        throw new Error(data.error || "No se pudo guardar la solicitud");
      }

      showStatus("Solicitud guardada correctamente. Abriendo WhatsApp...", "success");

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

      const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

      setTimeout(() => {
        window.open(whatsappUrl, "_blank");
      }, 700);

      quoteForm.reset();
    } catch (error) {
      console.error("Error al enviar solicitud:", error);
      showStatus("No se pudo guardar la solicitud. Revisa la conexión o intenta nuevamente.", "error");
    }
  });

  cargarTiposEvento();
  cargarPaquetes();
});