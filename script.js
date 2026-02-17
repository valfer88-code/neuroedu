// --- 1. CONFIGURACIÓN DE TESTS ---
const TESTS = {
    tdah: { 
        titulo: "Evaluación TDAH (DSM-5)", 
        items: [
            {q: "Dificultad para mantener la atención en tareas", cat: "Atención"}, 
            {q: "Parece no escuchar cuando se le habla directamente", cat: "Atención"},
            {q: "Mueve en exceso manos o pies o se remueve en el asiento", cat: "Motor"}, 
            {q: "Corre o salta excesivamente en situaciones inapropiadas", cat: "Motor"},
            {q: "Responde inesperadamente antes de concluir la pregunta", cat: "Control"},
            {q: "Le es difícil esperar su turno", cat: "Control"}
        ]
    },
    ejecutivas: { 
        titulo: "Funciones Ejecutivas", 
        items: [
            {q: "Capacidad para retener y manipular información", cat: "Memoria"}, 
            {q: "Habilidad para organizar tareas y materiales", cat: "Planificación"}, 
            {q: "Adaptación ante cambios en las reglas o tareas", cat: "Flexibilidad"},
            {q: "Capacidad para iniciar tareas de forma independiente", cat: "Iniciación"},
            {q: "Control de impulsos y respuestas automáticas", cat: "Inhibición"}
        ]
    }
};

// --- 2. ESTADO GLOBAL ---
let pacientes = JSON.parse(localStorage.getItem('pacientes')) || [];
let turnos = JSON.parse(localStorage.getItem('turnos')) || [];
let historial = JSON.parse(localStorage.getItem('historial')) || [];
let usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
let sesion = JSON.parse(localStorage.getItem('sesion')) || null;
let calendar = null;
let miGrafico = null; 
let miGraficoEvolucion = null;
let isRegistro = false;

// --- 3. INICIALIZACIÓN ---
window.onload = () => {
    verificarSesion();
    actualizarVistas();
    if(document.getElementById('tipo-test')) renderPreguntas();
};

function verificarSesion() {
    const authBox = document.getElementById('auth-container');
    if (!sesion) {
        if(authBox) authBox.style.display = 'flex';
    } else {
        if(authBox) authBox.style.display = 'none';
        document.getElementById('display-profesional').innerText = sesion.firma || sesion.u;
        document.getElementById('avatar-letra').innerText = (sesion.firma || sesion.u).charAt(0).toUpperCase();
        if(document.getElementById('perf-firma')) document.getElementById('perf-firma').value = sesion.firma || "";
    }
}

// --- 4. NAVEGACIÓN Y AUTH ---
function navegar(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    
    const section = document.getElementById(id);
    if(section) section.classList.add('active');

    const navItem = document.querySelector(`[onclick="navegar('${id}')"]`);
    if(navItem) navItem.classList.add('active');

    if (window.innerWidth <= 992) {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('overlay').classList.remove('active');
    }
    
    if (id === 'agenda') setTimeout(initCalendar, 200);
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('active');
}

function toggleAuthMode() {
    isRegistro = !isRegistro;
    document.getElementById('btn-auth-action').innerText = isRegistro ? "Crear Cuenta" : "Iniciar Sesión";
    document.getElementById('auth-toggle-msg').innerText = isRegistro ? "¿Ya tienes cuenta? Ingresa aquí" : "¿Eres nuevo? Regístrate aquí";
}

function procesarAuth() {
    const u = document.getElementById('auth-user').value;
    const p = document.getElementById('auth-pass').value;
    if(!u || !p) return alert("Complete todos los campos");

    if (isRegistro) {
        if(usuarios.find(x => x.u === u)) return alert("El usuario ya existe");
        let user = {u, p, firma: u};
        usuarios.push(user);
        localStorage.setItem('usuarios', JSON.stringify(usuarios));
        sesion = user;
    } else {
        sesion = usuarios.find(x => x.u === u && x.p === p);
        if(!sesion) return alert("Credenciales incorrectas");
    }
    localStorage.setItem('sesion', JSON.stringify(sesion));
    location.reload();
}

function cerrarSesion() { localStorage.removeItem('sesion'); location.reload(); }

