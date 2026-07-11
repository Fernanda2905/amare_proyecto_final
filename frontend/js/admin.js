const tabButtons = document.querySelectorAll(".tab-btn");
const tabSections = document.querySelectorAll(".tab-section");
const btnRecargar = document.getElementById("btnRecargar");

const serviciosBody = document.getElementById("serviciosBody");
const paquetesBody = document.getElementById("paquetesBody");
const galeriaBody = document.getElementById("galeriaBody");
const solicitudesBody = document.getElementById("solicitudesBody");

const servicioForm = document.getElementById("servicioForm");
const paqueteForm = document.getElementById("paqueteForm");
const galeriaForm = document.getElementById("galeriaForm");

let servicios = [];
let paquetes = [];
let galeria = [];
let solicitudes = [];

function money(value) {
  const number = Number(value || 0);
  return `$${number.toFixed(2)}`;
}

function cleanText(value) {
  return value || "";
}

function statusBadge(value) {
  return value
    ? `<span class="status on">Activo</span>`
    : `<span class="status off">Oculto</span>`;
}

async function apiGet(endpoint) {
  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error(`Error al cargar ${endpoint}`);
  }

  return response.json();
}

async function apiSend(endpoint, method, body) {
  const response = await fetch(endpoint, {
    method,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();

  if (!response.ok) {
    console.error(data);
    throw new Error(data.error || "Error en la solicitud");
  }

  return data;
}

async function apiDelete(endpoint) {
  const response = await fetch(endpoint, {
    method: "DELETE"
  });

  const data = await response.json();

  if (!response.ok) {
    console.error(data);
    throw new Error(data.error || "Error al eliminar");
  }

  return data;
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const tab = button.dataset.tab;

    tabButtons.forEach((btn) => btn.classList.remove("active"));
    tabSections.forEach((section) => section.classList.remove("active"));

    button.classList.add("active");
    document.getElementById(tab).classList.add("active");
  });
});

async function cargarTodo() {
  await Promise.all([
    cargarServicios(),
    cargarPaquetes(),
    cargarGaleria(),
    cargarSolicitudes()
  ]);
}

/* =========================
   SERVICIOS
========================= */

async function cargarServicios() {
  try {
    servicios = (await apiGet("/api/servicios")).filter(
      item => item.nombre_servicio || item.descripcion || item.orden
    );

    renderServicios();
  } catch (error) {
    console.error(error);
    serviciosBody.innerHTML = `<tr><td colspan="5">Error al cargar servicios.</td></tr>`;
  }
}

