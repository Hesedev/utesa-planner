// editor/editorView.js
import {
    createPensum,
    getPensum,
    addCycle,
    addMateria,
    deleteMateria,
    deleteCycle,
    exportPensum,
    importPensum,
    editMateriaField,
    addElectiva,
    deleteElectiva,
    editElectivaField
} from "./editor.js";

import { saveState } from "../state.js";
import { uid } from "../utils.js";

// -----------------------------
// Helpers de render
// -----------------------------
function esc(str) {
    return (str ?? "").toString().replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function renderEmpty() {
    return `
    <div class="card">
      <div class="card-body">
        <h5>No hay ningún pensum seleccionado</h5>
        <p>Crea uno nuevo o importa un JSON.</p>

        <div class="d-flex gap-2">
          <button class="btn btn-primary" id="btnNuevoPensum">Crear nuevo pensum</button>

          <div>
            <label class="form-label mb-1">Importar pensum (.json)</label>
            <input id="fileImport" type="file" accept="application/json" class="form-control form-control-sm">
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderPensumSelector(p) {
    const title = p ? esc(p.nombre) : "(ninguno)";
    return `
    <div class="mb-3 d-flex justify-content-between align-items-center">
      <div>
        <label class="form-label">Pensum seleccionado</label>
        <div><strong>${title}</strong></div>
      </div>

      <div>
        <button id="btnExportPensum" class="btn btn-sm btn-success me-2">Exportar JSON</button>
        <button id="btnNewPensumSmall" class="btn btn-sm btn-outline-primary">Nuevo pensum</button>
      </div>
    </div>
  `;
}

// Render de una materia dentro del ciclo (incluye inputs para prereqs/coreqs/requires)
function renderMateria(cycleId, m) {
    const prereq = Array.isArray(m.prerequisitos) ? m.prerequisitos.join(", ") : "";
    const coreq = Array.isArray(m.corequisitos) ? m.corequisitos.join(", ") : "";
    const requiresAll = m.reglas?.requires_all_until ?? "";

    return `
    <div class="border rounded p-2 mb-2" data-materia="${cycleId}:${m.id}">
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <strong>${esc(m.codigo) || "(sin código)"}</strong>
          <div class="text-muted small">${esc(m.nombre) || "(sin nombre)"}</div>
        </div>
        <div>
          <button class="btn btn-sm btn-outline-danger" data-delete-materia="${cycleId}:${m.id}">Eliminar</button>
        </div>
      </div>

      <div class="row mt-2 g-2">
        <div class="col-12 col-md-3">
          <input class="form-control form-control-sm" placeholder="Código"
                 data-edit="${cycleId}:${m.id}:codigo" value="${esc(m.codigo)}">
        </div>
        <div class="col-12 col-md-4">
          <input class="form-control form-control-sm" placeholder="Nombre"
                 data-edit="${cycleId}:${m.id}:nombre" value="${esc(m.nombre)}">
        </div>
        <div class="col-6 col-md-1">
          <input type="number" min="0" class="form-control form-control-sm" placeholder="Créditos"
                 data-edit="${cycleId}:${m.id}:creditos" value="${m.creditos ?? 0}">
        </div>

        <div class="col-12 col-md-4">
          <select class="form-select form-select-sm" data-edit="${cycleId}:${m.id}:tipo">
            <option value="obligatoria" ${m.tipo !== "electiva" ? "selected" : ""}>Obligatoria</option>
            <option value="electiva" ${m.tipo === "electiva" ? "selected" : ""}>Electiva</option>
          </select>
        </div>

        <div class="col-12">
          <label class="form-label small mb-1">Pre-requisitos (códigos, separados por coma)</label>
          <input class="form-control form-control-sm" placeholder="EJ: INF-117, MAT-115"
                 data-edit="${cycleId}:${m.id}:prerequisitos" value="${esc(prereq)}">
        </div>

        <div class="col-12">
          <label class="form-label small mb-1">Co-requisitos (códigos, separados por coma)</label>
          <input class="form-control form-control-sm" placeholder="EJ: INF-165"
                 data-edit="${cycleId}:${m.id}:corequisitos" value="${esc(coreq)}">
        </div>

        <div class="col-12 col-md-4">
          <label class="form-label small mb-1">Requires all until (ciclo)</label>
          <input type="number" min="0" class="form-control form-control-sm"
                 data-edit="${cycleId}:${m.id}:requires_all_until" value="${esc(requiresAll)}">
        </div>
      </div>
    </div>
  `;
}

function renderCycle(cycle, i) {
    return `
    <div class="card mb-3" data-cycle="${cycle.id}">
      <div class="card-header d-flex justify-content-between align-items-center">
        <strong>Ciclo ${i + 1}</strong>
        <div>
          <button class="btn btn-sm btn-outline-danger" data-delete-cycle="${cycle.id}">Eliminar ciclo</button>
        </div>
      </div>
      <div class="card-body">
        ${cycle.materias.map(m => renderMateria(cycle.id, m)).join("")}

        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-primary" data-add-materia="${cycle.id}">+ Agregar materia</button>
        </div>
      </div>
    </div>
  `;
}

function renderElectivaCard(e) {
    return `
    <div class="border rounded p-2 mb-2 d-flex justify-content-between align-items-start" data-electiva="${e.id}">
      <div style="flex:1">
        <div class="d-flex justify-content-between">
          <div><strong>${esc(e.codigo) || "(sin código)"}</strong></div>
          <div class="text-muted small">Créditos: ${e.creditos ?? 0}</div>
        </div>
        <div class="text-muted small">${esc(e.nombre) || "(sin nombre)"}</div>

        <div class="mt-2">
          <input class="form-control form-control-sm mb-1" placeholder="Código"
                 data-edit-electiva="${e.id}:codigo" value="${esc(e.codigo)}">
          <input class="form-control form-control-sm mb-1" placeholder="Nombre"
                 data-edit-electiva="${e.id}:nombre" value="${esc(e.nombre)}">
          <input class="form-control form-control-sm mb-1" type="number" min="0"
                 data-edit-electiva="${e.id}:creditos" value="${e.creditos ?? 0}">
        </div>
      </div>

      <div class="ms-2">
        <button class="btn btn-sm btn-danger" data-delete-electiva="${e.id}">Eliminar</button>
      </div>
    </div>
  `;
}

// -----------------------------
// Vista principal del editor
// -----------------------------
export function editorView() {
    const p = getPensum();

    let html = `
    <h2>Editor de Pensum</h2>
    ${renderPensumSelector(p)}
    <hr>
  `;

    if (!p) {
        html += renderEmpty();
        return html;
    }

    // editor
    html += `
    <div class="mb-3">
      <label class="form-label">Nombre del pensum</label>
      <input id="nombrePensum" class="form-control mb-2" value="${esc(p.nombre)}" placeholder="Nombre del pensum">
      <div class="d-flex gap-2">
        <button id="btnAddCycle" class="btn btn-primary btn-sm">+ Agregar ciclo</button>
        <button id="btnExportPensumFull" class="btn btn-success btn-sm">Exportar JSON</button>
        <button id="btnAddElectiva" class="btn btn-outline-secondary btn-sm">+ Agregar electiva</button>
      </div>
    </div>

    <hr>
    
    <div class="mb-3">
      <label class="form-label">Importar pensum (.json)</label>
      <input id="fileImport" type="file" accept="application/json" class="form-control">
    </div>

    <h4>Ciclos</h4>
    <div id="cyclesContainer">
      ${p.ciclos.map((cycle, i) => renderCycle(cycle, i)).join("")}
    </div>

    <hr>

    <h4>Electivas</h4>
    <div id="electivasContainer">
      ${p.electivas.map(renderElectivaCard).join("")}
    </div>
  `;

    return html;
}

// -----------------------------
// Delegated events: click
// -----------------------------
document.addEventListener("click", (ev) => {
    const t = ev.target;

    // New small pensum
    if (t.id === "btnNewPensumSmall") {
        const name = prompt("Nombre del pensum:");
        if (name) {
            createPensum(name);
            location.reload();
        }
        return;
    }

    // Create new pensum from empty view
    if (t.id === "btnNuevoPensum") {
        const name = prompt("Nombre del pensum:");
        if (name) {
            createPensum(name);
            location.reload();
        }
        return;
    }

    // Add cycle
    if (t.id === "btnAddCycle") {
        addCycle();
        // re-render view
        location.reload();
        return;
    }

    // Export pensum
    if (t.id === "btnExportPensum" || t.id === "btnExportPensumFull") {
        exportPensum();
        return;
    }

    // Add materia (per cycle)
    if (t.dataset.addMateria) {
        const cycleId = t.dataset.addMateria;
        addMateria(cycleId);
        location.reload();
        return;
    }

    // Delete ciclo
    if (t.dataset.deleteCycle) {
        const cid = t.dataset.deleteCycle;
        if (confirm("Eliminar ciclo? Esta acción eliminará todas sus materias.")) {
            deleteCycle(cid);
            location.reload();
        }
        return;
    }

    // Delete materia
    if (t.dataset.deleteMateria) {
        const [cycleId, materiaId] = t.dataset.deleteMateria.split(":");
        if (confirm("Eliminar materia?")) {
            deleteMateria(cycleId, materiaId);
            location.reload();
        }
        return;
    }

    // Add electiva
    if (t.id === "btnAddElectiva") {
        addElectiva();
        location.reload();
        return;
    }

    // Delete electiva
    if (t.dataset.deleteElectiva) {
        const id = t.dataset.deleteElectiva;
        if (confirm("Eliminar electiva?")) {
            deleteElectiva(id);
            location.reload();
        }
        return;
    }
});

// -----------------------------
// Delegated events: input/change
// -----------------------------
document.addEventListener("input", (ev) => {
    const t = ev.target;
    const p = getPensum();
    if (!p) return;

    // Update pensum name
    if (t.id === "nombrePensum") {
        p.nombre = t.value;
        saveState();
        return;
    }

    // Materia inline edits: data-edit = "cycleId:materiaId:field"
    if (t.dataset.edit) {
        const [cycleId, materiaId, field] = t.dataset.edit.split(":");
        if (field === "prerequisitos" || field === "corequisitos") {
            // handled when blur or change to avoid splitting while typing? we'll still update on each input
            editMateriaField(cycleId, materiaId, field, t.value);
        } else if (field === "requires_all_until") {
            editMateriaField(cycleId, materiaId, field, t.value);
        } else {
            editMateriaField(cycleId, materiaId, field, t.value);
        }
        return;
    }

    // Electiva inline edits: data-edit-electiva = "id:field"
    if (t.dataset.editElectiva) {
        const [id, field] = t.dataset.editElectiva.split(":");
        editElectivaField(id, field, t.value);
        return;
    }
});

// -----------------------------
// File import for entire pensum (top-level import)
// -----------------------------
document.addEventListener("change", (ev) => {
    const t = ev.target;

    if (t.id === "fileImport") {
        const file = t.files && t.files[0];
        if (!file) return;
        file.text().then(text => {
            const ok = importPensum(text);
            if (ok) location.reload();
        }).catch(e => {
            alert("Error leyendo archivo: " + e.message);
        });
    }
});
