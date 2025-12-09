// views/homeView.js

export function homeView() {
    return `
        <div id="homeContainer">
            <div class="text-center">
                <h1 class="mb-3">¡Bienvenido a Pensum Planner!</h1>
                <p class="lead">
                    Exporta/Importa tus pensums y crea planes de estudio optimizados de manera fácil y rápida.
                </p>

                <div class="mt-4">
                    <a href="#editor" class="btn btn-warning btn-lg me-2">
                        Editor de Pensum
                    </a>

                    <a href="#planner" class="btn btn-outline-success btn-lg">
                        Planificación
                    </a>
                </div>
            </div>
        </div>
    `;
}
