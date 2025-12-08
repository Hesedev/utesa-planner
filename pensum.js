export default {
    "carrera": "Ingeniería en Sistemas Computacionales",
    "version": "EJEMPLO",
    "materias": [
        {
            "codigo": "MAT-101",
            "nombre": "Matemática I",
            "creditos": 4,
            "cuatrimestre": 1,
            "tipo": "obligatoria",
            "prerequisitos": [],
            "corequisitos": [],
            "reglas": {}
        },
        {
            "codigo": "INF-110",
            "nombre": "Introducción a la Programación",
            "creditos": 4,
            "cuatrimestre": 1,
            "tipo": "obligatoria",
            "prerequisitos": [],
            "corequisitos": [],
            "reglas": {}
        },
        {
            "codigo": "ING-101",
            "nombre": "Inglés I",
            "creditos": 0,
            "cuatrimestre": 1,
            "tipo": "obligatoria",
            "prerequisitos": [],
            "corequisitos": [],
            "reglas": {}
        },
        {
            "codigo": "SOC-100",
            "nombre": "Metodología de la Investigación",
            "creditos": 3,
            "cuatrimestre": 1,
            "tipo": "obligatoria",
            "prerequisitos": [],
            "corequisitos": [],
            "reglas": {}
        },
        {
            "codigo": "MAT-102",
            "nombre": "Matemática II",
            "creditos": 4,
            "cuatrimestre": 2,
            "tipo": "obligatoria",
            "prerequisitos": [
                "MAT-101"
            ],
            "corequisitos": [],
            "reglas": {}
        },
        {
            "codigo": "INF-120",
            "nombre": "Programación I",
            "creditos": 4,
            "cuatrimestre": 2,
            "tipo": "obligatoria",
            "prerequisitos": [
                "INF-110"
            ],
            "corequisitos": [
                "INF-121"
            ],
            "reglas": {}
        },
        {
            "codigo": "INF-121",
            "nombre": "Laboratorio Programación I",
            "creditos": 1,
            "cuatrimestre": 2,
            "tipo": "obligatoria",
            "prerequisitos": [
                "INF-110"
            ],
            "corequisitos": [
                "INF-120"
            ],
            "reglas": {}
        },
        {
            "codigo": "ING-102",
            "nombre": "Inglés II",
            "creditos": 0,
            "cuatrimestre": 2,
            "tipo": "obligatoria",
            "prerequisitos": [
                "ING-101"
            ],
            "corequisitos": [],
            "reglas": {}
        },
        {
            "codigo": "INF-210",
            "nombre": "Programación II",
            "creditos": 4,
            "cuatrimestre": 3,
            "tipo": "obligatoria",
            "prerequisitos": [
                "INF-120",
                "INF-121"
            ],
            "corequisitos": [
                "INF-211"
            ],
            "reglas": {}
        },
        {
            "codigo": "INF-211",
            "nombre": "Laboratorio Programación II",
            "creditos": 1,
            "cuatrimestre": 3,
            "tipo": "obligatoria",
            "prerequisitos": [
                "INF-120",
                "INF-121"
            ],
            "corequisitos": [
                "INF-210"
            ],
            "reglas": {}
        },
        {
            "codigo": "MAT-200",
            "nombre": "Cálculo I",
            "creditos": 4,
            "cuatrimestre": 3,
            "tipo": "obligatoria",
            "prerequisitos": [
                "MAT-101"
            ],
            "corequisitos": [],
            "reglas": {}
        },
        {
            "codigo": "INF-310",
            "nombre": "Estructuras de Datos",
            "creditos": 4,
            "cuatrimestre": 4,
            "tipo": "obligatoria",
            "prerequisitos": [
                "INF-210",
                "INF-211"
            ],
            "corequisitos": [],
            "reglas": {}
        },
        {
            "codigo": "INF-320",
            "nombre": "Bases de Datos I",
            "creditos": 4,
            "cuatrimestre": 4,
            "tipo": "obligatoria",
            "prerequisitos": [
                "INF-210"
            ],
            "corequisitos": [],
            "reglas": {}
        },
        {
            "codigo": "ADM-500",
            "nombre": "Formación de Emprendedores",
            "creditos": 3,
            "cuatrimestre": 10,
            "tipo": "obligatoria",
            "prerequisitos": [],
            "corequisitos": [],
            "reglas": {
                "requires_all_until": 9
            }
        },
        {
            "codigo": "ELEC-DS",
            "nombre": "Electiva: Ciencia de Datos",
            "creditos": 3,
            "cuatrimestre": null,
            "tipo": "electiva",
            "prerequisitos": [
                "INF-310",
                "INF-320"
            ],
            "corequisitos": [],
            "reglas": {}
        },
        {
            "codigo": "ELEC-SEG",
            "nombre": "Electiva: Seguridad Informática",
            "creditos": 3,
            "cuatrimestre": null,
            "tipo": "electiva",
            "prerequisitos": [
                "INF-310"
            ],
            "corequisitos": [],
            "reglas": {}
        },
        {
            "codigo": "ELEC-WEB",
            "nombre": "Electiva: Desarrollo Web Avanzado",
            "creditos": 3,
            "cuatrimestre": null,
            "tipo": "electiva",
            "prerequisitos": [
                "INF-210"
            ],
            "corequisitos": [],
            "reglas": {}
        }
    ]
}