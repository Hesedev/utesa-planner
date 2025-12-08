// utils.js

// Quitar espacios
export const trim = str => str.trim();

// Generar ID único (para pensums)
export function uid() {
    return "id-" + Math.random().toString(36).substring(2, 10);
}

// Renderizar contenido en el div principal
export function render(html) {
    document.getElementById("app").innerHTML = html;
}
