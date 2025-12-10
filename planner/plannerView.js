// planner/plannerView.js
import { state } from "../state.js";
import { getPensumById, normalizePensum } from "./planner.js";
import { runPlanner } from "../algorithm/plannerCore.js";
import { render } from "../utils.js"; // Asumiendo que `render` es una utilidad de DOM

// =================================================================
// UTILIDADES PARA ELECTIVAS Y RENDERING
// =================================================================

// 1. Obtiene todas las electivas del pensum activo
function getAllElectives() {
    const p = getPensumById(state.currentPensum);
    if (!p) return [];
    return normalizePensum(p).electivas;
}

// 2. Renderiza una lista de electivas como checkboxes (sin cambios)
function renderElectiveChecklist(idPrefix, label, electives) {
    // Genera la lista inicial de checkboxes
    const checklistItems = electives.map(e => `
        <li class="list-group-item p-1 elective-item" data-code="${e.codigo}" data-name="${e.nombre.toLowerCase()}">
            <div class="form-check">
                <input class="form-check-input elective-checkbox" type="checkbox" value="${e.codigo}" id="${idPrefix}-${e.codigo}">
                <label class="form-check-label" for="${idPrefix}-${e.codigo}">
                    ${e.codigo} — ${e.nombre} (${e.creditos} Crs)
                </label>
            </div>
        </li>
    `).join('');

    return `
        <div class="col-md-6">
            <label for="${idPrefix}Search" class="form-label">${label}</label>
            
            <div class="input-group mb-2">
                <input type="text" class="form-control elective-search" id="${idPrefix}Search" data-checklist-id="${idPrefix}Checklist" placeholder="Buscar por código/nombre">
            </div>

            <ul class="list-group elective-checklist" id="${idPrefix}Checklist" style="max-height: 250px; overflow-y: auto; border: 1px solid #dee2e6;">
                ${checklistItems}
            </ul>
        </div>
    `;
}

