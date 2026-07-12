document.addEventListener("DOMContentLoaded", () => {
  const paquetesContainer = document.getElementById("paquetesDinamicos");
  const galeriaContainer = document.getElementById("galeriaDinamica");

  async function cargarPaquetesPublicos() {
    if (!paquetesContainer) return;

    try {
      const response = await fetch("/api/public/paquetes");

      if (!response.ok) {
        throw new Error("No se pudieron cargar los paquetes");
      }

      const paquetes = await response.json();

      paquetesContainer.innerHTML = "";

      if (!paquetes.length) {
        paquetesContainer.innerHTML = `
          <article class="detail-card reveal visible">
            <span>Paquetes</span>
            <h2>No hay paquetes disponibles</h2>
            <p>Por ahora no hay paquetes activos para mostrar.</p>
          </article>
        `;
        return;
      }

      paquetes.forEach((paquete, index) => {
        const article = document.createElement("article");

        article.className = paquete.destacado
          ? "detail-card highlighted reveal visible"
          : "detail-card reveal visible";

        const numero = String(index + 1).padStart(2, "0");
        const nombre = paquete.nombre_paquete || "Paquete AMARÉ";
        const descripcion =
          paquete.descripcion || "Experiencia personalizada para eventos especiales.";
        const precio = Number(paquete.precio_base || 0);
        const caracteristicas = (paquete.caracteristicas || "")
          .split("\n")
          .map(item => item.trim())
          .filter(Boolean);

        const listaCaracteristicas = caracteristicas.length
          ? caracteristicas.map(item => `<li>${item}</li>`).join("")
          : `
            <li>Diseño de experiencia</li>
            <li>Propuesta personalizada</li>
            <li>Acompañamiento AMARÉ</li>
          `;

        const btnClass = paquete.destacado ? "btn primary" : "btn secondary";

        article.innerHTML = `
          <span>Paquete ${numero}</span>
          <h2>${nombre}</h2>
          <p>${descripcion}</p>
          <p class="package-price">Desde $${precio.toFixed(2)}</p>
          <ul>
            ${listaCaracteristicas}
          </ul>
          <a class="${btnClass} package-btn" href="cotiza.html" data-package="${nombre}">
            Quiero este paquete
          </a>
        `;

        paquetesContainer.appendChild(article);
      });

      activarBotonesPaquetes();
    } catch (error) {
      console.error("Error al cargar paquetes públicos:", error);

      paquetesContainer.innerHTML = `
        <article class="detail-card reveal visible">
          <span>Paquetes</span>
          <h2>No se pudieron cargar los paquetes</h2>
          <p>Revisa la conexión con Airtable o el backend.</p>
        </article>
      `;
    }
  }

  async function cargarGaleriaPublica() {
    if (!galeriaContainer) return;

    try {
      const response = await fetch("/api/public/galeria");

      if (!response.ok) {
        throw new Error("No se pudo cargar la galería");
      }

      const imagenes = await response.json();

      galeriaContainer.innerHTML = "";

      if (!imagenes.length) {
        galeriaContainer.innerHTML = `
          <p>No hay imágenes activas para mostrar.</p>
        `;
        return;
      }

      imagenes.forEach((imagen) => {
        const img = document.createElement("img");

        img.src = imagen.imagen_url;
        img.alt = imagen.descripcion_alt || imagen.titulo || "Imagen AMARÉ";
        img.loading = "lazy";

        galeriaContainer.appendChild(img);
      });
    } catch (error) {
      console.error("Error al cargar galería pública:", error);

      galeriaContainer.innerHTML = `
        <p>No se pudo cargar la galería. Revisa la conexión con la base de datos.</p>
      `;
    }
  }

  function activarBotonesPaquetes() {
    const packageButtons = document.querySelectorAll(".package-btn");

    packageButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const selectedPackage = button.dataset.package;
        localStorage.setItem("amarePackage", selectedPackage);
      });
    });
  }

  cargarPaquetesPublicos();
  cargarGaleriaPublica();
});