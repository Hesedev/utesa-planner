// planner/planner.js
import { state } from "../state.js";

export function getPensumById(id) {
    return state.pensums.find(p => p.id === id);
}

// Convierte la estructura del editor → formato del algoritmo
export function normalizePensum(pensum) {
    const materias = [];

    pensum.ciclos.forEach((ciclo, index) => {
        ciclo.materias.forEach(m => {
            materias.push({
                codigo: m.codigo.trim(),
                nombre: m.nombre.trim(),
                creditos: m.creditos ?? 0,
                prerequisitos: m.prerequisitos ?? [],
                corequisitos: m.corequisitos ?? [],
                cuatrimestre: index + 1,  // ciclo real
                tipo: m.tipo ?? "obligatoria",
                reglas: m.reglas ?? {}
            });
        });
    });

    // Electivas también se exportan pero el algoritmo las ignora
    pensum.electivas.forEach(e => {
        materias.push({
            codigo: e.codigo.trim(),
            nombre: e.nombre.trim(),
            creditos: e.creditos ?? 0,
            prerequisitos: [],
            corequisitos: [],
            cuatrimestre: 999, // electivas no tienen ciclo real
            tipo: "electiva",
            reglas: {}
        });
    });

    return { materias };
}
