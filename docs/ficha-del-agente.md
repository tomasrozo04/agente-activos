# Ficha del agente (para copiar a la plantilla del curso)

**Nombre:** Analista de activos
**Plataforma:** página web (HTML + JavaScript) con la API gratuita de Gemini, publicada en GitHub Pages
**Enlace:** `https://TU-USUARIO.github.io/agente-activos/`
**Para qué sirve:** analiza un activo con reportes oficiales, compara el resultado con la guía de la empresa y entrega un informe de una página con semáforo, alertas y lo que debe verificarse.

## Los 6 componentes
| Componente | Dónde está |
|---|---|
| Instrucciones | `contexto/00-rol-y-limites.md` y `01-metodo.md` |
| Fuentes | `contexto/03-fuentes-oficiales.md` (solo reportes oficiales que subo yo) |
| Método | `contexto/01-metodo.md` (hecho / hipótesis / dato que falta) |
| Componente de datos | `config/umbrales.json` y `js/calculos.js` (indicadores y semáforo) |
| Formato de salida | `contexto/04-formatos-de-entrega.md` y `config/casos.json` |
| Límites | `contexto/00-rol-y-limites.md` |

## Pruebas (hazlas tú y pega captura)
1. **Normal:** botón "Ejemplo Netflix" → Calcular → Redactar. Revisa 3 cifras contra la carta a accionistas.
2. **Límite:** en el JSON cambia ingresos del 2T-26 a 12559900 (error de unidad) y calcula: debe avisar. El 1T-26 ya sale marcado como atípico.
3. **Dato faltante:** pon `null` en `deuda_total` y `caja_e_inversiones`: debe decir "dato no disponible" y no inventar.

## Verificación
Cuadres automáticos de los datos, verificación de cada cifra del informe, comparación manual de 3 cifras con el original.

## Semáforo
Solo información pública (verde). La clave de API queda en mi navegador.