function renderServicios() {
  serviciosBody.innerHTML = "";

  if (!servicios.length) {
    serviciosBody.innerHTML = `<tr><td colspan="5">No hay servicios registrados.</td></tr>`;
    return;
  }

  servicios.forEach((servicio) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${cleanText(servicio.orden)}</td>
      <td>
        <strong>${cleanText(servicio.nombre_servicio)}</strong><br>
        <small>${cleanText(servicio.descripcion)}</small>
      </td>
      <td>${money(servicio.precio_base)}</td>
      <td>${statusBadge(servicio.estado)}</td>
      <td>
        <div class="row-actions">
          <button class="small editar-servicio" data-id="${servicio.recordId}">Editar</button>
          <button class="small danger eliminar-servicio" data-id="${servicio.recordId}">Eliminar</button>
        </div>
      </td>
    `;

    serviciosBody.appendChild(tr);
  });
}

servicioForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const recordId = document.getElementById("servicioRecordId").value;

  const servicio = {
    nombre_servicio: document.getElementById("nombre_servicio").value.trim(),
    descripcion: document.getElementById("descripcion_servicio").value.trim(),
    imagen_url: document.getElementById("imagen_url_servicio").value.trim(),
    precio_base: Number(document.getElementById("precio_base_servicio").value || 0),
    orden: Number(document.getElementById("orden_servicio").value || 1),
    estado: document.getElementById("estado_servicio").checked
  };

  try {
    if (recordId) {
      await apiSend(`/api/servicios/${recordId}`, "PATCH", servicio);
      alert("Servicio actualizado correctamente");
    } else {
      await apiSend("/api/servicios", "POST", servicio);
      alert("Servicio creado correctamente");
    }

    limpiarServicioForm();
    cargarServicios();
  } catch (error) {
    alert(error.message);
  }
});

serviciosBody.addEventListener("click", async (event) => {
  const id = event.target.dataset.id;

  if (!id) return;

  if (event.target.classList.contains("editar-servicio")) {
    const servicio = servicios.find((item) => item.recordId === id);

    if (!servicio) return;

    document.getElementById("servicioRecordId").value = servicio.recordId;
    document.getElementById("nombre_servicio").value = servicio.nombre_servicio || "";
    document.getElementById("descripcion_servicio").value = servicio.descripcion || "";
    document.getElementById("imagen_url_servicio").value = servicio.imagen_url || "";
    document.getElementById("precio_base_servicio").value = servicio.precio_base || 0;
    document.getElementById("orden_servicio").value = servicio.orden || 1;
    document.getElementById("estado_servicio").checked = Boolean(servicio.estado);

    document.getElementById("servicioFormTitle").textContent = "Editar servicio";

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  if (event.target.classList.contains("eliminar-servicio")) {
    const confirmar = confirm("¿Seguro que deseas eliminar este servicio?");

    if (!confirmar) return;

    try {
      await apiDelete(`/api/servicios/${id}`);
      alert("Servicio eliminado");
      cargarServicios();
    } catch (error) {
      alert(error.message);
    }
  }
});

function limpiarServicioForm() {
  servicioForm.reset();
  document.getElementById("servicioRecordId").value = "";
  document.getElementById("estado_servicio").checked = true;
  document.getElementById("servicioFormTitle").textContent = "Nuevo servicio";
}

document.getElementById("cancelarServicio").addEventListener("click", limpiarServicioForm);

/* =========================
   PAQUETES
========================= */

async function cargarPaquetes() {
  try {
    paquetes = (await apiGet("/api/paquetes")).filter(
      item => item.nombre_paquete || item.descripcion || item.orden
    );

    renderPaquetes();
  } catch (error) {
    console.error(error);
    paquetesBody.innerHTML = `<tr><td colspan="6">Error al cargar paquetes.</td></tr>`;
  }
}

function renderPaquetes() {
  paquetesBody.innerHTML = "";

  if (!paquetes.length) {
    paquetesBody.innerHTML = `<tr><td colspan="6">No hay paquetes registrados.</td></tr>`;
    return;
  }

  paquetes.forEach((paquete) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${cleanText(paquete.orden)}</td>
      <td>
        <strong>${cleanText(paquete.nombre_paquete)}</strong><br>
        <small>${cleanText(paquete.descripcion)}</small>
      </td>
      <td>${money(paquete.precio_base)}</td>
      <td>${paquete.destacado ? "Sí" : "No"}</td>
      <td>${statusBadge(paquete.estado)}</td>
      <td>
        <div class="row-actions">
          <button class="small editar-paquete" data-id="${paquete.recordId}">Editar</button>
          <button class="small danger eliminar-paquete" data-id="${paquete.recordId}">Eliminar</button>
        </div>
      </td>
    `;

    paquetesBody.appendChild(tr);
  });
}

paqueteForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const recordId = document.getElementById("paqueteRecordId").value;

  const paquete = {
    nombre_paquete: document.getElementById("nombre_paquete").value.trim(),
    descripcion: document.getElementById("descripcion_paquete").value.trim(),
    precio_base: Number(document.getElementById("precio_base_paquete").value || 0),
    duracion_estimada: document.getElementById("duracion_estimada").value.trim(),
    caracteristicas: document.getElementById("caracteristicas").value.trim(),
    destacado: document.getElementById("destacado").checked,
    orden: Number(document.getElementById("orden_paquete").value || 1),
    estado: document.getElementById("estado_paquete").checked
  };

  try {
    if (recordId) {
      await apiSend(`/api/paquetes/${recordId}`, "PATCH", paquete);
      alert("Paquete actualizado correctamente");
    } else {
      await apiSend("/api/paquetes", "POST", paquete);
      alert("Paquete creado correctamente");
    }

    limpiarPaqueteForm();
    cargarPaquetes();
  } catch (error) {
    alert(error.message);
  }
});