// --- 5. GESTIÓN DE PACIENTES ---
function guardarPaciente() {
    const idEdit = document.getElementById('p-id-edit').value;
    const p = {
        dni: document.getElementById('p-dni').value,
        nombre: document.getElementById('p-nombre').value,
        edad: document.getElementById('p-edad').value,
        mutual: document.getElementById('p-mutual').value
    };
    if(!p.nombre || !p.dni) return alert("Nombre y DNI obligatorios");

    if(idEdit === "") pacientes.push(p);
    else pacientes[parseInt(idEdit)] = p;
    
    localStorage.setItem('pacientes', JSON.stringify(pacientes));
    actualizarVistas();
    limpiarFormPaciente();
    alert("Paciente guardado con éxito");
}

function editarPaciente(i) {
    const p = pacientes[i];
    document.getElementById('p-dni').value = p.dni;
    document.getElementById('p-nombre').value = p.nombre;
    document.getElementById('p-edad').value = p.edad;
    document.getElementById('p-mutual').value = p.mutual;
    document.getElementById('p-id-edit').value = i;
    document.getElementById('titulo-paciente-form').innerText = "Editando Registro";
    navegar('pacientes');
}

function filtrarPacientes() {
    const q = document.getElementById('inputBuscarPaciente').value.toLowerCase();
    const filtrados = pacientes.filter(p => p.nombre.toLowerCase().includes(q) || p.dni.includes(q));
    renderTablaPacientes(filtrados);
}

function renderTablaPacientes(lista) {
    const tbody = document.getElementById('lista-pacientes-tabla');
    if(!tbody) return;
    tbody.innerHTML = lista.map((p, i) => `
        <tr>
            <td>${p.dni}</td>
            <td><strong>${p.nombre}</strong></td>
            <td>${p.mutual}</td>
            <td><button class="btn-primary" onclick="editarPaciente(${i})">Editar</button></td>
        </tr>
    `).join('');
}

function limpiarFormPaciente() {
    document.getElementById('p-id-edit').value = "";
    document.getElementById('titulo-paciente-form').innerText = "Nuevo Registro";
    ["p-nombre", "p-dni", "p-edad", "p-mutual"].forEach(id => document.getElementById(id).value = "");
}

