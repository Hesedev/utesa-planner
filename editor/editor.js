// editor/editor.js
import { state, saveState } from "../state.js";
import { uid } from "../utils.js";

/*****************************************************************
 *                     CREAR Y OBTENER PENSUM
 *****************************************************************/

export function createPensum(nombre = "") {
    const nuevo = {
        id: uid(),
        nombre,
        ciclos: [],
        electivas: []
    };

    state.pensums.push(nuevo);
    state.currentPensum = nuevo.id;
    saveState();

    return nuevo;
}

export function getPensum() {
    return state.pensums.find(p => p.id === state.currentPensum) || null;
}

/*****************************************************************
 *                          CICLOS
 *****************************************************************/

export function addCycle() {
    const p = getPensum();
    if (!p) return;

    p.ciclos.push({
        id: uid(),
        materias: []
    });

    saveState();
}

export function deleteCycle(cycleId) {
    const p = getPensum();
    if (!p) return;

    p.ciclos = p.ciclos.filter(c => c.id !== cycleId);
    saveState();
}

/*****************************************************************
 *                         MATERIAS
 *****************************************************************/

export function addMateria(cycleId) {
    const p = getPensum();
    if (!p) return;

    const cycle = p.ciclos.find(c => c.id === cycleId);
    if (!cycle) return;

    cycle.materias.push({
        id: uid(),
        codigo: "",
        nombre: "",
        creditos: 0,
        prerequisitos: [],
        corequisitos: [],
        reglas: {},
        tipo: "obligatoria"
    });

    saveState();
}

export function deleteMateria(cycleId, materiaId) {
    const p = getPensum();
    if (!p) return;

    const cycle = p.ciclos.find(c => c.id === cycleId);
    if (!cycle) return;

    cycle.materias = cycle.materias.filter(m => m.id !== materiaId);

    saveState();
}

/*****************************************************************
 *                       EDITAR MATERIA
 *****************************************************************/

export function editMateriaField(cycleId, materiaId, field, value) {
    const p = getPensum();
    if (!p) return;

    // Electivas usan otro array, así que ignoramos aquí
    for (const cycle of p.ciclos) {
        if (cycle.id === cycleId) {
            const materia = cycle.materias.find(m => m.id === materiaId);
            if (!materia) break;

            if (field === "creditos") value = Number(value);

            // Arrays: prerequisitos y corequisitos
            if (field === "prerequisitos" || field === "corequisitos") {
                materia[field] = value
                    .split(",")
                    .map(x => x.trim())
                    .filter(Boolean);
            }
            else if (field === "requires_all_until") {
                materia.reglas.requires_all_until = value ? Number(value) : null;
            }
            else {
                materia[field] = value;
            }

            saveState();
            return;
        }
    }
}

/*****************************************************************
 *                         ELECTIVAS
 *****************************************************************/

export function addElectiva() {
    const p = getPensum();
    if (!p) return;

    p.electivas.push({
        id: uid(),
        codigo: "",
        nombre: "",
        creditos: 0,
        tipo: "electiva"
    });

    saveState();
}

export function deleteElectiva(id) {
    const p = getPensum();
    if (!p) return;

    p.electivas = p.electivas.filter(e => e.id !== id);
    saveState();
}

export function editElectivaField(id, field, value) {
    const p = getPensum();
    if (!p) return;

    const electiva = p.electivas.find(e => e.id === id);
    if (!electiva) return;

    if (field === "creditos") value = Number(value);

    electiva[field] = value;
    saveState();
}

/*****************************************************************
 *                  IMPORTAR / EXPORTAR JSON
 *****************************************************************/

export function importPensum(jsonData) {
    try {
        const obj = JSON.parse(jsonData);

        if (!obj.nombre || !obj.ciclos) {
            alert("JSON inválido o incompleto.");
            return false;
        }

        obj.id = uid();
        state.pensums.push(obj);
        state.currentPensum = obj.id;
        saveState();
        return true;

    } catch (e) {
        alert("Ocurrió un error al leer el JSON.");
        return false;
    }
}

export function exportPensum() {
    const p = getPensum();
    if (!p) return;

    const blob = new Blob([JSON.stringify(p, null, 2)], { type: "application/json" });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${p.nombre || "pensum"}.json`;
    a.click();
}
