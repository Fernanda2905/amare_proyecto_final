// AMARÉ | JavaScript general

const WHATSAPP_NUMBER = "593999999999"; // Cambia este número por el oficial de AMARÉ.

const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");

if (menuToggle && mainNav) {
  menuToggle.addEventListener("click", () => {
    mainNav.classList.toggle("open");
  });

  document.querySelectorAll(".main-nav a").forEach((link) => {
    link.addEventListener("click", () => mainNav.classList.remove("open"));
  });
}

// Animaciones suaves al hacer scroll
const revealElements = document.querySelectorAll(".reveal");

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  },
  { threshold: 0.12 }
);

revealElements.forEach((element) => revealObserver.observe(element));

// Guardar paquete elegido desde experiencias.html para usarlo en cotiza.html
const packageButtons = document.querySelectorAll(".package-btn");

packageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const selectedPackage = button.dataset.package;
    localStorage.setItem("amarePackage", selectedPackage);
  });
});

const packageSelect = document.querySelector("#package");

if (packageSelect) {
  const savedPackage = localStorage.getItem("amarePackage");

  if (savedPackage) {
    packageSelect.value = savedPackage;
    localStorage.removeItem("amarePackage");
  }
}

// Formulario de cotización hacia WhatsApp
const quoteForm = document.querySelector("#quoteForm");

if (quoteForm) {
  quoteForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = document.querySelector("#name").value.trim();
    const eventType = document.querySelector("#eventType").value;
    const selectedPackage = document.querySelector("#package").value;
    const date = document.querySelector("#date").value || "Fecha por definir";
    const guests = document.querySelector("#guests").value || "No definido";
    const budget = document.querySelector("#budget").value;
    const details = document.querySelector("#details").value.trim();

    const message = `
Hola AMARÉ, quiero cotizar un evento.

Nombre: ${name}
Tipo de evento: ${eventType}
Paquete de interés: ${selectedPackage}
Fecha estimada: ${date}
Número de invitados: ${guests}
Presupuesto aproximado: ${budget}

Contexto del evento:
${details}
    `.trim();

    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  });
}

// Simulación inicial del chatbot
const demoChatForm = document.querySelector("#demoChatForm");
const chatWindow = document.querySelector("#chatWindow");
const chatInput = document.querySelector("#chatInput");

if (demoChatForm && chatWindow && chatInput) {
  demoChatForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const userText = chatInput.value.trim();
    if (!userText) return;

    addMessage(userText, "user");
    chatInput.value = "";

    setTimeout(() => {
      addMessage(
        "Gracias por contarme. Con esa idea, AMARÉ podría preparar una propuesta personalizada. Para avanzar, sería ideal saber fecha, número de invitados y presupuesto aproximado.",
        "bot"
      );
    }, 600);
  });
}

function addMessage(text, type) {
  const message = document.createElement("div");
  message.className = `message ${type}`;
  message.textContent = text;
  chatWindow.appendChild(message);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}