// --- 6. AGENDA ---
function initCalendar() {
    const el = document.getElementById('calendar');
    if(!el) return;
    if(calendar) calendar.destroy();
    calendar = new FullCalendar.Calendar(el, {
        initialView: 'dayGridMonth',
        locale: 'es',
        events: turnos.map(t => ({ id: t.id, title: t.title, start: t.start, color: '#4EADA5' })),
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

    // Validación de seguridad
    if(!fechaHora || pIdx === "") return alert("Debe seleccionar un paciente y una fecha.");
    if(!pacientes[pIdx]) return alert("El paciente seleccionado no existe.");

    const data = { 
        id: idEdit || Date.now().toString(), 
        title: pacientes[pIdx].nombre, 
        start: fechaHora, 
        pIdx: pIdx 
    };

    if(!idEdit) {
        turnos.push(data);
    } else { 
        const i = turnos.findIndex(x => x.id == idEdit); 
        if(i !== -1) turnos[i] = data; 
    }

    localStorage.setItem('turnos', JSON.stringify(turnos));
    resetTurnoForm();
    initCalendar(); // Refresca el calendario inmediatamente
    alert("Turno guardado correctamente");
}

function cargarTurnoEditar(t) {
    document.getElementById('turno-paciente').value = t.pIdx;
    document.getElementById('turno-fecha').value = t.start;
    document.getElementById('turno-id-edit').value = t.id;
    document.getElementById('btn-delete-turno').style.display = "block";
    document.getElementById('titulo-turno-form').innerText = "Editar Turno";
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
    document.getElementById('turno-fecha').value = "";
    document.getElementById('titulo-turno-form').innerText = "Programar Turno";
}

// --- 7. EVALUACIÓN Y DASHBOARD (INFORME INDIVIDUAL) ---
function renderPreguntas() {
    const tipo = document.getElementById('tipo-test').value;
    const container = document.getElementById('preguntas-dinamicas');
    if(!container) return;
    container.innerHTML = TESTS[tipo].items.map(item => `
        <div class="card" style="margin-bottom:10px; display: flex; justify-content: space-between; align-items: center;">
            <p style="margin:0;"><strong>${item.q}</strong></p>
            <select class="score-in" data-cat="${item.cat}">
                <option value="1">1 - Deficitario</option>
                <option value="2">2 - Inferior</option>
                <option value="3" selected>3 - Promedio</option>
                <option value="4">4 - Superior</option>
            </select>
        </div>
    `).join('');
}

function finalizarTest() {
    const pIdx = document.getElementById('test-paciente').value;
    if(pIdx === "") return alert("Seleccione un paciente");
    
    const p = pacientes[pIdx];
    const tKey = document.getElementById('tipo-test').value;
    const scores = Array.from(document.querySelectorAll('.score-in')).map(s => ({
        cat: s.dataset.cat, 
        val: parseInt(s.value)
    }));
    
    const data = {
        paciente: p.nombre, dni: p.dni, test: TESTS[tKey].titulo, 
        fecha: new Date().toLocaleString(), scores, profesional: sesion.firma || sesion.u
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

    const valores = data.scores.map(s => s.val);
    const promedio = (valores.reduce((a, b) => a + b, 0) / valores.length).toFixed(1);
    const areaCritica = data.scores.reduce((min, p) => p.val < min.val ? p : min, data.scores[0]);
    const fortaleza = data.scores.reduce((max, p) => p.val > max.val ? p : max, data.scores[0]);

    document.getElementById('dash-nivel-global').innerText = promedio + " / 4";
    document.getElementById('dash-area-critica').innerText = areaCritica.cat;
    document.getElementById('dash-fortaleza').innerText = fortaleza.cat;
    
    // Conclusión editable en el dashboard
    document.getElementById('rep-analisis').innerHTML = `
        <textarea id="edit-conclusion-dash" style="width:100%; min-height:100px; border:1px solid #eee; padding:10px; font-family:inherit;">Informe: El paciente presenta un desempeño global de ${promedio}/4. Punto crítico: ${areaCritica.cat}. Fortaleza: ${fortaleza.cat}.</textarea>
    `;

    navegar('dashboard');
    
    setTimeout(() => {
        const ctx = document.getElementById('canvasGrafico').getContext('2d');
        if(miGrafico) miGrafico.destroy();
        miGrafico = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: data.scores.map(s => s.cat),
                datasets: [{
                    label: 'Nivel Cognitivo',
                    data: data.scores.map(s => s.val),
                    backgroundColor: 'rgba(78, 173, 165, 0.4)',
                    borderColor: '#4EADA5',
                    borderWidth: 3
                }]
            },
            options: {
                scales: { r: { min: 0, max: 4, ticks: { stepSize: 1, display: false } } },
                responsive: true,
                maintainAspectRatio: false,
                animation: false
            }
        });
    }, 400);
}

