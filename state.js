// state.js — estado global de la aplicación

export const state = {
    pensums: [],    // lista de pensums
    currentPensum: null, // seleccionado por el usuario
    currentPlan: null    // resultado del algoritmo
};


// =================================================
// Persistencia
// =================================================

export function loadState() {
    try {
        const saved = localStorage.getItem("utesa_planner_state");
        if (saved) {
            const parsed = JSON.parse(saved);
            state.pensums = parsed.pensums ?? [];
            state.currentPensum = parsed.currentPensum ?? null;
        }
    } catch (e) {
        console.error("Error cargando estado:", e);
    }
}

export function saveState() {
    localStorage.setItem("utesa_planner_state", JSON.stringify({
        pensums: state.pensums,
        currentPensum: state.currentPensum
    }));
}

// cargar estado al importar este módulo
loadState();
