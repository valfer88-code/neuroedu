// --- CONFIGURACIÓN DE TESTS ---
const TESTS = {
    tdah: { titulo: "Evaluación TDAH (DSM-5)", items: [{q: "Dificultad de atención", cat: "Atención"}, {q: "Hiperactividad motora", cat: "Motor"}, {q: "Impulsividad cognitiva", cat: "Control"}]},
    ejecutivas: { titulo: "Funciones Ejecutivas", items: [{q: "Memoria de Trabajo", cat: "Memoria"}, {q: "Planificación Estratégica", cat: "Plan"}, {q: "Flexibilidad Mental", cat: "Flexibilidad"}]}
};

// --- ESTADO GLOBAL ---
let pacientes = JSON.parse(localStorage.getItem('pacientes')) || [];
let turnos = JSON.parse(localStorage.getItem('turnos')) || [];
let historial = JSON.parse(localStorage.getItem('historial')) || [];
let usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
let sesion = JSON.parse(localStorage.getItem('sesion')) || null;
let calendar = null;
let isRegistro = false;

// --- INICIALIZACIÓN ---
window.onload = () => {
    verificarSesion();
    actualizarVistas();
    renderPreguntas();
};

function verificarSesion() {
    const authBox = document.getElementById('auth-container');
    if (!sesion) {
        authBox.style.display = 'flex';
    } else {
        authBox.style.display = 'none';
        document.getElementById('display-profesional').innerText = sesion.firma || sesion.u;
        document.getElementById('avatar-letra').innerText = (sesion.firma || sesion.u).charAt(0).toUpperCase();
        document.getElementById('perf-firma').value = sesion.firma || "";
    }
}

// --- AUTENTICACIÓN ---
function toggleAuthMode() {
    isRegistro = !isRegistro;
    document.getElementById('btn-auth-action').innerText = isRegistro ? "Crear Mi Cuenta" : "Iniciar Sesión";
    document.getElementById('auth-toggle-msg').innerText = isRegistro ? "¿Ya tienes cuenta? Ingresa aquí" : "¿Eres nuevo? Regístrate aquí";
}

function procesarAuth() {
    const u = document.getElementById('auth-user').value;
    const p = document.getElementById('auth-pass').value;
    if(!u || !p) return alert("Por favor complete todos los campos.");

    if (isRegistro) {
        if(usuarios.find(x => x.u === u)) return alert("El usuario ya existe.");
        let user = {u, p, firma: u};
        usuarios.push(user);
        localStorage.setItem('usuarios', JSON.stringify(usuarios));
        sesion = user;
    } else {
        sesion = usuarios.find(x => x.u === u && x.p === p);
        if(!sesion) return alert("Usuario o contraseña incorrectos.");
    }
    localStorage.setItem('sesion', JSON.stringify(sesion));
    location.reload();
}

function cerrarSesion() { localStorage.removeItem('sesion'); location.reload(); }

// --- NAVEGACIÓN ---
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('active');
}

function navegar(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    
    document.getElementById(id).classList.add('active');
    // Marcar item de menú activo
    const items = document.querySelectorAll('.nav-item');
    items.forEach(item => {
        if(item.onclick.toString().includes(id)) item.classList.add('active');
    });

    if (window.innerWidth <= 992) toggleSidebar();
    if (id === 'agenda') setTimeout(initCalendar, 200);
}

// --- GESTIÓN DE PACIENTES ---
function guardarPaciente() {
    const id = document.getElementById('p-id-edit').value;
    const p = {
        dni: document.getElementById('p-dni').value,
        nombre: document.getElementById('p-nombre').value,
        edad: document.getElementById('p-edad').value,
        mutual: document.getElementById('p-mutual').value
    };
    if(!p.nombre || !p.dni) return alert("Nombre y DNI son campos obligatorios.");

    if(id === "") pacientes.push(p);
    else { pacientes[id] = p; }
    
    localStorage.setItem('pacientes', JSON.stringify(pacientes));
    actualizarVistas();
    limpiarFormPaciente();
    alert("Paciente guardado con éxito.");
}

function editarPaciente(i) {
    const p = pacientes[i];
    document.getElementById('p-dni').value = p.dni;
    document.getElementById('p-nombre').value = p.nombre;
    document.getElementById('p-edad').value = p.edad;
    document.getElementById('p-mutual').value = p.mutual;
    document.getElementById('p-id-edit').value = i;
    document.getElementById('titulo-paciente-form').innerText = "Editando Legajo";
    window.scrollTo(0,0);
}

