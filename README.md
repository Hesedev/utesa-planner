# 🎓 Pensum Planner

![Logo del Pensum Planner](assets/logo.png)

**Pensum Planner** es una herramienta de planificación académica inteligente diseñada para ayudar a los estudiantes universitarios a optimizar su trayectoria de estudio. El sistema permite al estudiante **organizar de forma inteligente** su carrera, generando automáticamente el plan de materias más eficiente para completarla en el menor tiempo posible, respetando estrictamente todas las dependencias académicas.

---

## 🚀 Características Esenciales

Pensum Planner ofrece las herramientas clave para la organización académica:

* **Planificación Óptima:** Genera la secuencia de ciclos más eficiente basándose en el historial de materias aprobadas y los límites de créditos/asignaturas por ciclo.
* **Gestión de Dependencias:** Soporte completo para la validación de prerrequisitos, correquisitos y reglas especiales de las materias.
* **Editor de Pensums:** Permite cargar, crear y editar pensums completos, gestionando ciclos, materias y electivas.
* **Portabilidad:** Importación y exportación de pensums en formato **JSON** para un fácil intercambio.
* **Documentación:** Exportación del plan de estudio generado a un archivo **PDF** de alta calidad.

---

## 💡 Alcance y Compatibilidad

### Enfoque

Este proyecto fue desarrollado y está **especialmente optimizado** para la estructura académica **cuatrimestral** de la **Universidad Tecnológica de Santiago (UTESA)**.

### Compatibilidad

El sistema puede funcionar con cualquier plan de estudios (pensum) que siga un formato de ciclos (cuatrimestres/trimestres) y que pueda ser modelado en la estructura JSON interna del proyecto.

---

## 📚 Biblioteca de Pensums

Con el objetivo de ser una herramienta impulsada por la comunidad, este repositorio incluye la carpeta `/data/pensums` (no incluida inicialmente en el repositorio, pero es la ruta recomendada), que sirve como una biblioteca de planes de estudio listos para usar, aportados por los usuarios.

Si tu pensum aún no está disponible, puedes:

1.  Usar la herramienta de edición para crearlo e importarlo tú mismo.
2.  **¡Contribuir!** Envía un Pull Request con el archivo JSON de tu pensum a la carpeta `/data/pensums` para ayudar a otros estudiantes.

---

## 🛠️ Cómo Empezar

Pensum Planner es una aplicación **Vanilla JavaScript** que puede ser usada directamente desde la web o ejecutada localmente.

### 1. Uso Directo (Recomendado para Usuarios)

Puedes usar la herramienta sin instalar nada, directamente en tu navegador, gracias a GitHub Pages:

🔗 **[Abrir Pensum Planner en vivo](https://hesedev.github.io/pensum-planner/)**

### 2. Ejecución Local (Para Contribuyentes)

Si deseas modificar el código o desarrollar nuevas funcionalidades:

1.  **Clona el repositorio:**
    ```bash
    git clone [[https://github.com/tu-usuario/pensum-planner.git](https://github.com/tu-usuario/pensum-planner.git)]
    ```
2.  **Ejecución:** Simplemente abre el archivo `index.html` en tu navegador.
    > **Nota:** Para que las funciones de importar y exportar archivos funcionen correctamente, se recomienda usar un servidor local simple (ej. Live Server).

---

## 🤝 Contribuciones (Open Source)

Este es un proyecto *open source*. Damos la bienvenida a la comunidad para:

1.  Reportar errores o sugerir mejoras en la sección de [Issues](https://github.com/tu-usuario/pensum-planner/issues).
2.  Contribuir código para ampliar la funcionalidad, mejorar el algoritmo o subir un nuevo pensum compatible a la Biblioteca.

---

## 🧑‍💻 Autor

* **Hesedev** - [https://github.com/Hesedev](https://github.com/Hesedev)

---

## 📜 Licencia

Este proyecto está distribuido bajo la licencia **MIT**.