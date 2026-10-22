# Indicadores y alertas

Los indicadores los calcula código, no tú. Reproduce las cifras tal cual, con unidad y periodo. No recalcules ni redondees distinto.

| Indicador | Definición | Semáforo por defecto |
|---|---|---|
| Margen bruto % | (ingresos − costo de ingresos) / ingresos | informativo |
| Margen operativo % | utilidad operativa / ingresos | cambio frente al año previo: Bien ≥ −1 pt, Atención ≥ −3 pts |
| Crecimiento a/a % | ingresos frente al mismo periodo del año previo | Bien ≥ 10%, Atención ≥ 5% |
| Resultado vs guía % | utilidad operativa real frente a la guía de la empresa | Bien ≥ −2%, Atención ≥ −5% |
| Conversión de caja % | flujo de caja libre / utilidad operativa | Bien ≥ 60%, Atención ≥ 40% |
| Deuda neta / utilidad operativa 12M | (deuda total − caja e inversiones) / utilidad operativa de 4 trimestres | Bien ≤ 1,0×, Atención ≤ 2,5× |

Los umbrales son supuestos del usuario y se editan en `config/umbrales.json`. La utilidad operativa sustituye al EBITDA cuando el EBITDA no está disponible.

Estados: **Bien**, **Atención**, **Crítico**. Un periodo marcado como atípico no se compara como normal.
