# Analista de activos (HTML + JavaScript + API gratuita de Gemini)

Agente para el curso "IA para la Gerencia". Analiza un activo con reportes oficiales y entrega un informe verificado. **La IA lee y redacta; el código calcula y verifica.**

```
Reportes oficiales (PDF/TXT) ─► 1 EXTRAER (Gemini → JSON con fuente por cifra)
                              ─► 2 REVISAR  (tú, con cuadres automáticos)
                              ─► 3 CALCULAR (js/calculos.js, sin IA)
                              ─► 4 REDACTAR (Gemini + carpeta contexto/)
                              ─► 5 VERIFICAR (cada cifra del informe debe existir en los datos)
```

## Estructura
```
index.html        página
css/styles.css    estilo
js/calculos.js    cálculos, cuadres y verificación (sin internet)
js/gemini.js      cliente de la API REST de Gemini
js/app.js         interfaz
contexto/         instrucciones del agente (rol, método, indicadores, fuentes, formatos, extracción)
config/           umbrales del semáforo y casos de uso (editables)
datos/            ejemplo real de Netflix con fuente por cifra
docs/             caso de uso, ficha del curso, gemelo digital
tests/            node tests/calculos.test.js
```

## Publicar en GitHub Pages
1. Crea un repositorio nuevo en GitHub (por ejemplo `agente-activos`), público.
2. Sube todo el contenido de esta carpeta (en el repositorio, botón **Add file → Upload files**, arrastra los archivos y carpetas, **Commit**).
3. **Settings → Pages → Build and deployment**: Source = *Deploy from a branch*, Branch = `main`, carpeta `/ (root)`. Guardar.
4. En 1 o 2 minutos queda en `https://TU-USUARIO.github.io/agente-activos/`.

**Nunca subas tu clave de API al repositorio.** La página pide la clave y la guarda solo en tu navegador (opcional).

## Clave gratuita de Gemini
Créala en https://aistudio.google.com/apikey. Notas sobre el nivel gratuito (documentación oficial de Gemini):
- La búsqueda con Google no está disponible en el nivel gratuito; por eso el agente no navega: tú subes los reportes oficiales.
- Lo que envías puede usarse para mejorar productos de Google. Sube solo información pública.
- Los límites por minuto y por día son por proyecto y cambian. Si hay error 429, la página espera y prueba el modelo de respaldo.
- Los nombres de modelo cambian. Si uno falla, edítalo en el paso 1 de la página.

## Probar en tu computador
```
python -m http.server 8000     # en esta carpeta, y abre http://localhost:8000
node tests/calculos.test.js    # pruebas de cálculos (18)
```

## Personalizar
- Cambiar el comportamiento: edita los `.md` de `contexto/`.
- Cambiar umbrales del semáforo: `config/umbrales.json`.
- Añadir un caso de uso: agrega un objeto en `config/casos.json` (nombre, resumen, tarea).

## Limitaciones
- Las pruebas de cálculos pasan sin internet. Las llamadas a Gemini se probaron con una respuesta simulada, **no con una clave real**: si algo falla en tu primera corrida, el mensaje dirá si es clave, cuota o nombre de modelo.
- Deuda neta = deuda total − caja e inversiones; la utilidad operativa sustituye al EBITDA.
- La verificación de cifras es heurística: marca lo que no encuentra y una persona debe revisarlo.
- No es asesoría de inversión.
