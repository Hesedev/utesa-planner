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

        <div class="accordion" id="accordionPlanner">

            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button bg-success text-white" type="button" data-bs-toggle="collapse" 
                        data-bs-target="#collapsePlanner" aria-expanded="true">
                        Configuración del plan
                    </button>
                </h2>

                <div id="collapsePlanner" class="accordion-collapse collapse show">
                    <div class="accordion-body">

                        <div class="mb-3">
                            <label class="form-label">Seleccionar pensum</label>
                            <select id="plannerPensum" class="form-select">
                                <option disabled selected>-- Seleccionar --</option>
                                ${opts}
                            </select>
                        </div>

                        <div id="plannerStep2"></div>

                    </div>
                </div>
            </div>

        </div>

        <div id="plannerResult"></div>
    `;
}


// Evento principal: seleccionar pensum
document.addEventListener("change", e => {
    if (e.target.id !== "plannerPensum") return;

    const id = e.target.value;
    const p = getPensumById(id);
    state.currentPensum = id;

    const materias = normalizePensum(p).materias
        .filter(m => m.tipo !== "electiva")
        .sort((a, b) => a.cuatrimestre - b.cuatrimestre);

    // Agrupar por ciclo
    const materiasPorCiclo = {};
    materias.forEach(m => {
        const c = m.cuatrimestre;
        if (!materiasPorCiclo[c]) materiasPorCiclo[c] = [];
        materiasPorCiclo[c].push(m);
    });

    // GENERAR HTML
    let htmlMaterias = `
        <div class="d-flex justify-content-between align-items-center">
            <h4>Materias aprobadas</h4>

            <div>
                <button id="selectAll" class="btn btn-sm btn-outline-warning me-2">Seleccionar todo</button>
                <button id="unselectAll" class="btn btn-sm btn-outline-secondary">Deseleccionar</button>
            </div>
        </div>
        <hr>
    `;

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
                                ${m.codigo} — ${m.nombre}
                            </label>
                        </div>
                    </div>
                `).join("")}
            </div>
        `;
    }

    document.getElementById("plannerStep2").innerHTML = `
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

        <hr>
        <h4>Información académica</h4>
        <div class="row g-3 mb-3">
            <div class="col-6 col-md-3">
                <label class="form-label">Último ciclo cursado</label>
                <select id="lastCiclo" class="form-select">
                    <option value="1">1 (Enero–Abril)</option>
                    <option value="2">2 (Mayo–Agosto)</option>
                    <option value="3">3 (Septiembre–Diciembre)</option>
                </select>
            </div>
            <div class="col-6 col-md-3">
                <label class="form-label">Año</label>
                <input id="lastYear" type="number" class="form-control" value="${new Date().getFullYear()}" min="2000" max="2100">
            </div>
        </div>

        <hr>
        ${htmlMaterias}

        <hr>
        <button id="plannerRun" class="btn btn-warning btn-lg">
            Generar Plan
        </button>
    `;
});


// SELECT ALL / UNSELECT ALL
document.addEventListener("click", e => {
    if (e.target.id === "selectAll") {
        document.querySelectorAll(".plannerAprobada").forEach(cb => cb.checked = true);
    }
    if (e.target.id === "unselectAll") {
        document.querySelectorAll(".plannerAprobada").forEach(cb => cb.checked = false);
    }
});


// Ejecutar el planificador
document.addEventListener("click", e => {
    if (e.target.id !== "plannerRun") return;

    const id = state.currentPensum;
    const p = getPensumById(id);

    const { materias } = normalizePensum(p);

    const aprobadas = [...document.querySelectorAll(".plannerAprobada:checked")]
        .map(c => c.value);

    const maxM = Number(document.getElementById("plannerMaxMats").value);
    const maxC = Number(document.getElementById("plannerMaxCreds").value);

    const plan = runPlanner(materias, aprobadas, maxM, maxC);

    // Colapsar el acordeón automáticamente
    document.getElementById("collapsePlanner").classList.remove("show");

    document.getElementById("plannerResult").innerHTML =
        renderPlannerOutput(plan, materias);
});

// CALCULAR CICLO REAL
function calcularCicloReal(inicioIdx, lastCiclo, lastYear) {

    // inicioIdx = índice del ciclo del plan (0, 1, 2, ...)
    // lastCiclo = 1, 2 o 3
    // lastYear  = año del último ciclo cursado

    let ciclo = lastCiclo;
    let year = lastYear;

    // avanzar "inicioIdx + 1" ciclos
    for (let i = 0; i <= inicioIdx; i++) {
        ciclo++;
        if (ciclo > 3) {
            ciclo = 1;
            year++;
        }
    }

    return { ciclo, year };
}


// RENDER DEL RESULTADO
function renderPlannerOutput(plan, materiasDB) {
    if (!plan || plan.length === 0)
        return `<div class="alert alert-danger mt-3">No se pudo generar un plan.</div>`;

    const getMateria = code => materiasDB.find(m => m.codigo === code);
    const lastCiclo = Number(document.getElementById("lastCiclo").value);
    const lastYear = Number(document.getElementById("lastYear").value);

    let html = `
        <hr>
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h3>Plan Generado</h3>
            <button id="plannerPDF" class="btn btn-outline-danger">
                Descargar PDF
            </button>
        </div>
        <div id="plannerPlanContainer" style="max-width: 800px; margin: auto;">
    `;

    plan.forEach((ciclo, idx) => {
        const real = calcularCicloReal(idx, lastCiclo, lastYear);

        html += `
        <div class="card mb-4 shadow">
            <div class="card-header bg-success text-white">
                <strong>Ciclo ${String(real.ciclo).padStart(2, "0")}-${real.year}</strong>
            </div>
            <ul class="list-group list-group-flush">
                ${ciclo.map(code => {
            const m = getMateria(code);

            const prereq = m.prerequisitos.length > 0 ? m.prerequisitos.join(", ") : "Ninguno";
            const coreq = m.corequisitos.length > 0 ? m.corequisitos.join(", ") : "Ninguno";

            let reglas = "—";
            if (m.reglas && typeof m.reglas === "object") {
                if (m.reglas.requires_all_until !== undefined) {
                    reglas = `Haber aprobado todas las materias hasta el ciclo #${m.reglas.requires_all_until}`;
                }
            }

            return `
                            <li class="list-group-item">
                                <strong>${m.codigo} — ${m.nombre}</strong><br>
                                <small class="text-muted">
                                    Créditos: <strong>${m.creditos}</strong><br>
                                    Pre-Req.: <strong>${prereq}</strong>, Co-Req.: <strong>${coreq}</strong><br>
                                    ${reglas == "—" ? "" : `Regla: <strong>${reglas}</strong>`}
                                </small>
                            </li>
                        `;
        }).join("")}
            </ul>
        </div>`;
    });

    html += `</div>`;
    return html;
}



// EXPORTAR A PDF
document.addEventListener("click", async e => {
    if (e.target.id !== "plannerPDF") return;

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
});
