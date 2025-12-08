// planner/plannerView.js
import { state } from "../state.js";
import { getPensumById, normalizePensum } from "./planner.js";
import { runPlanner } from "../algorithm/plannerCore.js";
import { render } from "../utils.js";

export function plannerView() {

    if (state.pensums.length === 0)
        return `<div class="alert alert-warning">Primero debe crear o importar un pensum.</div>`;

    const opts = state.pensums
        .map(p => `<option value="${p.id}">${p.nombre}</option>`)
        .join("");

    return `
        <h2>Planificador</h2>

        <div class="mb-3">
            <label class="form-label">Seleccionar pensum</label>
            <select id="plannerPensum" class="form-select">
                <option disabled selected>-- Seleccionar --</option>
                ${opts}
            </select>
        </div>

        <div id="plannerStep2"></div>
        <div id="plannerResult"></div>
    `;
}

// Evento principal: seleccionar pensum
/* document.addEventListener("change", e => {
    if (e.target.id === "plannerPensum") {
        const id = e.target.value;
        const p = getPensumById(id);
        state.currentPensum = id;

        const materias = normalizePensum(p).materias.filter(m => m.tipo !== "electiva");

        // Crear listado de materias aprobadas
        document.getElementById("plannerStep2").innerHTML = `
            <hr>
            <h4>Materias aprobadas</h4>
            <div class="row">
                ${materias.map(m => `
                    <div class="col-6 col-md-4">
                        <div class="form-check">
                            <input class="form-check-input plannerAprobada" 
                                   type="checkbox" value="${m.codigo}">
                            <label class="form-check-label">${m.codigo} - ${m.nombre}</label>
                        </div>
                    </div>
                `).join("")}
            </div>

            <hr>
            <h4>Restricciones</h4>

            <div class="row g-3 mb-3">
                <div class="col-6 col-md-3">
                    <label class="form-label">Máx. materias por ciclo</label>
                    <input id="plannerMaxMats" type="number" min="1" value="4" class="form-control">
                </div>

                <div class="col-6 col-md-3">
                    <label class="form-label">Máx. créditos por ciclo</label>
                    <input id="plannerMaxCreds" type="number" min="1" value="18" class="form-control">
                </div>
            </div>

            <button id="plannerRun" class="btn btn-primary btn-lg">
                Generar Plan
            </button>
        `;
    }
}); */

// Evento principal: seleccionar pensum
document.addEventListener("change", e => {
    if (e.target.id === "plannerPensum") {
        const id = e.target.value;
        const p = getPensumById(id);
        state.currentPensum = id;

        const materias = normalizePensum(p).materias
            .filter(m => m.tipo !== "electiva")
            .sort((a, b) => a.cuatrimestre - b.cuatrimestre); // orden por ciclo

        // AGRUPAR POR CICLO
        const materiasPorCiclo = {};
        materias.forEach(m => {
            const c = m.cuatrimestre;
            if (!materiasPorCiclo[c]) materiasPorCiclo[c] = [];
            materiasPorCiclo[c].push(m);
        });

        // GENERAR HTML ORDENADO POR CILO
        let htmlMaterias = "";
        for (const ciclo in materiasPorCiclo) {
            htmlMaterias += `
                <h5 class="mt-3">Ciclo ${ciclo}</h5>
                <div class="row">
                    ${materiasPorCiclo[ciclo].map(m => `
                        <div class="col-6 col-md-4">
                            <div class="form-check">
                                <input class="form-check-input plannerAprobada" 
                                       type="checkbox" value="${m.codigo}">
                                <label class="form-check-label">
                                    ${m.codigo} - ${m.nombre}
                                </label>
                            </div>
                        </div>
                    `).join("")}
                </div>
            `;
        }

        // INYECTAR TODO
        document.getElementById("plannerStep2").innerHTML = `
            <hr>
            <h4>Materias aprobadas</h4>
            ${htmlMaterias}

            <hr>
            <h4>Restricciones</h4>

            <div class="row g-3 mb-3">
                <div class="col-6 col-md-3">
                    <label class="form-label">Máx. materias por ciclo</label>
                    <input id="plannerMaxMats" type="number" min="1" value="4" class="form-control">
                </div>

                <div class="col-6 col-md-3">
                    <label class="form-label">Máx. créditos por ciclo</label>
                    <input id="plannerMaxCreds" type="number" min="1" value="18" class="form-control">
                </div>
            </div>

            <button id="plannerRun" class="btn btn-primary btn-lg">
                Generar Plan
            </button>
        `;
    }
});


