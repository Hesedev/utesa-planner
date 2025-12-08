// views/homeView.js

export function homeView() {
    return `
        <div class="text-center">
            <h1 class="mb-3">Bienvenido a UTESA Planner</h1>
            <p class="lead">
                Organiza tus materias, crea planes de estudio y exporta tus pensums
                de manera fácil y rápida.
            </p>

            <div class="mt-4">
                <a href="#editor" class="btn btn-primary btn-lg me-2">
                    Editor de Pensum
                </a>

                <a href="#planner" class="btn btn-outline-primary btn-lg">
                    Planificación
                </a>
            </div>
        </div>
    `;
}