// 3. Filtra la lista de electivas al escribir en el campo de búsqueda (sin cambios)
function filterElectiveChecklist(e) {
    const input = e.target;
    const searchText = input.value.toLowerCase();
    const checklistId = input.dataset.checklistId;
    const checklist = document.getElementById(checklistId);

    if (!checklist) return;

    const items = checklist.querySelectorAll('.elective-item');
    items.forEach(item => {
        const code = item.dataset.code.toLowerCase();
        const name = item.dataset.name;

        if (code.includes(searchText) || name.includes(searchText)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

// 4. Renderiza la lista de Materias Obligatorias con búsqueda y por ciclo (MODIFICADO para usar switch global)
function renderMateriasChecklist(materiasPorCiclo) {
    let html = `
        <div class="d-flex justify-content-between align-items-center mb-2">
            <h4>Materias aprobadas (Obligatorias)</h4>
            <div class="form-check form-switch m-0">
                <label class="form-check-label small" for="toggleAllMaterias">
                    Todas
                </label>
                <input class="form-check-input" type="checkbox" id="toggleAllMaterias">
            </div>
        </div>

        <div class="input-group my-3">
            <input type="text" class="form-control" id="materiasObligatoriasSearch" placeholder="Buscar materia por código o nombre...">
        </div>
        
        <div id="materiasObligatoriasContainer" style="max-height: 400px; overflow-y: auto;">
    `;

    for (const ciclo in materiasPorCiclo) {
        html += `
            <div class="card mb-3 obligatorio-cycle-card" data-cycle="${ciclo}">
                <div class="card-header bg-light d-flex justify-content-between align-items-center p-2">
                    <h6 class="m-0">Ciclo #${ciclo}</h6>
                    <div class="form-check form-switch m-0">
                        <input class="form-check-input select-cycle-toggle" type="checkbox" id="toggle-ciclo-${ciclo}" data-cycle="${ciclo}">
                        <label class="form-check-label small" for="toggle-ciclo-${ciclo}">
                            Todo
                        </label>
                    </div>
                </div>
                <ul class="list-group list-group-flush cycle-${ciclo}-checkboxes">
                    ${materiasPorCiclo[ciclo].map(m => `
                        <li class="list-group-item p-1 obligatorio-item" 
                            data-code="${m.codigo.toLowerCase()}" 
                            data-name="${m.nombre.toLowerCase()}" 
                            data-cycle="${ciclo}">
                            <div class="form-check">
                                <input class="form-check-input plannerAprobada cycle-checkbox-${ciclo}" 
                                        type="checkbox" value="${m.codigo}" id="check-${m.codigo}"
                                        data-master-toggle="toggle-ciclo-${ciclo}"> 
                                <label class="form-check-label" for="check-${m.codigo}">
                                    ${m.codigo} — ${m.nombre}
                                </label>
                            </div>
                        </li>
                    `).join("")}
                </ul>
            </div>
        `;
    }

    html += `</div>`;
    return html;
}

// 5. Filtra la lista de Materias Obligatorias al escribir (sin cambios)
function filterMateriasObligatorias(e) {
    const searchText = e.target.value.toLowerCase();
    const container = document.getElementById('materiasObligatoriasContainer');
    if (!container) return;

    // Ocultar/mostrar ítems individuales
    const items = container.querySelectorAll('.obligatorio-item');
    items.forEach(item => {
        const code = item.dataset.code;
        const name = item.dataset.name;

        if (code.includes(searchText) || name.includes(searchText)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });

    // Ocultar/mostrar los contenedores de ciclo si todas sus materias están ocultas
    const cycleCards = container.querySelectorAll('.obligatorio-cycle-card');
    cycleCards.forEach(card => {
        const visibleItems = card.querySelectorAll('.obligatorio-item:not([style*="display: none"])');
        if (visibleItems.length === 0) {
            card.style.display = 'none';
        } else {
            card.style.display = '';
        }
    });
}


// 6. Actualiza el contador de créditos de electivas y aplica las reglas de filtrado/deshabilitación (sin cambios)
function refreshElectivesCreditCounter() {
    const allElectives = getAllElectives();

    const approvedContainer = document.getElementById('electivasAprobadasChecklist');
    const planContainer = document.getElementById('electivasPlanChecklist');

    if (!approvedContainer || !planContainer) return;

    // 1. Obtener electivas seleccionadas a partir de checkboxes
    const approvedCodes = Array.from(approvedContainer.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
    const planCheckboxes = planContainer.querySelectorAll('input[type="checkbox"]');

    // Obtener los códigos del plan (solo los que están chequeados Y no deshabilitados)
    const planCodes = Array.from(planCheckboxes)
        .filter(cb => cb.checked && !cb.disabled)
        .map(cb => cb.value);

    // 2. Calcular créditos totales
    const totalCodes = [...new Set([...approvedCodes, ...planCodes])];

    let totalCredits = 0;
    for (const code of totalCodes) {
        const electiva = allElectives.find(e => e.codigo === code);
        if (electiva) {
            totalCredits += electiva.creditos || 0;
        }
    }

    document.getElementById('electivaCreditsCounter').textContent = totalCredits;

    // 3. Regla: Deshabilitar en 'Electivas a Incluir' si está en 'Electivas Aprobadas'
    planCheckboxes.forEach(cb => {
        const isApproved = approvedCodes.includes(cb.value);

        if (isApproved) {
            cb.disabled = true;
            cb.checked = false;
        } else {
            cb.disabled = false;
        }
    });
}


// =================================================================
// UTILIDAD PARA EL SWITCH GLOBAL
// =================================================================

// Sincroniza el estado del switch maestro global (Seleccionar Todo)
function updateGlobalToggleState() {
    const allMaterias = document.querySelectorAll("#materiasObligatoriasContainer .plannerAprobada");
    const allToggle = document.getElementById("toggleAllMaterias");

    if (!allToggle) return;

    if (allMaterias.length === 0) {
        allToggle.checked = false;
        return;
    }

    // Si todas las materias visibles están chequeadas, el switch global se marca
    const allChecked = Array.from(allMaterias).every(cb => cb.checked);

    allToggle.checked = allChecked;
}

// =================================================================
// VISTA PRINCIPAL (Sin Cambios)
// =================================================================

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


// =================================================================
// EVENTO principal: seleccionar pensum (Modificado con agrupación)
// =================================================================
document.addEventListener("change", e => {
    if (e.target.id !== "plannerPensum") return;

    const id = e.target.value;
    const p = getPensumById(id);
    state.currentPensum = id;

    // Obtener materias obligatorias y electivas
    const { materias, electivas: allElectives } = normalizePensum(p);

    // Materias obligatorias/normales
    const materiasOrdenadas = materias
        .sort((a, b) => a.cuatrimestre - b.cuatrimestre);

    // Agrupar por ciclo
    const materiasPorCiclo = {};
    materiasOrdenadas.forEach(m => {
        const c = m.cuatrimestre;
        if (!materiasPorCiclo[c]) materiasPorCiclo[c] = [];
        materiasPorCiclo[c].push(m);
    });

    // GENERAR HTML para Electivas
    const htmlElectivas = `
        <div class="card mb-4 bg-light">
            <div class="card-header">
                <h5 class="mb-0">Gestión de Electivas</h5>
            </div>
            <div class="card-body">
                <div class="row g-3">
                    ${renderElectiveChecklist("electivasAprobadas", "Electivas Aprobadas", allElectives)}
                    ${renderElectiveChecklist("electivasPlan", "Electivas a Incluir en el Plan", allElectives)}
                </div>

                <div class="mt-3 alert alert-info py-2">
                    Total de Créditos de Electivas Aprobadas/Plan: <strong><span id="electivaCreditsCounter">0</span></strong>
                </div>
            </div>
        </div>
    `;

    // GENERAR HTML para Materias Aprobadas Obligatorias
    const htmlMaterias = renderMateriasChecklist(materiasPorCiclo);

    document.getElementById("plannerStep2").innerHTML = `
        <hr>
        <h4>Restricciones de Ciclo</h4>
        <div class="row g-3 mb-3">
            <div class="col-7 col-md-6">
                <label class="form-label">Máx. materias que quieres tomar por ciclo</label>
                <input id="plannerMaxMats" type="number" min="1" value="4" class="form-control">
            </div>

            <div class="col-5 col-md-4">
                <label class="form-label">Máx. créditos por ciclo</label>
                <input id="plannerMaxCreds" type="number" min="1" value="25" class="form-control">
            </div>
        </div>

        <hr>
        <h4>Fecha de Incio</h4>
        <div class="row g-3 mb-3">
            <div class="col-6 col-md-3">
                <label class="form-label">Ciclo de inicio del plan</label>
                <select id="startCiclo" class="form-select">
                    <option value="1">1 (Enero–Abril)</option>
                    <option value="2">2 (Mayo–Agosto)</option>
                    <option value="3">3 (Septiembre–Diciembre)</option>
                </select>
            </div>
            <div class="col-6 col-md-3">
                <label class="form-label">Año de inicio</label>
                <input id="startYear" type="number" class="form-control" value="${new Date().getFullYear()}" min="2000" max="2100">
            </div>
        </div>

        <hr>
        ${htmlMaterias}
        <hr class="my-4">
        ${htmlElectivas}
        <hr>
        
        <button id="plannerRun" class="btn btn-warning btn-lg">
            Generar Plan
        </button>
    `;

    // Configurar listeners (sin cambios)
    const approvedContainer = document.getElementById('electivasAprobadasChecklist');
    const planContainer = document.getElementById('electivasPlanChecklist');
    const checkboxListener = () => refreshElectivesCreditCounter();

    if (approvedContainer) approvedContainer.addEventListener('change', checkboxListener);
    if (planContainer) planContainer.addEventListener('change', checkboxListener);

    document.getElementById('electivasAprobadasSearch')?.addEventListener('keyup', filterElectiveChecklist);
    document.getElementById('electivasPlanSearch')?.addEventListener('keyup', filterElectiveChecklist);

    document.getElementById('materiasObligatoriasSearch')?.addEventListener('keyup', filterMateriasObligatorias);

    refreshElectivesCreditCounter();
});


// ELIMINACIÓN DE LÓGICA OBSOLETA: El select all/unselect all se maneja con el switch en el 'change' listener.
document.addEventListener("click", e => {
    // Lógica para selectAll/unselectAll buttons (eliminada)
    // Se mantiene este bloque por si hay otra lógica de click que no se muestra, pero sin el código de botones.
});

// Sincronizar checkboxes de ciclo y el nuevo switch global (MODIFICADO)
document.addEventListener("change", e => {

    // 1. Manejar el cambio del switch maestro global
    if (e.target.id === "toggleAllMaterias") {
        const isChecked = e.target.checked;

        // Seleccionar/Deseleccionar todos los checkboxes de materia obligatoria
        document.querySelectorAll("#materiasObligatoriasContainer .plannerAprobada").forEach(cb => {
            cb.checked = isChecked;
        });

        // Seleccionar/Deseleccionar todos los switches de ciclo
        document.querySelectorAll("#materiasObligatoriasContainer .select-cycle-toggle").forEach(cb => {
            cb.checked = isChecked;
        });
        return;
    }

    // 2. Manejar el cambio del switch maestro (Seleccionar Todo por ciclo)
    if (e.target.classList.contains("select-cycle-toggle")) {
        const isChecked = e.target.checked;
        const ciclo = e.target.dataset.cycle;

        // Seleccionar todos los checkboxes de materias APROBADAS dentro de ese ciclo
        const checkboxes = document.querySelectorAll(`.cycle-checkbox-${ciclo}`);

        checkboxes.forEach(checkbox => {
            checkbox.checked = isChecked;
        });

        // Sincronizar el estado del switch maestro global
        updateGlobalToggleState();
        return;
    }

    // 3. Manejar el cambio de un checkbox de materia individual
    if (e.target.classList.contains("plannerAprobada") && e.target.dataset.masterToggle) {
        const masterToggleId = e.target.dataset.masterToggle;
        const masterToggle = document.getElementById(masterToggleId);

        if (!masterToggle) return;

        const ciclo = masterToggle.dataset.cycle;
        const checkboxes = document.querySelectorAll(`.cycle-checkbox-${ciclo}`);

        // Verificar si todos los checkboxes individuales están marcados
        const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);

        // Sincronizar el estado del maestro de ciclo
        masterToggle.checked = allChecked;

        // Sincronizar el estado del switch maestro global
        updateGlobalToggleState();
    }
});

// =================================================================
// Ejecutar el planificador (Sin Cambios)
// =================================================================
document.addEventListener("click", e => {
    if (e.target.id !== "plannerRun") return;

    const id = state.currentPensum;
    const p = getPensumById(id);

    // 1. Obtener todas las materias base (obligatorias y electivas por separado)
    const { materias: mandatoryMaterias, electivas: allElectives } = normalizePensum(p);

    // 2. Obtener materias APROBADAS (obligatorias)
    const aprobadasBase = [...document.querySelectorAll("#materiasObligatoriasContainer .plannerAprobada:checked")]
        .map(c => c.value);

    // Obtener electivas APROBADAS (de los checkboxes)
    const approvedElectiveCodes = Array.from(document.getElementById("electivasAprobadasChecklist")?.querySelectorAll('input[type="checkbox"]:checked') || []).map(cb => cb.value);

    // La lista final de aprobadas
    const aprobadasFinal = [...aprobadasBase, ...approvedElectiveCodes];

    // 3. Obtener electivas a incluir en el plan y MODIFICAR su tipo a "normal"
    const planElectiveCheckboxes = document.getElementById("electivasPlanChecklist")?.querySelectorAll('input[type="checkbox"]:checked:not([disabled])') || [];
    const planElectiveCodes = Array.from(planElectiveCheckboxes).map(cb => cb.value);

    const planElectivesModified = allElectives
        .filter(e => planElectiveCodes.includes(e.codigo))
        .map(e => ({
            ...e,
            tipo: "normal",
            cuatrimestre: 999
        }));

    // 4. Fusionar materias obligatorias/normales con las electivas modificadas
    const materiasFinal = [...mandatoryMaterias, ...planElectivesModified];

    // 5. Ejecutar el planner
    const maxM = Number(document.getElementById("plannerMaxMats").value);
    const maxC = Number(document.getElementById("plannerMaxCreds").value);

    const plan = runPlanner(
        materiasFinal,
        aprobadasFinal,
        maxM,
        maxC
    );

    document.getElementById("collapsePlanner").classList.remove("show");

    document.getElementById("plannerResult").innerHTML =
        renderPlannerOutput(plan, materiasFinal);

    document.body.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// CALCULAR CICLO REAL (Sin Cambios)
function calcularCicloReal(planIdx, startCiclo, startYear) {

    let ciclo = startCiclo;
    let year = startYear;

    // planIdx = 0 -> No corre el loop, retorna el ciclo/año de inicio.
    for (let i = 0; i < planIdx; i++) {
        ciclo++;
        if (ciclo > 3) {
            ciclo = 1;
            year++;
        }
    }

    return { ciclo, year };
}


// RENDER DEL RESULTADO (Sin Cambios)
function renderPlannerOutput(plan, materiasDB) {
    if (!plan || plan.length === 0)
        return `<div class="alert alert-danger mt-3">No se pudo generar un plan.</div>`;

    const getMateria = code => materiasDB.find(m => m.codigo === code);

    // AHORA LEE startCiclo y startYear
    const startCiclo = Number(document.getElementById("startCiclo").value);
    const startYear = Number(document.getElementById("startYear").value);

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
        // Usa los nuevos IDs: startCiclo y startYear
        const real = calcularCicloReal(idx, startCiclo, startYear);

        html += `
        <div class="card mb-4 shadow">
            <div class="card-header bg-success text-white">
                <strong>Ciclo #${idx + 1} (${String(real.ciclo).padStart(2, "0")}-${real.year})</strong>
            </div>
            <ul class="list-group list-group-flush">
                ${ciclo.map(code => {
            const m = getMateria(code);
            if (!m) return '';

            const prereq = (Array.isArray(m.prerequisitos) && m.prerequisitos.length > 0) ? m.prerequisitos.join(", ") : "Ninguno";
            const coreq = (Array.isArray(m.corequisitos) && m.corequisitos.length > 0) ? m.corequisitos.join(", ") : "Ninguno";

            let reglas = "—";
            if (m.reglas && typeof m.reglas === "object" && m.reglas.requires_all_until !== undefined) {
                reglas = `Haber aprobado todas las materias hasta el ciclo #${m.reglas.requires_all_until}`;
            }

            let tipoEtiqueta = "";
            if (m.cuatrimestre === 999 && m.tipo === "normal") {
                tipoEtiqueta = `<span class="badge bg-info text-dark ms-2">Electiva Planificada</span>`;
            }


            return `
                <li class="list-group-item">
                    <strong>${m.codigo} — ${m.nombre}</strong> ${tipoEtiqueta}<br>
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

    const container = document.getElementById("plannerPlanContainer");
    if (!container) return alert("No hay plan para exportar.");

    // Botón para retroalimentación
    const pdfButton = e.target;
    const originalButtonText = pdfButton.innerHTML;

    // 1. Definir ancho de renderizado y configuración del PDF
    const PDF_RENDER_WIDTH = 700;

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const pdfContentWidth = pageWidth - 2 * margin;
    let cursorY = margin;

    const cards = container.querySelectorAll(".card");
    const body = document.body;

    // Guardar estilos originales (Nuevas variables para posición y left)
    const originalContainerDisplay = container.style.display;
    const originalContainerWidth = container.style.width;
    const originalContainerMaxWidth = container.style.maxWidth;
    const originalContainerOverflowX = container.style.overflowX;
    const originalContainerPosition = container.style.position; // <--- NUEVO
    const originalContainerLeft = container.style.left;         // <--- NUEVO
    const originalBodyOverflowX = body.style.overflowX;
    const originalCardWidths = [];
    cards.forEach(card => originalCardWidths.push(card.style.width));


    try {
        // ==========================================================
        // 2. PREPARACIÓN Y APLICAR ESTILOS TEMPORALES PARA CAPTURA
        // ==========================================================

        // a. Mostrar indicador de carga y deshabilitar botón
        pdfButton.disabled = true;
        pdfButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Generando PDF...';

        // b. Ocultar el contenedor de plan MOVIÉNDOLO FUERA DE PANTALLA
        //    Esto mantiene el layout y permite a html2canvas capturar el contenido.
        container.style.display = 'block'; // Asegurar que no esté 'none'
        container.style.position = 'fixed';
        container.style.left = '-9999px'; // Moverlo fuera de la vista

        // c. Mitigar el desbordamiento del body
        body.style.overflowX = 'hidden';

        // d. Forzar el ancho de renderizado en el contenedor
        container.style.width = `${PDF_RENDER_WIDTH}px`;
        container.style.maxWidth = `${PDF_RENDER_WIDTH}px`;
        container.style.overflowX = 'hidden';

        // e. Ajustar las cards
        cards.forEach(card => {
            card.style.width = `${PDF_RENDER_WIDTH}px`;
        });


        // ==========================================================
        // 3. RENDERIZAR CADA TARJETA
        // ==========================================================
        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];

            const canvas = await html2canvas(card, {
                scale: 3, // Mantiene la alta resolución para nitidez
                useCORS: true
            });

            // Validar dimensiones antes de usar pdf.addImage
            if (canvas.width === 0 || canvas.height === 0) {
                console.warn(`Skipping card ${i} due to zero dimensions.`);
                continue;
            }

            // Vuelve a JPEG con calidad 1.0 para fiabilidad en jsPDF
            const imgData = canvas.toDataURL("image/jpeg", 1.0);

            const imgHeightPDF = (canvas.height / canvas.width) * pdfContentWidth;

            if (isNaN(imgHeightPDF) || imgHeightPDF <= 0) {
                console.warn(`Skipping card ${i} due to invalid PDF height calculation: ${imgHeightPDF}.`);
                continue;
            }

            // Añadir página si no cabe
            if (cursorY + imgHeightPDF > pageHeight - margin) {
                pdf.addPage();
                cursorY = margin;
            }

            // Se usa "JPEG" como tipo de imagen
            pdf.addImage(imgData, "JPEG", margin, cursorY, pdfContentWidth, imgHeightPDF);
            cursorY += imgHeightPDF + 5;
        }

        // 5. Descargar (Solo si el try block termina sin errores)
        pdf.save("Planificación de Materias.pdf");

    } catch (error) {
        // Manejo de cualquier error no capturado anteriormente
        console.error("Error al generar el PDF:", error);
        alert("Ocurrió un error inesperado al generar el PDF. Por favor, revisa la consola para más detalles.");
    } finally {
        // ==========================================================
        // 4. RESTAURAR ESTILOS ORIGINALES (Se ejecuta siempre)
        // ==========================================================

        // a. Restaurar estilos del contenedor
        container.style.width = originalContainerWidth;
        container.style.maxWidth = originalContainerMaxWidth;
        container.style.overflowX = originalContainerOverflowX;
        container.style.position = originalContainerPosition; // <-- RESTAURADO
        container.style.left = originalContainerLeft;         // <-- RESTAURADO
        container.style.display = originalContainerDisplay; // Mostrar contenedor

        // b. Restaurar estilos de las cards
        cards.forEach((card, index) => {
            card.style.width = originalCardWidths[index];
        });

        // c. CLAVE: Restaurar el overflow-x del body
        body.style.overflowX = originalBodyOverflowX;

        // d. Restaurar botón
        pdfButton.innerHTML = originalButtonText;
        pdfButton.disabled = false;
    }
});


/* document.addEventListener("click", async e => {
    if (e.target.id !== "plannerPDF") return;

    const container = document.getElementById("plannerPlanContainer");
    if (!container) return alert("No hay plan para exportar.");

    // 1. Definir ancho de renderizado y configuración del PDF
    const PDF_RENDER_WIDTH = 700;

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const pdfContentWidth = pageWidth - 2 * margin;
    let cursorY = margin;

    const cards = container.querySelectorAll(".card");
    const body = document.body;

    // ==========================================================
    // 2. APLICAR ESTILOS TEMPORALES PARA CAPTURA (Flicker Fix)
    // ==========================================================

    // a. Guardar estilos originales
    const originalContainerWidth = container.style.width;
    const originalContainerMaxWidth = container.style.maxWidth;
    const originalContainerOverflowX = container.style.overflowX;

    // <--- NUEVOS ESTILOS PARA EVITAR EL FLICKER
    const originalContainerPosition = container.style.position;
    const originalContainerLeft = container.style.left;
    // ----------------------------------------

    // b. Mitigar el desbordamiento del body (CLAVE para móviles)
    const originalBodyOverflowX = body.style.overflowX;
    body.style.overflowX = 'hidden';

    // c. Forzar el ancho de renderizado y MOVERLO OFF-SCREEN
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = `${PDF_RENDER_WIDTH}px`;
    container.style.maxWidth = `${PDF_RENDER_WIDTH}px`;
    container.style.overflowX = 'hidden';

    // d. Ajustar las cards si es necesario
    const originalCardWidths = [];
    cards.forEach(card => {
        originalCardWidths.push(card.style.width);
        card.style.width = `${PDF_RENDER_WIDTH}px`;
    });


    // ==========================================================
    // 3. RENDERIZAR CADA TARJETA (Mejora de Calidad)
    // ==========================================================
    for (let i = 0; i < cards.length; i++) {
        const card = cards[i];

        const canvas = await html2canvas(card, {
            scale: 3, // Aumentar la escala a 3 para mejor resolución
            useCORS: true
        });

        // Usar PNG (sin pérdida) para mejor calidad
        const imgData = canvas.toDataURL("image/png");

        const imgHeightPDF = (canvas.height / canvas.width) * pdfContentWidth;

        // Añadir página si no cabe
        if (cursorY + imgHeightPDF > pageHeight - margin) {
            pdf.addPage();
            cursorY = margin;
        }

        // Usar 'PNG' como tipo de imagen para addImage
        pdf.addImage(imgData, "PNG", margin, cursorY, pdfContentWidth, imgHeightPDF);
        cursorY += imgHeightPDF + 5;
    }

    // ==========================================================
    // 4. RESTAURAR ESTILOS ORIGINALES
    // ==========================================================

    // a. Restaurar estilos del contenedor
    container.style.width = originalContainerWidth;
    container.style.maxWidth = originalContainerMaxWidth;
    container.style.overflowX = originalContainerOverflowX;

    // <--- RESTAURAR POSICIÓN
    container.style.position = originalContainerPosition;
    container.style.left = originalContainerLeft;
    // ----------------------

    // b. Restaurar estilos de las cards
    cards.forEach((card, index) => {
        card.style.width = originalCardWidths[index];
    });

    // c. CLAVE: Restaurar el overflow-x del body
    body.style.overflowX = originalBodyOverflowX;

    pdf.save("Planificación de Materias.pdf");
}); */