const serviciosContainer = document.getElementById("serviciosDinamicos");

const imagenFallback =
  "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80";

async function cargarServiciosPublicos() {
  if (!serviciosContainer) return;

  try {
    const response = await fetch("/api/public/servicios");

    if (!response.ok) {
      throw new Error("No se pudieron cargar los servicios");
    }

    const servicios = await response.json();

    serviciosContainer.innerHTML = "";

    if (!servicios.length) {
      serviciosContainer.innerHTML = `
        <article class="service-card reveal visible">
          <div>
            <h2>No hay servicios disponibles</h2>
            <p>Por ahora no hay servicios activos para mostrar.</p>
          </div>
        </article>
      `;
      return;
    }

    servicios.forEach((servicio) => {
      const card = document.createElement("article");
      card.className = "service-card reveal visible";

      const imagen = servicio.imagen_url || imagenFallback;
      const nombre = servicio.nombre_servicio || "Servicio AMARÉ";
      const descripcion =
        servicio.descripcion || "Servicio personalizado para eventos especiales.";
      const precio = Number(servicio.precio_base || 0);

      card.innerHTML = `
        <img src="${imagen}" alt="${nombre}">
        <div>
          <h2>${nombre}</h2>
          <p>${descripcion}</p>
          <p class="service-price">Desde $${precio.toFixed(2)}</p>
        </div>
      `;

      serviciosContainer.appendChild(card);
    });
  } catch (error) {
    console.error("Error al cargar servicios públicos:", error);

    serviciosContainer.innerHTML = `
      <article class="service-card reveal visible">
        <div>
          <h2>No se pudieron cargar los servicios</h2>
          <p>Revisa la conexión con Airtable o el backend.</p>
        </div>
      </article>
    `;
  }
}

cargarServiciosPublicos();