paquetesBody.addEventListener("click", async (event) => {
  const id = event.target.dataset.id;

  if (!id) return;

  if (event.target.classList.contains("editar-paquete")) {
    const paquete = paquetes.find((item) => item.recordId === id);

    if (!paquete) return;

    document.getElementById("paqueteRecordId").value = paquete.recordId;
    document.getElementById("nombre_paquete").value = paquete.nombre_paquete || "";
    document.getElementById("descripcion_paquete").value = paquete.descripcion || "";
    document.getElementById("precio_base_paquete").value = paquete.precio_base || 0;
    document.getElementById("duracion_estimada").value = paquete.duracion_estimada || "";
    document.getElementById("caracteristicas").value = paquete.caracteristicas || "";
    document.getElementById("destacado").checked = Boolean(paquete.destacado);
    document.getElementById("orden_paquete").value = paquete.orden || 1;
    document.getElementById("estado_paquete").checked = Boolean(paquete.estado);

    document.getElementById("paqueteFormTitle").textContent = "Editar paquete";

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  if (event.target.classList.contains("eliminar-paquete")) {
    const confirmar = confirm("¿Seguro que deseas eliminar este paquete?");

    if (!confirmar) return;

    try {
      await apiDelete(`/api/paquetes/${id}`);
      alert("Paquete eliminado");
      cargarPaquetes();
    } catch (error) {
      alert(error.message);
    }
  }
});

function limpiarPaqueteForm() {
  paqueteForm.reset();
  document.getElementById("paqueteRecordId").value = "";
  document.getElementById("estado_paquete").checked = true;
  document.getElementById("paqueteFormTitle").textContent = "Nuevo paquete";
}

document.getElementById("cancelarPaquete").addEventListener("click", limpiarPaqueteForm);

/* =========================
   GALERÍA
========================= */

async function cargarGaleria() {
  try {
    galeria = (await apiGet("/api/galeria")).filter(
      item => item.titulo || item.imagen_url || item.orden
    );

    renderGaleria();
  } catch (error) {
    console.error(error);
    galeriaBody.innerHTML = `<tr><td colspan="5">Error al cargar galería.</td></tr>`;
  }
}

function renderGaleria() {
  galeriaBody.innerHTML = "";

  if (!galeria.length) {
    galeriaBody.innerHTML = `<tr><td colspan="5">No hay imágenes registradas.</td></tr>`;
    return;
  }

  galeria.forEach((imagen) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${cleanText(imagen.orden)}</td>
      <td>
        <strong>${cleanText(imagen.titulo)}</strong><br>
        <small>${cleanText(imagen.imagen_url)}</small>
      </td>
      <td>${cleanText(imagen.categoria)}</td>
      <td>${statusBadge(imagen.estado)}</td>
      <td>
        <div class="row-actions">
          <button class="small editar-galeria" data-id="${imagen.recordId}">Editar</button>
          <button class="small danger eliminar-galeria" data-id="${imagen.recordId}">Eliminar</button>
        </div>
      </td>
    `;

    galeriaBody.appendChild(tr);
  });
}

galeriaForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const recordId = document.getElementById("galeriaRecordId").value;

  const imagen = {
    titulo: document.getElementById("titulo_galeria").value.trim(),
    imagen_url: document.getElementById("imagen_url_galeria").value.trim(),
    descripcion_alt: document.getElementById("descripcion_alt_galeria").value.trim(),
    categoria: document.getElementById("categoria_galeria").value.trim(),
    orden: Number(document.getElementById("orden_galeria").value || 1),
    estado: document.getElementById("estado_galeria").checked
  };

  try {
    if (recordId) {
      await apiSend(`/api/galeria/${recordId}`, "PATCH", imagen);
      alert("Imagen actualizada correctamente");
    } else {
      await apiSend("/api/galeria", "POST", imagen);
      alert("Imagen creada correctamente");
    }

    limpiarGaleriaForm();
    cargarGaleria();
  } catch (error) {
    alert(error.message);
  }
});

galeriaBody.addEventListener("click", async (event) => {
  const id = event.target.dataset.id;

  if (!id) return;

  if (event.target.classList.contains("editar-galeria")) {
    const imagen = galeria.find((item) => item.recordId === id);

    if (!imagen) return;

    document.getElementById("galeriaRecordId").value = imagen.recordId;
    document.getElementById("titulo_galeria").value = imagen.titulo || "";
    document.getElementById("imagen_url_galeria").value = imagen.imagen_url || "";
    document.getElementById("descripcion_alt_galeria").value = imagen.descripcion_alt || "";
    document.getElementById("categoria_galeria").value = imagen.categoria || "";
    document.getElementById("orden_galeria").value = imagen.orden || 1;
    document.getElementById("estado_galeria").checked = Boolean(imagen.estado);

    document.getElementById("galeriaFormTitle").textContent = "Editar imagen";

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  if (event.target.classList.contains("eliminar-galeria")) {
    const confirmar = confirm("¿Seguro que deseas eliminar esta imagen?");

    if (!confirmar) return;

    try {
      await apiDelete(`/api/galeria/${id}`);
      alert("Imagen eliminada");
      cargarGaleria();
    } catch (error) {
      alert(error.message);
    }
  }
});

function limpiarGaleriaForm() {
  galeriaForm.reset();
  document.getElementById("galeriaRecordId").value = "";
  document.getElementById("estado_galeria").checked = true;
  document.getElementById("galeriaFormTitle").textContent = "Nueva imagen";
}

document.getElementById("cancelarGaleria").addEventListener("click", limpiarGaleriaForm);

/* =========================
   SOLICITUDES
========================= */

async function cargarSolicitudes() {
  try {
    solicitudes = (await apiGet("/api/solicitudes")).filter(
      item => item.nombre_cliente || item.correo || item.telefono || item.descripcion_evento
    );

    renderSolicitudes();
  } catch (error) {
    console.error(error);
    solicitudesBody.innerHTML = `<tr><td colspan="8">Error al cargar solicitudes.</td></tr>`;
  }
}

function renderSolicitudes() {
  solicitudesBody.innerHTML = "";

  if (!solicitudes.length) {
    solicitudesBody.innerHTML = `<tr><td colspan="8">No hay solicitudes registradas.</td></tr>`;
    return;
  }

  solicitudes.forEach((solicitud) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${cleanText(solicitud.id_solicitud)}</td>
      <td>
        <strong>${cleanText(solicitud.nombre_cliente)}</strong><br>
        <small>${cleanText(solicitud.descripcion_evento)}</small>
      </td>
      <td>
        ${cleanText(solicitud.correo)}<br>
        <small>${cleanText(solicitud.telefono)}</small>
      </td>
      <td>
        ${cleanText(solicitud.tipo_evento)}<br>
        <small>${cleanText(solicitud.paquete_interes)}</small>
      </td>
      <td>${cleanText(solicitud.fecha_evento)}</td>
      <td>${cleanText(solicitud.presupuesto_estimado)}</td>
      <td>
        <select class="estado-solicitud" data-id="${solicitud.recordId}">
          <option value="Nueva" ${solicitud.estado_solicitud === "Nueva" ? "selected" : ""}>Nueva</option>
          <option value="En revisión" ${solicitud.estado_solicitud === "En revisión" ? "selected" : ""}>En revisión</option>
          <option value="Contactado" ${solicitud.estado_solicitud === "Contactado" ? "selected" : ""}>Contactado</option>
          <option value="Aprobada" ${solicitud.estado_solicitud === "Aprobada" ? "selected" : ""}>Aprobada</option>
          <option value="Cancelada" ${solicitud.estado_solicitud === "Cancelada" ? "selected" : ""}>Cancelada</option>
        </select>
      </td>
      <td>
        <div class="row-actions">
          <button class="small guardar-estado" data-id="${solicitud.recordId}">Guardar</button>
          <button class="small danger eliminar-solicitud" data-id="${solicitud.recordId}">Eliminar</button>
        </div>
      </td>
    `;

    solicitudesBody.appendChild(tr);
  });
}

solicitudesBody.addEventListener("click", async (event) => {
  const id = event.target.dataset.id;

  if (!id) return;

  if (event.target.classList.contains("guardar-estado")) {
    const select = solicitudesBody.querySelector(`select[data-id="${id}"]`);
    const nuevoEstado = select.value;

    try {
      await apiSend(`/api/solicitudes/${id}`, "PATCH", {
        estado_solicitud: nuevoEstado
      });

      alert("Estado actualizado");
      cargarSolicitudes();
    } catch (error) {
      alert(error.message);
    }
  }

  if (event.target.classList.contains("eliminar-solicitud")) {
    const confirmar = confirm("¿Seguro que deseas eliminar esta solicitud?");

    if (!confirmar) return;

    try {
      await apiDelete(`/api/solicitudes/${id}`);
      alert("Solicitud eliminada");
      cargarSolicitudes();
    } catch (error) {
      alert(error.message);
    }
  }
});

btnRecargar.addEventListener("click", cargarTodo);

cargarTodo();