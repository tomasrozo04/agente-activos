# Caso de uso: Analista de activos

## El problema
Soy inversionista minorista y estudiante de Gerencia Financiera. Cada trimestre, para cada activo que sigo, tengo que leer cartas a accionistas y reportes de 20 a 60 páginas, sacar las cifras, compararlas con lo que la empresa había pronosticado y decidir si algo cambió. Eso me toma entre 1 y 2 horas por activo, y hay tres riesgos: copiar mal una cifra, comparar un trimestre raro (con una partida única) como si fuera normal, y mezclar lo que dicen los números con lo que yo supongo.

## Quién lo usa y cuándo
Yo, después de que una empresa publica resultados, antes de decidir si cambio algo en mi portafolio. Opero con montos pequeños, a 1 a 3 meses, sin apalancamiento. La decisión es mía; el agente prepara el análisis.

## Caso principal: resultados frente a la guía
**Entrada:** los reportes oficiales del activo (carta a accionistas, 10-Q).
**Qué hace el agente:**
1. Extrae las cifras con su fuente (IA).
2. Calcula márgenes, crecimiento, conversión de caja, deuda neta, resultado frente a la guía con efecto volumen y efecto margen, y semáforo (código).
3. Redacta un informe de una página (IA) con titular, tabla, tres hallazgos, alertas, hechos / hipótesis / datos que faltan, sensibilidad y qué verificar.
4. Verifica que cada cifra del informe exista en los datos (código).
**Resultado esperado:** en 10 minutos tengo un informe que puedo revisar contra el original, en lugar de 1 a 2 horas de trabajo manual.

## Casos conectados (mismos datos, otro entregable)
| Caso | Pregunta que responde | Entregable |
|---|---|---|
| Escenarios y sensibilidad | ¿Cuánto cambia la utilidad si los ingresos o el margen se mueven? | Tabla bajo / base / alto |
| Qué cambió entre reportes | ¿Qué es distinto frente al trimestre anterior y al año pasado? | Resumen ordenado por impacto |
| Caso práctico del activo | ¿Cómo estudio este activo a fondo? | Documento de 2 a 3 páginas |
| Crítica de la tesis | ¿Por qué podría fallar lo que pienso? | Pre-mortem con señales tempranas |
| Radar semanal (gemelo digital) | ¿Cuál de mis activos pide atención esta semana? | Lista corta priorizada |

Todos usan el mismo flujo y las mismas reglas: solo fuentes oficiales, nada de comprar / vender / mantener, y cifras verificadas por código.

## Cómo mido si sirve
- Tiempo por activo: de 1 a 2 horas a menos de 15 minutos.
- Cifras del informe que no están en los datos: cero (las marca el verificador).
- Al comparar 3 cifras al azar con el documento original: coinciden las 3.
- En las 3 pruebas del curso (normal, límite, dato faltante) el agente no inventa y avisa lo que falta.

## Lo que no hace
No recomienda comprar o vender, no usa foros ni sitios no oficiales, no estima datos que no están, no recibe información confidencial.