function limpiarFormPaciente() {
    document.getElementById('p-id-edit').value = "";
    document.getElementById('titulo-paciente-form').innerText = "Nuevo Registro";
    ["p-nombre", "p-dni", "p-edad", "p-mutual"].forEach(id => document.getElementById(id).value = "");
}

function actualizarVistas() {
    const tbody = document.getElementById('lista-pacientes-tabla');
    tbody.innerHTML = pacientes.map((p, i) => `
        <tr>
            <td>${p.dni}</td>
            <td><strong>${p.nombre}</strong></td>
            <td>${p.mutual}</td>
            <td><button class="btn-primary" style="padding:5px 10px; font-size:0.8rem" onclick="editarPaciente(${i})">Editar</button></td>
        </tr>
    `).join('');

    const options = pacientes.map((p, i) => `<option value="${i}">${p.nombre}</option>`).join('');
    document.getElementById('turno-paciente').innerHTML = options;
    document.getElementById('test-paciente').innerHTML = options;
    renderHistorial(historial);
}

// --- AGENDA & VALIDACIÓN DE CONFLICTOS ---
function initCalendar() {
    const el = document.getElementById('calendar');
    if(calendar) calendar.destroy();
    
    calendar = new FullCalendar.Calendar(el, {
        initialView: 'dayGridMonth',
        locale: 'es',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' },
        events: turnos.map(t => ({ id: t.id, title: t.title, start: t.start, color: '#2563eb' })),
        eventClick: (info) => {
            const t = turnos.find(x => x.id == info.event.id);
            if(t) cargarTurnoEditar(t);
        }
    });
    calendar.render();
}

function guardarTurno() {
    const pIdx = document.getElementById('turno-paciente').value;
    const fechaHora = document.getElementById('turno-fecha').value;
    const idEdit = document.getElementById('turno-id-edit').value;

    if(!fechaHora || pIdx === "") return alert("Complete paciente y horario.");

    // VALIDACIÓN DE OCUPADO
    const hayConflicto = turnos.some(t => t.start === fechaHora && t.id !== idEdit);
    if(hayConflicto) {
        return alert("⚠️ ERROR: Este horario ya está ocupado por otro turno. Por favor elija otro.");
    }

    const data = { id: idEdit || Date.now().toString(), title: pacientes[pIdx].nombre, start: fechaHora, pIdx };
    
    if(!idEdit) turnos.push(data);
    else { const i = turnos.findIndex(x => x.id == idEdit); turnos[i] = data; }

    localStorage.setItem('turnos', JSON.stringify(turnos));
    resetTurnoForm();
    initCalendar();
}

function cargarTurnoEditar(t) {
    document.getElementById('turno-paciente').value = t.pIdx;
    document.getElementById('turno-fecha').value = t.start;
    document.getElementById('turno-id-edit').value = t.id;
    document.getElementById('btn-delete-turno').style.display = "block";
    document.getElementById('titulo-turno-form').innerText = "Modificar Turno";
}

function borrarTurno() {
    const id = document.getElementById('turno-id-edit').value;
    turnos = turnos.filter(x => x.id != id);
    localStorage.setItem('turnos', JSON.stringify(turnos));
    resetTurnoForm();
    initCalendar();
}

function resetTurnoForm() {
    document.getElementById('turno-id-edit').value = "";
    document.getElementById('btn-delete-turno').style.display = "none";
    document.getElementById('titulo-turno-form').innerText = "Programar Turno";
    document.getElementById('turno-fecha').value = "";
}

// --- EVALUACIONES ---
function renderPreguntas() {
    const tipo = document.getElementById('tipo-test').value;
    document.getElementById('preguntas-dinamicas').innerHTML = TESTS[tipo].items.map(item => `
        <div class="card" style="margin-bottom:10px;">
            <p><strong>${item.q}</strong></p>
            <select class="score-in" data-cat="${item.cat}">
                <option value="1">1 - Deficitario</option>
                <option value="2">2 - Inferior al término medio</option>
                <option value="3">3 - Término medio</option>
                <option value="4">4 - Superior</option>
            </select>
        </div>
    `).join('');
}

