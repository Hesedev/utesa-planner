// router.js
import { render } from "./utils.js";
import { homeView } from "./views/homeView.js";
import { editorView } from "./editor/editorView.js";
import { plannerView } from "./planner/plannerView.js";

// Rutas disponibles
const routes = {
    home: homeView,
    editor: editorView,
    planner: plannerView
};

// Función de enrutamiento
function router() {
    const hash = location.hash.replace("#", "") || "home";
    const view = routes[hash] ?? homeView;
    render(view());
}

// Detectar cambios
window.addEventListener("hashchange", router);

// Render inicial
router();