// --- 8. EXPORTACIÓN PDF (SISTEMA UNIFICADO) ---
async function exportarPDF() {
    const element = document.getElementById('seccion-informe');
    const nombreP = document.getElementById('rep-nombre').innerText || "Informe";

    // Convertir el radar a imagen fija antes de exportar
    const canvas = document.getElementById('canvasGrafico');
    const imgData = canvas.toDataURL("image/png");
    const container = canvas.parentElement;
    container.innerHTML = `<img src="${imgData}" style="width:100%; height:auto;">`;

    const opt = {
        margin: 10,
        filename: `Evaluacion_${nombreP}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        await html2pdf().set(opt).from(element).save();
        // Restaurar el canvas después de exportar
        location.reload(); 
    } catch (e) { alert("Error al generar PDF"); }
}

// --- 9. EVOLUCIÓN ---
function renderGraficoEvolucion() {
    const nombrePaciente = document.getElementById('evo-paciente').value;
    const canvas = document.getElementById('canvasEvolucion');
    if (!canvas || !nombrePaciente) return;
    
    const ctx = canvas.getContext('2d');
    const informesPaciente = historial
        .filter(h => h.paciente === nombrePaciente)
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    if (informesPaciente.length === 0) {
        if(miGraficoEvolucion) miGraficoEvolucion.destroy();
        return;
    }

    const etiquetas = informesPaciente.map(h => h.fecha.split(',')[0]);
    const promedios = informesPaciente.map(h => {
        const suma = h.scores.reduce((a, b) => a + b.val, 0);
        return (suma / h.scores.length).toFixed(2);
    });

    if (miGraficoEvolucion) miGraficoEvolucion.destroy();
    miGraficoEvolucion = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: etiquetas,
            datasets: [{
                label: 'Promedio Cognitivo',
                data: promedios,
                backgroundColor: '#4EADA5',
                borderRadius: 5
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            animation: false,
            scales: { y: { min: 0, max: 4 } }
        }
    });
}
// --- FUNCIÓN PARA PREPARAR LA VISTA (Asegura que los datos existan) ---
// --- PREPARAR VISTA PREVIA PROFESIONAL ---
function prepararInforme() {
    const nombre = document.getElementById('evo-paciente').value;
    if (!nombre) return alert("Seleccione un paciente primero.");
    
    const canvas = document.getElementById('canvasEvolucion');
    if (!canvas || !miGraficoEvolucion) return alert("Genere el gráfico de evolución antes de preparar el informe.");

    const p = pacientes.find(x => x.nombre === nombre);
    const informeContenedor = document.getElementById('informe-final-a4');
    
    // Asegurar visibilidad
    informeContenedor.style.display = 'block';

    // Inyectar datos con diseño de membrete
    document.getElementById('print-datos-paciente').innerHTML = `
        <div style="border-bottom: 2px solid #4EADA5; padding-bottom: 10px; margin-bottom: 20px;">
            <h2 style="color: #4EADA5; margin: 0;">INFORME DE EVOLUCIÓN COGNITIVA</h2>
            <p style="margin: 5px 0; font-size: 14px; color: #666;">NeuroEdu - Gestión Psicotécnica</p>
        </div>
        <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr>
                <td style="padding: 5px 0;"><strong>Paciente:</strong> ${p.nombre}</td>
                <td style="padding: 5px 0;"><strong>DNI:</strong> ${p.dni}</td>
            </tr>
            <tr>
                <td style="padding: 5px 0;"><strong>Edad:</strong> ${p.edad} años</td>
                <td style="padding: 5px 0;"><strong>Fecha de Emisión:</strong> ${new Date().toLocaleDateString()}</td>
            </tr>
            <tr>
                <td style="padding: 5px 0;"><strong>Obra Social:</strong> ${p.mutual || 'No especificada'}</td>
                <td></td>
            </tr>
        </table>
    `;
    
    // Sincronizar Conclusión
    const conclusion = document.getElementById('evo-conclusion-input').value;
    document.getElementById('print-conclusion-texto').innerHTML = `
        <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #4EADA5; margin-top: 20px;">
            <p style="margin: 0; white-space: pre-wrap;">${conclusion || "No se registran observaciones adicionales."}</p>
        </div>
    `;

    // Captura del Gráfico: Canvas -> Imagen Base64
    const imgData = canvas.toDataURL("image/png", 1.0);
    document.getElementById('print-grafico-img').innerHTML = `
        <div style="text-align: center; margin: 30px 0;">
            <p style="font-size: 12px; color: #888; margin-bottom: 10px;">Gráfico de Rendimiento Histórico (Promedios)</p>
            <img src="${imgData}" style="width: 100%; max-width: 600px; height: auto; border: 1px solid #eee;">
        </div>
    `;
// Dentro de tu función prepararInforme()...
document.getElementById('print-grafico-img').innerHTML = `
    <div style="text-align: center; margin: 10px 0;">
        <img src="${imgData}" id="img-grafico-final" style="width: 70%; max-height: 280px; object-fit: contain;">
    </div>
`;
    // Firma
    document.getElementById('print-firma').innerHTML = `
        <div style="margin-top: 50px; text-align: right; border-top: 1px solid #ccc; display: inline-block; float: right; padding-top: 10px; min-width: 200px;">
            <strong>${sesion.firma || sesion.u}</strong><br>
            <span style="font-size: 12px; color: #666;">Profesional a cargo</span>
        </div>
        <div style="clear: both;"></div>
    `;

    informeContenedor.scrollIntoView({ behavior: 'smooth' });
}


// --- FUNCIÓN DE DESCARGA (Solución al PDF en blanco) ---
async function exportarEvaluacionIndividualPDF() {
    const original = document.getElementById('informe-final-a4');
    const nombreP = document.getElementById('evo-paciente').value || "Informe";

    if (!original || original.style.display === 'none') {
        return alert("Primero genere el informe para verlo en pantalla.");
    }

    // 1. CLONACIÓN Y RESETEO DE MÁRGENES
    const clon = original.cloneNode(true);
    
    // Forzamos al clon a ser una "columna" central estrecha
    Object.assign(clon.style, {
        display: 'block',
        position: 'absolute',
        left: '0',
        top: '0',
        width: '180mm',      // Ancho menor al A4 (210mm) para evitar cortes
        margin: '0 auto',    // Centrado
        padding: '10mm',
        backgroundColor: 'white',
        zIndex: '-9999',
        fontSize: '14px'
    });

    // 2. AJUSTE DE IMAGEN (GRÁFICO)
    // En tu PDF el gráfico se ve bien de tamaño, pero descentrado.
    const img = clon.querySelector('img');
    if (img) {
        img.style.width = '100%';
        img.style.maxWidth = '160mm';
        img.style.height = 'auto';
        img.style.display = 'block';
        img.style.margin = '10px auto';
    }

    document.body.appendChild(clon);

    // 3. CONFIGURACIÓN DE CAPTURA ESTRICTA
    const opt = {
        margin: 5, // Margen mínimo en el PDF
        filename: `Evolucion_${nombreP}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2,
            useCORS: true,
            // Forzamos a la cámara a capturar un ancho "móvil/vertical"
            windowWidth: 800, 
            width: 800,
            x: 0, // Asegura que empiece desde el borde izquierdo del clon
            scrollY: 0
        },
        jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait' 
        }
    };

    try {
        await new Promise(r => setTimeout(r, 200));
        await html2pdf().set(opt).from(clon).save();
    } catch (e) {
        console.error("Error:", e);
    } finally {
        document.body.removeChild(clon);
    }
}
// --- 10. SISTEMA Y BACKUP ---
function actualizarVistas() {
    renderTablaPacientes(pacientes);
    const options = pacientes.map((p, i) => `<option value="${i}">${p.nombre}</option>`).join('');
    const optionsName = '<option value="">-- Seleccione --</option>' + pacientes.map(p => `<option value="${p.nombre}">${p.nombre}</option>`).join('');
    
    if(document.getElementById('turno-paciente')) document.getElementById('turno-paciente').innerHTML = options;
    if(document.getElementById('test-paciente')) document.getElementById('test-paciente').innerHTML = options;
    if(document.getElementById('evo-paciente')) document.getElementById('evo-paciente').innerHTML = optionsName;
    
    renderHistorial(historial);
}

