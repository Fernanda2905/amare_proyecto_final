const form = document.getElementById("clienteForm");
const clientesBody = document.getElementById("clientesBody");
const btnCancelar = document.getElementById("btnCancelar");
const btnActualizar = document.getElementById("btnActualizar");
const formTitle = document.getElementById("formTitle");
const btnGuardar = document.getElementById("btnGuardar");

const recordIdInput = document.getElementById("recordId");
const nombreInput = document.getElementById("nombre");
const apellidoInput = document.getElementById("apellido");
const correoInput = document.getElementById("correo");
const telefonoInput = document.getElementById("telefono");
const preferenciasInput = document.getElementById("preferencias_generales");
const fechaInput = document.getElementById("fecha_registro");

let clientesActuales = [];

function fechaActual() {
  return new Date().toISOString().split("T")[0];
}

fechaInput.value = fechaActual();

async function cargarClientes() {
  try {
    const response = await fetch("/api/clientes");
    const clientes = await response.json();

    clientesActuales = clientes;
    clientesBody.innerHTML = "";

    if (!clientes.length) {
      clientesBody.innerHTML = `
        <tr>
          <td colspan="8">No hay clientes registrados.</td>
        </tr>
      `;
      return;
    }

    clientes.forEach((cliente) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${cliente.id_cliente || ""}</td>
        <td>${cliente.nombre || ""}</td>
        <td>${cliente.apellido || ""}</td>
        <td>${cliente.correo || ""}</td>
        <td>${cliente.telefono || ""}</td>
        <td>${cliente.preferencias_generales || ""}</td>
        <td>${cliente.fecha_registro || ""}</td>
        <td>
          <button class="btnEdit" data-id="${cliente.recordId}">Editar</button>
          <button class="btnDelete" data-id="${cliente.recordId}">Eliminar</button>
        </td>
      `;

      clientesBody.appendChild(tr);
    });
  } catch (error) {
    console.error(error);
    clientesBody.innerHTML = `
      <tr>
        <td colspan="8">Error al cargar clientes.</td>
      </tr>
    `;
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const recordId = recordIdInput.value;

  const cliente = {
    nombre: nombreInput.value.trim(),
    apellido: apellidoInput.value.trim(),
    correo: correoInput.value.trim(),
    telefono: telefonoInput.value.trim(),
    preferencias_generales: preferenciasInput.value.trim(),
    fecha_registro: fechaInput.value
  };

  try {
    if (recordId) {
      await fetch(`/api/clientes/${recordId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(cliente)
      });

      alert("Cliente modificado correctamente");
    } else {
      await fetch("/api/clientes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(cliente)
      });

      alert("Cliente registrado correctamente");
    }

    limpiarFormulario();
    cargarClientes();
  } catch (error) {
    console.error(error);
    alert("Ocurrió un error al guardar el cliente");
  }
});

clientesBody.addEventListener("click", async (event) => {
  const recordId = event.target.dataset.id;

  if (!recordId) return;

  if (event.target.classList.contains("btnEdit")) {
    const cliente = clientesActuales.find((item) => item.recordId === recordId);

    if (!cliente) return;

    recordIdInput.value = cliente.recordId;
    nombreInput.value = cliente.nombre;
    apellidoInput.value = cliente.apellido;
    correoInput.value = cliente.correo;
    telefonoInput.value = cliente.telefono;
    preferenciasInput.value = cliente.preferencias_generales;
    fechaInput.value = cliente.fecha_registro || fechaActual();

    formTitle.textContent = "Modificar cliente";
    btnGuardar.textContent = "Guardar cambios";

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  if (event.target.classList.contains("btnDelete")) {
    const confirmar = confirm("¿Seguro que deseas eliminar este cliente?");

    if (!confirmar) return;

    try {
      await fetch(`/api/clientes/${recordId}`, {
        method: "DELETE"
      });

      alert("Cliente eliminado correctamente");
      cargarClientes();
    } catch (error) {
      console.error(error);
      alert("Ocurrió un error al eliminar el cliente");
    }
  }
});

function limpiarFormulario() {
  form.reset();
  recordIdInput.value = "";
  fechaInput.value = fechaActual();
  formTitle.textContent = "Registrar cliente";
  btnGuardar.textContent = "Guardar cliente";
}

btnCancelar.addEventListener("click", limpiarFormulario);
btnActualizar.addEventListener("click", cargarClientes);

cargarClientes();

setInterval(cargarClientes, 5000);