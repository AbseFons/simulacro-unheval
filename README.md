# Simulacro UNHEVAL

Aplicación web estática para practicar simulacros mediante archivos JSON.

## Estructura

- `index.html`: interfaz principal.
- `css/styles.css`: estilos.
- `js/app.js`: lógica del simulador.
- `data/examenes.json`: catálogo que relaciona tipo + dificultad con un archivo JSON.
- `data/preferencial/`: simulacros preferenciales.
- `data/general/`: simulacros generales.

## Cómo ejecutarlo

Los navegadores suelen bloquear `fetch()` cuando se abre `index.html` directamente con doble clic (`file://`).

Usa una de estas opciones:

### Opción 1: VS Code + Live Server

1. Abre la carpeta `simulacro-unheval` en Visual Studio Code.
2. Instala la extensión **Live Server** si todavía no la tienes.
3. Haz clic derecho sobre `index.html`.
4. Elige **Open with Live Server**.

### Opción 2: Python

Abre una terminal dentro de la carpeta y ejecuta:

```bash
python -m http.server 5500
```

Luego abre:

```text
http://localhost:5500
```

En Windows también puede funcionar:

```bash
py -m http.server 5500
```

## Funcionalidad implementada

- Selección de examen Preferencial o General.
- Selección Fácil, Intermedio o Difícil.
- Pantalla previa con resumen del examen.
- Temporizador.
- Guardado temporal mediante `localStorage`.
- Recuperación de un simulacro después de recargar la página.
- Navegación de preguntas por área.
- Navegación directa mediante números.
- Alerta al pasar de área si existen preguntas pendientes.
- Confirmación antes de finalizar.
- Finalización automática cuando termina el tiempo.
- Nota y porcentaje.
- Correctas, incorrectas y no respondidas.
- Rendimiento por área.
- Rendimiento por tema.
- Revisión de preguntas.
- Explicación únicamente para preguntas incorrectas o sin responder.

## Formato mínimo de una pregunta

```json
{
  "id": "AM-001",
  "tema": "Sucesiones",
  "pregunta": "Texto de la pregunta",
  "alternativas": [
    { "id": "A", "texto": "Alternativa A" },
    { "id": "B", "texto": "Alternativa B" },
    { "id": "C", "texto": "Alternativa C" },
    { "id": "D", "texto": "Alternativa D" },
    { "id": "E", "texto": "Alternativa E" }
  ],
  "respuestaCorrecta": "C",
  "puntaje": 25,
  "explicacion": "Explicación breve de por qué C es correcta."
}
```

## Nota sobre las preguntas de demostración

Los JSON incluidos contienen preguntas ficticias/placeholder únicamente para probar la funcionalidad. No representan preguntas reales de la UNHEVAL.