function renderHistorial(lista) {
    const tabla = document.getElementById('tabla-historial');
    if(!tabla) return;
    tabla.innerHTML = lista.map((h, i) => `
        <tr>
            <td>${h.fecha}</td>
            <td><strong>${h.paciente}</strong></td>
            <td>${h.test}</td>
            <td>
                <button class="btn-primary" onclick="verInformeHistorial(${i})"><i class="fas fa-eye"></i></button>
                <button class="btn-danger" onclick="eliminarHistorial(${i})" style="background:#ef4444; margin-left:5px;"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function verInformeHistorial(i) { mostrarInforme(historial[i]); }

function eliminarHistorial(i) {
    if(confirm("¿Eliminar informe?")) {
        historial.splice(i, 1);
        localStorage.setItem('historial', JSON.stringify(historial));
        actualizarVistas();
    }
}

function exportarDatos() {
    const backup = { pacientes, turnos, historial, usuarios };
    const blob = new Blob([JSON.stringify(backup)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = "backup_neuroedu.json"; a.click();
}

function importarDatos() { document.getElementById('input-importar').click(); }

function procesarArchivoBackup(event) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const c = JSON.parse(e.target.result);
            localStorage.setItem('pacientes', JSON.stringify(c.pacientes || []));
            localStorage.setItem('turnos', JSON.stringify(c.turnos || []));
            localStorage.setItem('historial', JSON.stringify(c.historial || []));
            localStorage.setItem('usuarios', JSON.stringify(c.usuarios || []));
            location.reload();
        } catch(err) { alert("Archivo no válido"); }
    };
    reader.readAsText(event.target.files[0]);
}

function actualizarPerfil() {
    sesion.firma = document.getElementById('perf-firma').value;
    localStorage.setItem('sesion', JSON.stringify(sesion));
    document.getElementById('display-profesional').innerText = sesion.firma;
    alert("Firma actualizada");
}

function filtrarHistorial() {
    const q = document.getElementById('inputBuscarHistorial').value.toLowerCase();
    const f = historial.filter(h => h.paciente.toLowerCase().includes(q) || h.dni.includes(q));
    renderHistorial(f);

}
