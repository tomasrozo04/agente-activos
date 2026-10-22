/* Cálculos deterministas del agente (puerto de calculos.py).
 * Regla de diseño: la IA lee y redacta, el código calcula y verifica.
 * Funciona en el navegador (window.Calculos) y en Node (require). No usa internet. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Calculos = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const ND = "dato no disponible";
  const ESTADOS = { verde: "Bien", amarillo: "Atención", rojo: "Crítico" };
  const estadoTxt = (s) => (s ? ESTADOS[s] : ND);

  const esNum = (x) => typeof x === "number" && Number.isFinite(x);
  const nulo = (x) => x === null || x === undefined;

  /** Valor numérico de un campo {valor, fuente} o de un número. */
  function v(dato) {
    if (dato && typeof dato === "object" && !Array.isArray(dato)) return nulo(dato.valor) ? null : dato.valor;
    return nulo(dato) ? null : dato;
  }
  function pct(a, b) {
    if (nulo(a) || nulo(b) || b === 0) return null;
    return (a / b) * 100;
  }
  function claveP(etq) {
    const m = /^([1-4])T-(\d{2})$/.exec(etq || "");
    return m ? [parseInt(m[2], 10), parseInt(m[1], 10)] : null;
  }
  const pad2 = (n) => String(n).padStart(2, "0");
  function periodoAnioPrevio(etq) {
    const k = claveP(etq);
    return k ? `${k[1]}T-${pad2(k[0] - 1)}` : null;
  }
  function periodoAnterior(etq) {
    const k = claveP(etq);
    if (!k) return null;
    const [anio, t] = k;
    return t > 1 ? `${t - 1}T-${pad2(anio)}` : `4T-${pad2(anio - 1)}`;
  }
  function semaforo(valor, bien, atencion) {
    if (nulo(valor)) return null;
    return valor >= bien ? "verde" : valor >= atencion ? "amarillo" : "rojo";
  }
  function semaforoMenorMejor(valor, bien, atencion) {
    if (nulo(valor)) return null;
    return valor <= bien ? "verde" : valor <= atencion ? "amarillo" : "rojo";
  }
  function r(x, d) {
    if (nulo(x)) return null;
    d = d === undefined ? 2 : d;
    const f = Math.pow(10, d);
    return Math.round((x + Math.sign(x) * 1e-12) * f) / f;
  }
  const fix = (x, d) => (nulo(x) ? "" : x.toFixed(d));
  const signo = (x, d) => (x >= 0 ? "+" : "") + x.toFixed(d);

  // ------------------------------------------------------------ verificar datos
  function verificarCuadres(datos, cfg) {
    const at = cfg.atipicos;
    const pruebas = [];
    const periodos = {};
    (datos.periodos || []).forEach((p) => (periodos[p.etiqueta] = p));
    const add = (prueba, ok, detalle) => pruebas.push({ prueba, ok: !!ok, detalle });
    const etqs = Object.keys(periodos);
    if (!etqs.length) {
      add("Hay periodos extraídos", false, "No se extrajo ningún periodo.");
      return pruebas;
    }
    const sinFormato = etqs.filter((e) => !claveP(e));
    add("Etiquetas de periodo con formato 1T-25", !sinFormato.length,
      !sinFormato.length ? "Todas correctas." : "Revisar: " + sinFormato.join(", "));

    const difs = [];
    etqs.forEach((e) => {
      const p = periodos[e];
      const rep = v(p.margen_operativo_reportado), ing = v(p.ingresos), uo = v(p.utilidad_operativa);
      if (rep !== null && ing && uo !== null) difs.push([e, Math.abs((uo / ing) * 100 - rep)]);
    });
    if (difs.length) {
      const peor = difs.reduce((a, b) => (b[1] > a[1] ? b : a));
      add("Margen operativo reportado = calculado", peor[1] <= 0.15,
        `Mayor diferencia: ${peor[1].toFixed(2)} puntos en ${peor[0]}.`);
    } else add("Margen operativo reportado = calculado", true, "Sin margen reportado para comparar (no es error).");

    const raros = [];
    etqs.forEach((e) => {
      const p = periodos[e];
      const ing = v(p.ingresos), uo = v(p.utilidad_operativa), un = v(p.utilidad_neta);
      if (ing !== null && ing <= 0) raros.push(`${e}: ingresos <= 0`);
      if (ing && uo !== null && uo > ing) raros.push(`${e}: utilidad operativa mayor que ingresos`);
      if (ing && un !== null && un > ing) raros.push(`${e}: utilidad neta mayor que ingresos`);
    });
    add("Magnitudes posibles (utilidades no superan ingresos)", !raros.length,
      !raros.length ? "Todas posibles." : raros.join("; "));

    const saltos = [];
    etqs.forEach((e) => {
      const ant = periodos[periodoAnterior(e)];
      const a = v(periodos[e].ingresos), b = ant ? v(ant.ingresos) : null;
      if (a && b && Math.abs(a / b - 1) * 100 > at.salto_ingresos_vs_periodo_anterior_pct)
        saltos.push(`${e} vs ${periodoAnterior(e)}`);
    });
    add("Sin saltos de ingresos que sugieran error de unidad", !saltos.length,
      !saltos.length ? "Sin saltos." : "Revisar unidades en: " + saltos.join(", "));

    const campos = ["ingresos", "utilidad_operativa", "utilidad_neta", "flujo_caja_libre"];
    const faltan = [];
    etqs.forEach((e) => campos.forEach((c) => { if (v(periodos[e][c]) === null) faltan.push(`${e}.${c}`); }));
    add("Campos clave completos", !faltan.length,
      !faltan.length ? "Completos." : `Faltan ${faltan.length}: ${faltan.slice(0, 8).join(", ")}${faltan.length > 8 ? "..." : ""}`);

    const sinFuente = [];
    etqs.forEach((e) => campos.forEach((c) => {
      const d = periodos[e][c];
      if (v(d) !== null && !(d && typeof d === "object" && d.fuente)) sinFuente.push(`${e}.${c}`);
    }));
    add("Cada cifra clave trae su fuente", !sinFuente.length,
      !sinFuente.length ? "Todas con fuente." : "Sin fuente: " + sinFuente.slice(0, 8).join(", "));
    return pruebas;
  }

  // ------------------------------------------------------------ análisis
  function regla(clave, um) {
    const mapa = { margen_operativo_vs_aa: "margen_operativo_delta_aa_pts", crecimiento_aa: "crecimiento_aa_pct",
      conversion_caja: "conversion_caja_pct", deuda_neta_sobre_uo_12m: "deuda_neta_sobre_uo_12m_x" };
    const t = um[mapa[clave]];
    return `Umbrales ${clave}: bien ${t.bien}, atención ${t.atencion}.`;
  }

  function sensibilidad(periodos, orden, cfg) {
    if (orden.length < 4) return { estado: ND, motivo: "Se necesitan 4 periodos consecutivos." };
    const ult4 = orden.slice(-4);
    const ing = ult4.map((e) => v(periodos[e].ingresos));
    const uo = ult4.map((e) => v(periodos[e].utilidad_operativa));
    if ([...ing, ...uo].some((x) => x === null))
      return { estado: ND, motivo: "Faltan ingresos o utilidad operativa en los últimos 4 periodos." };
    const I = ing.reduce((a, b) => a + b, 0), U = uo.reduce((a, b) => a + b, 0), m = U / I;
    return {
      base: { periodos: ult4, ingresos_12m: r(I, 1), utilidad_operativa_12m: r(U, 1), margen_pct: r(m * 100) },
      si_cambian_los_ingresos: cfg.sensibilidad_variaciones.map((d) => ({
        variacion_ingresos_pct: d * 100, utilidad_operativa_12m: r(I * (1 + d) * m, 1), cambio: r(I * d * m, 1) })),
      si_cambia_el_margen: cfg.sensibilidad_margen_pts.map((p) => ({
        variacion_margen_pts: p, utilidad_operativa_12m: r(I * (m + p / 100), 1), cambio: r((I * p) / 100, 1) })),
      un_punto_de_margen_vale: r(I * 0.01, 1),
      un_por_ciento_de_ingresos_vale: r(I * 0.01 * m, 1),
    };
  }

  function analizar(datos, cfg) {
    const um = cfg.umbrales, at = cfg.atipicos;
    const periodos = {};
    (datos.periodos || []).forEach((p) => { if (claveP(p.etiqueta)) periodos[p.etiqueta] = p; });
    const orden = Object.keys(periodos).sort((a, b) => {
      const x = claveP(a), y = claveP(b);
      return x[0] - y[0] || x[1] - y[1];
    });
    const resPer = {}, alertas = [], faltantes = [];

    function ltmUo(etq) {
      let et = etq, suma = 0;
      for (let i = 0; i < 4; i++) {
        if (!periodos[et]) return null;
        const x = v(periodos[et].utilidad_operativa);
        if (x === null) return null;
        suma += x;
        et = periodoAnterior(et);
      }
      return suma;
    }

    orden.forEach((e) => {
      const p = periodos[e];
      const ing = v(p.ingresos), cogs = v(p.costo_ingresos), uo = v(p.utilidad_operativa);
      const fcf = v(p.flujo_caja_libre), caja = v(p.caja_e_inversiones), deuda = v(p.deuda_total);
      const prevA = periodos[periodoAnioPrevio(e)], prevT = periodos[periodoAnterior(e)];

      const mo = pct(uo, ing);
      const mb = ing !== null && cogs !== null ? pct(ing - cogs, ing) : null;
      const ingPrevA = prevA ? v(prevA.ingresos) : null;
      const crec = prevA && ing !== null && ingPrevA ? pct(ing - ingPrevA, ingPrevA) : null;
      const moPrevA = prevA ? pct(v(prevA.utilidad_operativa), v(prevA.ingresos)) : null;
      const dMo = mo !== null && moPrevA !== null ? mo - moPrevA : null;
      const conv = pct(fcf, uo);
      const dn = deuda !== null && caja !== null ? deuda - caja : null;
      const uo12 = ltmUo(e);
      const dnX = dn !== null && uo12 ? dn / uo12 : null;

      const estado = {
        margen_operativo_vs_aa: semaforo(dMo, um.margen_operativo_delta_aa_pts.bien, um.margen_operativo_delta_aa_pts.atencion),
        crecimiento_aa: semaforo(crec, um.crecimiento_aa_pct.bien, um.crecimiento_aa_pct.atencion),
        conversion_caja: semaforo(conv, um.conversion_caja_pct.bien, um.conversion_caja_pct.atencion),
        deuda_neta_sobre_uo_12m: semaforoMenorMejor(dnX, um.deuda_neta_sobre_uo_12m_x.bien, um.deuda_neta_sobre_uo_12m_x.atencion),
      };

      const atip = [];
      if (conv !== null && conv > at.conversion_caja_maxima_pct)
        atip.push(`Conversión de caja de ${conv.toFixed(0)}% (mayor a ${at.conversion_caja_maxima_pct.toFixed(0)}%). Probable partida única; no comparar como periodo normal.`);
      if (prevT && mo !== null) {
        const moT = pct(v(prevT.utilidad_operativa), v(prevT.ingresos));
        if (moT !== null && Math.abs(mo - moT) > at.salto_margen_operativo_vs_periodo_anterior_pts)
          atip.push(`El margen operativo saltó ${signo(mo - moT, 1)} puntos frente a ${periodoAnterior(e)}.`);
      }
      if (p.notas) atip.push(`Nota del documento: ${p.notas}`);

      const est = {};
      Object.keys(estado).forEach((k) => (est[k] = estadoTxt(estado[k])));
      resPer[e] = {
        ingresos: ing, utilidad_operativa: uo, utilidad_neta: v(p.utilidad_neta),
        flujo_caja_libre: fcf, caja_e_inversiones: caja, deuda_total: deuda,
        margen_operativo_pct: r(mo), margen_bruto_pct: mb !== null ? r(mb) : ND,
        crecimiento_aa_pct: crec !== null ? r(crec) : ND,
        delta_margen_operativo_vs_aa_pts: dMo !== null ? r(dMo) : ND,
        conversion_caja_pct: conv !== null ? r(conv, 1) : ND,
        deuda_neta: dn !== null ? r(dn, 1) : ND,
        deuda_neta_sobre_uo_12m_x: dnX !== null ? r(dnX) : ND,
        estado: est, atipicos: atip,
      };
      Object.keys(estado).forEach((k) => {
        if (estado[k] === "amarillo" || estado[k] === "rojo")
          alertas.push({ periodo: e, indicador: k, estado: ESTADOS[estado[k]], regla: regla(k, um) });
      });
      atip.forEach((a) => alertas.push({ periodo: e, indicador: "atipico", estado: "Atención", regla: a }));
      ["costo_ingresos", "caja_e_inversiones", "deuda_total"].forEach((c) => {
        if (v(p[c]) === null) faltantes.push(`${e}.${c}`);
      });
    });

    const guias = {};
    (datos.guias || []).forEach((g) => {
      const e = g.periodo;
      const gi = v(g.ingresos), gu = v(g.utilidad_operativa);
      let gm = v(g.margen_operativo);
      if (gm === null && gi && gu !== null) gm = (gu / gi) * 100;
      const out = { ingresos_guia: gi, utilidad_operativa_guia: gu, margen_operativo_guia_pct: r(gm) };
      const real = resPer[e];
      if (real && gi && gu !== null && real.ingresos && real.utilidad_operativa !== null) {
        const ri = real.ingresos, ru = real.utilidad_operativa, mg = gu / gi;
        const vol = (ri - gi) * mg, mar = (ru / ri - mg) * ri;
        const vr = pct(ru - gu, gu);
        Object.assign(out, {
          variacion_ingresos_pct: r(pct(ri - gi, gi)),
          variacion_utilidad_operativa_pct: r(vr),
          variacion_margen_pts: r(real.margen_operativo_pct - gm),
          efecto_volumen: r(vol, 1), efecto_margen: r(mar, 1),
          diferencia_total: r(ru - gu, 1),
          cuadra: Math.abs(vol + mar - (ru - gu)) < 0.5,
          estado: estadoTxt(semaforo(vr, um.variacion_utilidad_operativa_vs_guia_pct.bien, um.variacion_utilidad_operativa_vs_guia_pct.atencion)),
        });
        if (out.estado === "Atención" || out.estado === "Crítico")
          alertas.push({ periodo: e, indicador: "resultado_vs_guia", estado: out.estado, regla: `Utilidad operativa ${signo(vr, 1)}% frente a la guía.` });
      } else out.estado = !real ? "pendiente (aún no hay resultado real)" : ND;
      guias[e] = out;
    });

    return {
      empresa: datos.empresa || {},
      ultimo_periodo: orden.length ? orden[orden.length - 1] : null,
      periodos: resPer, guias, alertas, faltantes,
      sensibilidad: sensibilidad(periodos, orden, cfg),
      nota_deuda_neta: "Deuda neta calculada como deuda total menos caja e inversiones; puede diferir de la cifra que reporte la empresa. La utilidad operativa sustituye al EBITDA.",
    };
  }

  // ------------------------------------------------------------ verificar informe
  function aFloat(t) {
    let x;
    if (t.includes(".") && t.includes(",")) x = t.replace(/\./g, "").replace(",", ".");
    else if (t.includes(",")) x = t.replace(",", ".");
    else if (t.includes(".")) x = /^\d{1,3}(\.\d{3})+$/.test(t) ? t.replace(/\./g, "") : t;
    else x = t;
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  }
  function numeros(obj, out) {
    if (typeof obj === "boolean" || nulo(obj)) return;
    if (typeof obj === "number") { if (Number.isFinite(obj)) out.push(obj); }
    else if (Array.isArray(obj)) obj.forEach((x) => numeros(x, out));
    else if (typeof obj === "object")
      Object.keys(obj).forEach((k) => { if (!["etiqueta", "periodo", "fuente"].includes(k)) numeros(obj[k], out); });
  }
  function verificarInforme(texto, datos, resultados) {
    const permitidos = [];
    numeros(datos, permitidos);
    numeros(resultados, permitidos);
    const base = new Set();
    permitidos.forEach((x) => [1, 1e-3, 1e-6].forEach((f) => base.add(Math.abs(x) * f)));
    const baseArr = Array.from(base);
    let limpio = texto.replace(/[1-4]T-\d{2}/g, " ");
    limpio = limpio.replace(/\b(?:19|20)\d{2}\b/g, " ");
    limpio = limpio.replace(/^[ \t]*(?:#+[ \t]*)?\d+[.)][ \t]/gm, " ");
    const omitir = [0, 1, 2, 3, 4, 5, 8, 12, 100];
    const sos = new Set();
    (limpio.match(/\d+(?:[.,]\d+)*/g) || []).forEach((t) => {
      const n = aFloat(t);
      if (n === null || omitir.includes(n)) return;
      if (!baseArr.some((b) => Math.abs(Math.abs(n) - b) <= Math.max(0.051, 0.006 * b))) sos.add(t);
    });
    return Array.from(sos).sort();
  }

  return { ND, v, pct, claveP, periodoAnterior, periodoAnioPrevio, semaforo, semaforoMenorMejor,
    verificarCuadres, analizar, sensibilidad, verificarInforme };
});
