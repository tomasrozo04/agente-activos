// Pruebas sin internet ni clave:  node tests/calculos.test.js
// Las tres pruebas del curso (normal, límite, dato faltante) + verificación de cifras inventadas.
const fs = require("fs");
const path = require("path");
const C = require("../js/calculos.js");

const raiz = path.join(__dirname, "..");
const BASE = JSON.parse(fs.readFileSync(path.join(raiz, "datos", "ejemplo_netflix.json"), "utf8"));
const CFG = JSON.parse(fs.readFileSync(path.join(raiz, "config", "umbrales.json"), "utf8"));
const clon = (o) => JSON.parse(JSON.stringify(o));
const per = (d, e) => d.periodos.find((p) => p.etiqueta === e);
let ok = 0, total = 0;
function chequeo(nombre, cond, detalle) {
  total++; if (cond) ok++;
  console.log(`  [${cond ? "PASA" : "FALLA"}] ${nombre}${detalle ? " · " + detalle : ""}`);
}

console.log("PRUEBA 1 · Caso normal (Netflix, 4T-24 a 2T-26)");
let r = C.analizar(BASE, CFG);
let u = r.periodos["2T-26"], g = r.guias["2T-26"];
chequeo("Margen operativo 2T-26 = 33,38%", Math.abs(u.margen_operativo_pct - 33.38) < 0.01, u.margen_operativo_pct + "%");
chequeo("Crecimiento a/a 2T-26 = 13,4%", Math.abs(u.crecimiento_aa_pct - 13.37) < 0.01, u.crecimiento_aa_pct + "%");
chequeo("Utilidad operativa vs guía = +2,1%", Math.abs(g.variacion_utilidad_operativa_pct - 2.13) < 0.05, g.variacion_utilidad_operativa_pct + "%");
chequeo("Efecto volumen + efecto margen = diferencia total", g.cuadra === true);
chequeo("Conversión de caja 2T-26 = 36,4% y Crítico", u.conversion_caja_pct === 36.4 && u.estado.conversion_caja === "Crítico");
chequeo("Hay alerta de conversión de caja en 2T-26", r.alertas.some((a) => a.periodo === "2T-26" && a.indicador === "conversion_caja"));
chequeo("3T-26 figura como guía pendiente", r.guias["3T-26"].estado.startsWith("pendiente"));
chequeo("Cuadres de los datos sin fallas", C.verificarCuadres(BASE, CFG).every((p) => p.ok));

console.log("\nPRUEBA 2 · Caso límite (cifra atípica)");
r = C.analizar(BASE, CFG);
const q1 = r.periodos["1T-26"];
chequeo("1T-26 (indemnización) se marca atípico", q1.atipicos.some((a) => a.includes("Conversión de caja")) && q1.atipicos.some((a) => a.includes("Nota del documento")), q1.conversion_caja_pct + "%");
const raro = clon(BASE); per(raro, "2T-26").ingresos.valor = 12559900;
chequeo("Detecta posible error de unidad (ingresos x1000)", C.verificarCuadres(raro, CFG).some((p) => !p.ok && p.prueba.includes("unidad")));
const caida = clon(BASE); per(caida, "2T-26").utilidad_operativa.valor = 2500;
chequeo("Caída fuerte de utilidad operativa: guía en Crítico", C.analizar(caida, CFG).guias["2T-26"].estado === "Crítico");

console.log("\nPRUEBA 3 · Caso con dato faltante");
const falta = clon(BASE);
falta.periodos.forEach((p) => { p.costo_ingresos = null; p.caja_e_inversiones = null; p.deuda_total = null; });
falta.guias = [];
const rf = C.analizar(falta, CFG), uf = rf.periodos["2T-26"];
chequeo("Margen bruto: 'dato no disponible'", uf.margen_bruto_pct === C.ND);
chequeo("Deuda neta: 'dato no disponible'", uf.deuda_neta === C.ND && uf.deuda_neta_sobre_uo_12m_x === C.ND);
chequeo("Lista lo que falta", rf.faltantes.length > 0, rf.faltantes.length + " campos");
const sinIng = clon(BASE); per(sinIng, "2T-26").ingresos = null;
chequeo("Sin ingresos del último periodo: avisa y no se cae", C.verificarCuadres(sinIng, CFG).some((p) => !p.ok));
C.analizar(sinIng, CFG);

console.log("\nPRUEBA EXTRA · Cifras inventadas en un informe");
r = C.analizar(BASE, CFG);
const bueno = "En el 2T-26 el margen operativo fue 33,4% y los ingresos US$12.560 M, con crecimiento de 13,4% a/a.";
const malo = bueno + " Además, el flujo de caja libre fue US$2.345 M y el margen bruto 61,7%.";
chequeo("Informe con cifras reales: sin sospechosas", C.verificarInforme(bueno, BASE, r).length === 0);
const sos = C.verificarInforme(malo, BASE, r);
chequeo("Informe con cifras inventadas: las marca", sos.includes("2.345") && sos.includes("61,7"), JSON.stringify(sos));

console.log("\nPARIDAD · mismo resultado que calculos.py (si existe el JSON de referencia)");
const ref = process.env.REF_PY;
if (ref && fs.existsSync(ref)) {
  const py = JSON.parse(fs.readFileSync(ref, "utf8"));
  const dif = [];
  (function cmp(a, b, ruta) {
    if (typeof a === "number" && typeof b === "number") { if (Math.abs(a - b) > 0.011) dif.push(`${ruta}: ${a} vs ${b}`); }
    else if (a && b && typeof a === "object" && typeof b === "object") {
      new Set([...Object.keys(a), ...Object.keys(b)]).forEach((k) => cmp(a[k], b[k], ruta + "." + k));
    } else if (typeof a === "string" && typeof b === "string" ? a.replace(/(\d)\.0\b/g, "$1") !== b.replace(/(\d)\.0\b/g, "$1") : a !== b) dif.push(`${ruta}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
  })({ analisis: C.analizar(BASE, CFG), cuadres: C.verificarCuadres(BASE, CFG) }, py, "");
  chequeo("Idéntico a Python", dif.length === 0, dif.slice(0, 5).join(" | "));
} else console.log("  (omitida: define REF_PY con la ruta al JSON de Python)");

console.log(`\nResultado: ${ok} de ${total} comprobaciones pasan.`);
process.exit(ok === total ? 0 : 1);
