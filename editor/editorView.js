// editor/editorView.js
import {
    createPensum,
    getPensum,
    renamePensum,
    deletePensum,
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

import { state, saveState } from "../state.js";
import { uid } from "../utils.js";

/* ===========================================
   Helpers de escape
   =========================================== */
function esc(str) {
    return (str ?? "").toString()
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

/* ===========================================
   MAIN VIEW
   =========================================== */
export function editorView() {
    const p = getPensum();

    const pensumsOptions = state.pensums
        .map(ps => `<option value="${ps.id}" ${p && ps.id === p.id ? "selected" : ""}>${esc(ps.nombre)}</option>`)
        .join("");

    const title = p ? esc(p.nombre) : "(ninguno)";

    return `
    <h2>Gestionar Pensums</h2>

    <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap flex-md-nowrap gap-2">
      <div>
        <label class="form-label">Pensum seleccionado</label>
        <div><strong id="currentPensumTitle">${title}</strong></div>
      </div>

      <div class="d-flex flex-wrap flex-md-nowrap gap-2">
        <select id="pensumSelector" class="form-select form-select-sm" style="min-width:240px;">
          <option disabled ${!p ? "selected" : ""}>-- Seleccionar pensum --</option>
          ${pensumsOptions}
        </select>
        <button id="btnManagePensums" class="btn btn-outline-secondary btn-sm">Gestionar</button>
        <button id="btnExportPensum" class="btn btn-success btn-sm">Exportar JSON</button>
      </div>
    </div>

    <hr>

    ${p ? renderEditorMain(p) : renderEmptyState()}
  `;
}

/* ===========================================
   EMPTY VIEW
   =========================================== */
function renderEmptyState() {
    return `
    <div class="card">
      <div class="card-body">
        <h5>No hay ningún pensum seleccionado</h5>
        <p>Crea uno nuevo o importa un JSON.</p>

        <div class="d-flex gap-2 flex-column flex-sm-row">
          <button class="btn btn-primary" id="btnNuevoPensum">Crear nuevo pensum</button>

          <div style="min-width:260px;">
            <label class="form-label mb-1">Importar pensum (.json)</label>
            <input id="fileImport" type="file" accept="application/json" class="form-control form-control-sm">
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ===========================================
   EDITOR MAIN: TABS
   =========================================== */
function renderEditorMain(p) {
    const totalCiclos = p.ciclos.length;
    const totalMaterias = p.ciclos.reduce((s, c) => s + (c.materias?.length || 0), 0);
    const totalCreditos = p.ciclos.reduce((s, c) => s + (c.materias?.reduce((ss, m) => ss + (m.creditos || 0), 0) || 0), 0);
    const totalElectivas = p.electivas?.length || 0;

    return `
    <div class="mb-3">
      <label class="form-label">Nombre del pensum</label>
      <input id="nombrePensum" class="form-control mb-2" value="${esc(p.nombre)}" placeholder="Nombre del pensum">

      <div class="d-flex gap-2">
        <button id="btnAddCycle" class="btn btn-primary btn-sm">+ Agregar ciclo</button>
        <button id="btnAddElectiva" class="btn btn-outline-secondary btn-sm">+ Agregar electiva</button>
        <button id="btnDuplicatePensum" class="btn btn-outline-info btn-sm">Duplicar pensum</button>
      </div>
    </div>

    <ul class="nav nav-tabs mb-3" id="editorTabs">
      <li class="nav-item">
        <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#tabResumen">Resumen</button>
      </li>
      <li class="nav-item">
        <button class="nav-link" data-bs-toggle="tab" data-bs-target="#tabCiclos">Ciclos</button>
      </li>
      <li class="nav-item">
        <button class="nav-link" data-bs-toggle="tab" data-bs-target="#tabElectivas">Electivas</button>
      </li>
      <li class="nav-item">
        <button class="nav-link" data-bs-toggle="tab" data-bs-target="#tabImport">Import/Export</button>
      </li>
    </ul>

    <div class="tab-content">

      <!-- RESUMEN -->
      <div class="tab-pane fade show active" id="tabResumen">
        ${renderResumen(totalCiclos, totalMaterias, totalCreditos, totalElectivas)}
      </div>

      <!-- CICLOS -->
      <div class="tab-pane fade" id="tabCiclos">
        <div id="cyclesContainerInner">
          ${p.ciclos.map((c, i) => renderCycleCard(c, i)).join("")}
        </div>
      </div>

      <!-- ELECTIVAS -->
      <div class="tab-pane fade" id="tabElectivas">
        <div id="electivasContainerInner">
          ${p.electivas.map(e => renderMateriaUnified(null, e, true)).join("")}
        </div>
      </div>

      <!-- IMPORT/EXPORT -->
      <div class="tab-pane fade" id="tabImport">
        ${renderImportExport()}
      </div>

    </div>

    ${renderManagePensumsModal()}
  `;
}

/* ===========================================
   RESUMEN
   =========================================== */
function renderResumen(ciclos, materias, creditos, electivas) {
    return `
    <div class="row g-3">
      <div class="col-6 col-md-3"><div class="card p-2"><div class="text-muted small">Ciclos</div><div class="fs-4">${ciclos}</div></div></div>
      <div class="col-6 col-md-3"><div class="card p-2"><div class="text-muted small">Materias</div><div class="fs-4">${materias}</div></div></div>
      <div class="col-6 col-md-3"><div class="card p-2"><div class="text-muted small">Créditos</div><div class="fs-4">${creditos}</div></div></div>
      <div class="col-6 col-md-3"><div class="card p-2"><div class="text-muted small">Electivas</div><div class="fs-4">${electivas}</div></div></div>
    </div>
  `;
}

/* ===========================================
   CYCLE CARD
   =========================================== */
function renderCycleCard(cycle, index) {
    const collapseId = `cycle_${cycle.id}`;

    return `
    <div class="card mb-3" data-cycle="${cycle.id}">
      <div class="card-header d-flex justify-content-between align-items-center">
        <strong>Ciclo ${index + 1}</strong>

        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-secondary" data-bs-toggle="collapse" data-bs-target="#${collapseId}">
            Mostrar / Ocultar
          </button>
          <button class="btn btn-sm btn-outline-danger" data-delete-cycle="${cycle.id}">
            Eliminar ciclo
          </button>
        </div>
      </div>

      <div id="${collapseId}" class="collapse show">
        <div class="card-body">
          ${cycle.materias.map(m => renderMateriaUnified(cycle.id, m, false)).join("")}

          <button class="btn btn-sm btn-outline-primary mt-2" data-add-materia="${cycle.id}">
            + Agregar materia
          </button>
        </div>
      </div>
    </div>
  `;
}


/* ===========================================
   UNIFIED MATERIA CARD (para ciclos y electivas)
   =========================================== */
function renderMateriaUnified(cycleId, m, isElectiva) {
    const prereq = Array.isArray(m.prerequisitos) ? m.prerequisitos.join(", ") : "";
    const coreq = Array.isArray(m.corequisitos) ? m.corequisitos.join(", ") : "";
    const rule = m.reglas?.requires_all_until ?? "";

    // Forzamos el tipo según el contexto
    if (isElectiva) m.tipo = "electiva";
    else m.tipo = "normal";

    return `
    <div class="card p-3 mb-3" data-materia="${cycleId ?? "electiva"}:${m.id}">
      <div class="d-flex justify-content-between">
        <div>
          <strong>${esc(m.codigo) || "(sin código)"}</strong>
          <div class="text-muted small">${esc(m.nombre) || "(sin nombre)"}</div>
        </div>
        <button class="btn btn-sm btn-outline-danger" ${isElectiva ? `data-delete-electiva="${m.id}"` : `data-delete-materia="${cycleId}:${m.id}"`}>
          Eliminar
        </button>
      </div>

      <div class="row g-2 mt-3">

        <div class="col-md-3">
          <label class="small">Código</label>
          <input class="form-control form-control-sm"
            ${isElectiva ? `data-edit-electiva="${m.id}:codigo"` : `data-edit="${cycleId}:${m.id}:codigo"`}
            value="${esc(m.codigo)}">
        </div>

        <div class="col-md-5">
          <label class="small">Nombre</label>
          <input class="form-control form-control-sm"
            ${isElectiva ? `data-edit-electiva="${m.id}:nombre"` : `data-edit="${cycleId}:${m.id}:nombre"`}
            value="${esc(m.nombre)}">
        </div>

        <div class="col-md-2">
          <label class="small">Créditos</label>
          <input type="number" min="0" class="form-control form-control-sm"
            ${isElectiva ? `data-edit-electiva="${m.id}:creditos"` : `data-edit="${cycleId}:${m.id}:creditos"`}
            value="${m.creditos || 0}">
        </div>

        <!-- SIN campo "tipo" -->

        <div class="col-12">
          <label class="small">Pre-requisitos</label>
          <input class="form-control form-control-sm"
            ${isElectiva ? `data-edit-electiva="${m.id}:prerequisitos"` : `data-edit="${cycleId}:${m.id}:prerequisitos"`}
            value="${esc(prereq)}">
        </div>

        <div class="col-12">
          <label class="small">Co-requisitos</label>
          <input class="form-control form-control-sm"
            ${isElectiva ? `data-edit-electiva="${m.id}:corequisitos"` : `data-edit="${cycleId}:${m.id}:corequisitos"`}
            value="${esc(coreq)}">
        </div>

        <div class="col-md-6">
          <label class="small">Requiere haber aprobado todas las materias hasta el ciclo</label>
          <input type="number" min="0" class="form-control form-control-sm"
            ${isElectiva ? `data-edit-electiva="${m.id}:requires_all_until"` : `data-edit="${cycleId}:${m.id}:requires_all_until"`}
            value="${rule}">
        </div>

      </div>
    </div>
  `;
}


/* ===========================================
   IMPORT/EXPORT TAB
   =========================================== */
function renderImportExport() {
    return `
    <div class="mb-3">
      <label class="form-label">Importar pensum (.json)</label>
      <input id="fileImport" type="file" accept="application/json" class="form-control">
    </div>

    <div class="mb-3 d-flex gap-2">
      <button id="btnExportPensum" class="btn btn-success btn-sm">Exportar JSON del pensum</button>
      <button id="btnExportAll" class="btn btn-outline-secondary btn-sm">Exportar todos los pensums</button>
    </div>

    <small class="text-muted">La importación normaliza IDs y maneja nombres duplicados.</small>
  `;
}

/* ===========================================
   MODAL: Manage Pensums
   =========================================== */
function renderManagePensumsModal() {
    const list = state.pensums.map(p => `
    <li class="list-group-item d-flex justify-content-between align-items-center">
      <div>
        <strong>${esc(p.nombre)}</strong>
        <div class="text-muted small">Ciclos: ${p.ciclos.length}, Electivas: ${p.electivas?.length || 0}</div>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-primary" data-select-pensum="${p.id}">Seleccionar</button>
        <button class="btn btn-sm btn-outline-secondary" data-rename-pensum="${p.id}">Renombrar</button>
        <button class="btn btn-sm btn-danger" data-delete-pensum="${p.id}">Eliminar</button>
      </div>
    </li>`).join("");

    return `
    <div class="modal fade" id="modalManagePensums" tabindex="-1">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">

          <div class="modal-header">
            <h5 class="modal-title">Gestionar Pensums</h5>
            <button class="btn-close" data-bs-dismiss="modal"></button>
          </div>

          <div class="modal-body">
            <div class="d-flex gap-2 mb-3">
              <input id="newPensumNameModal" class="form-control" placeholder="Nombre nuevo pensum">
              <button id="btnCreatePensumModal" class="btn btn-primary">Crear</button>
            </div>
            <ul class="list-group">${list}</ul>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
          </div>

        </div>
      </div>
    </div>
  `;
}

/* ===========================================
   EVENTOS CLICK
   =========================================== */
document.addEventListener("click", (ev) => {
    const t = ev.target;

    // Crear pensum
    if (t.id === "btnNuevoPensum" || t.id === "btnNewPensumSmall") {
        const name = prompt("Nombre del pensum:");
        if (name) {
            createPensum(name);
            location.reload();
        }
    }

    // Gestión modal
    if (t.id === "btnManagePensums" || t.id === "btnManagePensumModal") {
        const modal = new bootstrap.Modal(document.getElementById("modalManagePensums"));
        modal.show();
        return;
    }

    if (t.id === "btnCreatePensumModal") {
        const name = document.getElementById("newPensumNameModal").value.trim();
        if (!name) return alert("Nombre inválido");
        createPensum(name);
        location.reload();
    }

    if (t.dataset.selectPensum) {
        state.currentPensum = t.dataset.selectPensum;
        saveState();
        location.reload();
    }

    if (t.dataset.renamePensum) {
        const ps = state.pensums.find(p => p.id === t.dataset.renamePensum);
        const nuevo = prompt("Nuevo nombre", ps.nombre);
        if (nuevo && renamePensum(ps.id, nuevo)) {
            location.reload();
        }
        return;
    }

    if (t.dataset.deletePensum) {
        if (confirm("¿Eliminar pensum?")) {
            deletePensum(t.dataset.deletePensum);
            location.reload();
        }
        return;
    }

    // Export
    if (t.id === "btnExportPensum") {
        exportPensum();
        return;
    }

    if (t.id === "btnExportAll") {
        const blob = new Blob([JSON.stringify(state.pensums, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "pensums-backup.json";
        a.click();
        return;
    }

    // Add cycle
    if (t.id === "btnAddCycle") {
        addCycle();
        location.reload();
        return;
    }

    // Duplicate
    if (t.id === "btnDuplicatePensum") {
        duplicateCurrentPensum();
        return;
    }

    // Add materia
    if (t.dataset.addMateria) {
        addMateria(t.dataset.addMateria);
        location.reload();
        return;
    }

    // Delete ciclo
    if (t.dataset.deleteCycle) {
        if (confirm("¿Eliminar ciclo completo?")) {
            deleteCycle(t.dataset.deleteCycle);
            location.reload();
        }
        return;
    }

    // Delete materia
    if (t.dataset.deleteMateria) {
        const [c, m] = t.dataset.deleteMateria.split(":");
        if (confirm("¿Eliminar materia?")) {
            deleteMateria(c, m);
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
        if (confirm("¿Eliminar electiva?")) {
            deleteElectiva(t.dataset.deleteElectiva);
            location.reload();
        }
        return;
    }
});

/* ===========================================
   INPUT EVENTS
   =========================================== */
document.addEventListener("input", (ev) => {
    const t = ev.target;
    const p = getPensum();
    if (!p) return;

    if (t.id === "nombrePensum") {
        const ok = renamePensum(p.id, t.value);
        if (!ok) alert("Nombre duplicado o inválido");
        return;
    }

    // Materias
    if (t.dataset.edit) {
        const [c, m, field] = t.dataset.edit.split(":");
        editMateriaField(c, m, field, t.value);
        return;
    }

    // Electivas
    if (t.dataset.editElectiva) {
        const [id, field] = t.dataset.editElectiva.split(":");
        editElectivaField(id, field, t.value);
        return;
    }
});

/* ===========================================
   CHANGE EVENTS
   =========================================== */
document.addEventListener("change", (ev) => {
    const t = ev.target;

    if (t.id === "pensumSelector") {
        state.currentPensum = t.value;
        saveState();
        location.reload();
    }

    if (t.id === "fileImport") {
        const file = t.files[0];
        if (!file) return;
        file.text().then(text => {
            if (importPensum(text)) location.reload();
        });
    }
});

/* ===========================================
   DUPLICATE FUNCTION
   =========================================== */
function duplicateCurrentPensum() {
    const p = getPensum();
    if (!p) return;

    const copy = JSON.parse(JSON.stringify(p));
    copy.id = uid();
    copy.nombre = `${p.nombre} (copia)`;

    copy.ciclos.forEach((c, i) => {
        c.id = uid();
        c.materias.forEach(m => m.id = uid());
    });

    copy.electivas.forEach(e => e.id = uid());

    state.pensums.push(copy);
    state.currentPensum = copy.id;
    saveState();
    location.reload();
}