// Ejecutar el planificador
document.addEventListener("click", e => {
    if (e.target.id === "plannerRun") {
        const id = state.currentPensum;
        const p = getPensumById(id);

        const { materias } = normalizePensum(p);

        const aprobadas = [...document.querySelectorAll(".plannerAprobada:checked")]
            .map(c => c.value);

        const maxM = Number(document.getElementById("plannerMaxMats").value);
        const maxC = Number(document.getElementById("plannerMaxCreds").value);

        const plan = runPlanner(materias, aprobadas, maxM, maxC);

        // Mostrar resultado
        document.getElementById("plannerResult").innerHTML = renderPlannerOutput(plan, materias);

    }
});

// Mostrar resultado en tabla
/* function renderPlannerOutput(plan) {
    if (!plan || plan.length === 0)
        return `<div class="alert alert-danger mt-3">No se pudo generar un plan.</div>`;

    let html = `<hr><h3>Plan generado</h3>`;

    plan.forEach((ciclo, idx) => {
        html += `
            <h5 class="mt-3">Ciclo ${idx + 1}</h5>
            <ul class="list-group mb-2">
                ${ciclo.map(code => `<li class="list-group-item">${code}</li>`).join("")}
            </ul>
        `;
    });

    return html;
} */


/* function renderPlannerOutput(plan) {
    if (!plan || plan.length === 0)
        return `<div class="alert alert-danger mt-3">No se pudo generar un plan.</div>`;

    let html = `
        <hr>
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h3>Plan Generado</h3>
            <button id="plannerPDF" class="btn btn-outline-danger">
                Descargar PDF
            </button>
        </div>
        <div id="plannerPlanContainer">
    `;

    plan.forEach((ciclo, idx) => {
        html += `
        <div class="card mb-3 shadow-sm">
            <div class="card-header bg-primary text-white">
                <strong>Ciclo ${idx + 1}</strong>
            </div>
            <ul class="list-group list-group-flush">
                ${ciclo.map(code => `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        ${code}
                        <span class="badge bg-secondary">${code}</span>
                    </li>
                `).join("")}
            </ul>
        </div>`;
    });

    html += `</div>`;
    return html;
} */

function renderPlannerOutput(plan, materiasDB) {
    if (!plan || plan.length === 0)
        return `<div class="alert alert-danger mt-3">No se pudo generar un plan.</div>`;

    const getMateria = code => materiasDB.find(m => m.codigo === code);

    let html = `
        <hr>
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h3>Plan Generado</h3>
            <button id="plannerPDF" class="btn btn-outline-danger">
                Descargar PDF
            </button>
        </div>
        <div id="plannerPlanContainer">
    `;

    plan.forEach((ciclo, idx) => {
        html += `
        <div class="card mb-4 shadow">
            <div class="card-header bg-primary text-white">
                <strong>Ciclo ${idx + 1}</strong>
            </div>
            <ul class="list-group list-group-flush">
                ${ciclo.map(code => {
            const m = getMateria(code);
            if (!m) return ""; // seguridad

            // Formatear prerequisitos y corequisitos
            const prereq = m.prerequisitos.length > 0
                ? m.prerequisitos.join(", ")
                : "Ninguno";

            const coreq = m.corequisitos.length > 0
                ? m.corequisitos.join(", ")
                : "Ninguno";

            const reglas = m.reglas?.length
                ? m.reglas.join(", ")
                : "—";

            return `
                    <li class="list-group-item">
                        <div class="d-flex justify-content-between">
                            <div>
                                <strong>${m.codigo}</strong> — ${m.nombre}<br>
                                <small class="text-muted">
                                    Créditos: <strong>${m.creditos}</strong><br>
                                    Prerrequisitos: ${prereq}<br>
                                    Correquisitos: ${coreq}<br>
                                    Regla: ${reglas}
                                </small>
                            </div>
                        </div>
                    </li>`;
        }).join("")}
            </ul>
        </div>`;
    });

    html += `</div>`;
    return html;
}


/* document.addEventListener("click", async (e) => {
    if (e.target.id === "plannerPDF") {

        const element = document.getElementById("plannerPlanContainer");
        if (!element) return alert("Algo salió mal generando el PDF.");

        const canvas = await html2canvas(element, {
            scale: 2,
            backgroundColor: "#ffffff"
        });

        const imgData = canvas.toDataURL("image/png");

        const pdf = new jspdf.jsPDF("p", "mm", "a4");

        const pageWidth = pdf.internal.pageSize.getWidth();
        const imgWidth = pageWidth - 20;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
        pdf.save("Plan-de-Estudios.pdf");
    }
}); */

document.addEventListener("click", async e => {
    if (e.target.id === "plannerPDF") {

        const element = document.getElementById("plannerPlanContainer");
        if (!element) return alert("No hay plan para exportar.");

        const canvas = await html2canvas(element, { scale: 2 });
        const imgData = canvas.toDataURL("image/png");

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF("p", "mm", "a4");

        const pageWidth = pdf.internal.pageSize.getWidth();
        const imgWidth = pageWidth - 20;
        const imgHeight = canvas.height * imgWidth / canvas.width;

        pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
        pdf.save("plan.pdf");
    }
});