function finalizarTest() {
    const pIdx = document.getElementById('test-paciente').value;
    if(pIdx === "") return alert("Debe seleccionar un paciente.");
    
    const p = pacientes[pIdx];
    const tKey = document.getElementById('tipo-test').value;
    const scores = Array.from(document.querySelectorAll('.score-in')).map(s => ({cat: s.dataset.cat, val: parseInt(s.value)}));
    
    const data = {
        paciente: p.nombre, dni: p.dni, test: TESTS[tKey].titulo, 
        fecha: new Date().toLocaleString(), scores, profesional: sesion.firma
    };
    
    historial.push(data);
    localStorage.setItem('historial', JSON.stringify(historial));
    actualizarVistas();
    mostrarInforme(data);
}

function mostrarInforme(data) {
    document.getElementById('rep-nombre').innerText = data.paciente;
    document.getElementById('rep-dni').innerText = data.dni;
    document.getElementById('rep-fecha').innerText = data.fecha;
    document.getElementById('rep-test').innerText = data.test;
    document.getElementById('firma-reporte').innerText = data.profesional;
    navegar('dashboard');
    
    const ctx = document.getElementById('canvasGrafico').getContext('2d');
    if(miGrafico) miGrafico.destroy();
    window.miGrafico = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: data.scores.map(s => s.cat),
            datasets: [{
                label: 'Desempeño del Paciente',
                data: data.scores.map(s => s.val),
                backgroundColor: 'rgba(37, 99, 235, 0.2)',
                borderColor: '#2563eb',
                pointBackgroundColor: '#2563eb'
            }]
        },
        options: { scales: { r: { min: 0, max: 4, ticks: { stepSize: 1 } } } }
    });
    
    const avg = data.scores.reduce((a, b) => a + b.val, 0) / data.scores.length;
    document.getElementById('rep-analisis').innerText = avg <= 2 ? "Se sugieren adaptaciones y refuerzo en las áreas señaladas." : "El perfil cognitivo se encuentra dentro de los parámetros esperados.";
}

function renderHistorial(lista) {
    document.getElementById('tabla-historial').innerHTML = lista.map((h, i) => `
        <tr><td>${h.fecha}</td><td><strong>${h.paciente}</strong></td><td>${h.test}</td>
        <td><button class="btn-primary" onclick="verInformeHistorial(${i})">Ver Informe</button></td></tr>
    `).join('');
}

function filtrarHistorial() {
    const q = document.getElementById('searchHistorial').value.toLowerCase();
    const f = historial.filter(h => h.paciente.toLowerCase().includes(q) || h.dni.includes(q));
    renderHistorial(f);
}

function verInformeHistorial(i) { mostrarInforme(historial[i]); }

function exportarPDF() {
    const element = document.getElementById('seccion-informe');
    const opt = { margin: 10, filename: `Informe_${document.getElementById('rep-nombre').innerText}.pdf`, html2canvas: { scale: 3 }, jsPDF: { unit: 'mm', format: 'a4' } };
    html2pdf().set(opt).from(element).save();
}

function actualizarPerfil() {
    sesion.firma = document.getElementById('perf-firma').value;
    localStorage.setItem('sesion', JSON.stringify(sesion));
    document.getElementById('display-profesional').innerText = sesion.firma;
    alert("Firma actualizada.");
}

//PHP
// Reemplaza tus funciones de carga inicial por esta:
async function cargarTodaLaInfo() {
    // Cargar Pacientes
    const resP = await fetch('api.php?action=obtenerPacientes');
    pacientes = await resP.json();

    // Cargar Turnos
    const resT = await fetch('api.php?action=obtenerTurnos');
    turnos = await resT.json();

    // Cargar Historial
    const resH = await fetch('api.php?action=obtenerHistorial');
    historial = await resH.json();

    actualizarVistas(); // Tu función que dibuja las tablas
}

// Ejemplo de cómo enviar un nuevo paciente a MySQL
async function guardarPaciente() {
    const p = {
        dni: document.getElementById('p-dni').value,
        nombre: document.getElementById('p-nombre').value,
        edad: document.getElementById('p-edad').value,
        mutual: document.getElementById('p-mutual').value
    };

    await fetch('api.php?action=guardarPaciente', {
        method: 'POST',
        body: JSON.stringify(p),
        headers: { 'Content-Type': 'application/json' }
    });

    alert("Guardado en MySQL");
    cargarTodaLaInfo(); // Recargamos de la base de datos
    limpiarFormPaciente();
}