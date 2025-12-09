// router.js
import { render } from "./utils.js";
import { homeView } from "./views/homeView.js";
import { editorView } from "./editor/editorView.js";
import { plannerView } from "./planner/plannerView.js";

// Mapa de rutas limpias
const routes = {
    "/": homeView,
    "/pensums": editorView,
    "/planificador": plannerView
};

// Obtiene la ruta actual desde el hash
function getCurrentRoute() {
    const raw = location.hash.replace("#", "").trim();
    return raw === "" ? "/" : raw;
}

// Router principal
function router() {
    const path = getCurrentRoute();
    const view = routes[path] ?? homeView;
    render(view());
}

// Eventos
window.addEventListener("hashchange", router);
window.addEventListener("DOMContentLoaded", router);

// Render inicial
router();