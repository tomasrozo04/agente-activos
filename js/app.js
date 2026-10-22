/* Interfaz del agente. Orquesta: EXTRAER (Gemini) → CALCULAR (código) → REDACTAR (Gemini) → VERIFICAR (código). */
(function () {
  "use strict";
  const C = window.Calculos, G = window.Gemini;
  const $ = (id) => document.getElementById(id);
  const SUGERENCIAS = ["¿Qué haces y cómo trabajas?", "¿Cómo va el último periodo frente a la guía?", "¿Qué cambió frente al año pasado?", "¿Qué debo verificar antes de usar estos datos?"];
  const ARCHIVOS_CONTEXTO = ["00-rol-y-limites.md", "01-metodo.md", "02-indicadores-y-umbrales.md", "03-fuentes-oficiales.md", "04-formatos-de-entrega.md"];
  const est = { cfg: null, casos: [], caso: null, sistema: "", extraccion: "", datos: null, calculos: null, informe: "", docs: [], conversacion: "", hist: [] };

  // ---------------------------------------------------------- utilidades
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const nf = (x, d) => (typeof x === "number" ? x.toLocaleString("es-CO", { minimumFractionDigits: d || 0, maximumFractionDigits: d === undefined ? 1 : d }) : x === undefined || x === null ? "–" : esc(x));
  const chip = (e) => `<span class="chip ${e === C.ND || !e ? "nd" : e.startsWith("pend") ? "nd" : e}">${{ Bien: "✓", "Atención": "▲", "Crítico": "✕" }[e] || "–"} ${esc(e || C.ND)}</span>`;
  function estado(msg, tipo) { const e = $("estado"); e.textContent = msg; e.className = "estado" + (tipo ? " " + tipo : ""); }
  const guardar = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (_) {} };
  const leer = (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } };
  const traer = async (ruta) => { const r = await fetch(ruta, { cache: "no-cache" }); if (!r.ok) throw new Error(ruta + " (" + r.status + ")"); return r; };

  // ---------------------------------------------------------- markdown mínimo
  function md(texto) {
    const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<em>$2</em>").replace(/`([^`]+)`/g, "<code>$1</code>");
    const L = texto.replace(/\r/g, "").split("\n"); let h = "", i = 0, lista = null;
    const cerrar = () => { if (lista) { h += `</${lista}>`; lista = null; } };
    const celdas = (l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
    while (i < L.length) {
      const l = L[i];
      if (/^\s*\|/.test(l) && i + 1 < L.length && /^\s*\|?\s*:?-{2,}/.test(L[i + 1])) {
        cerrar(); const cab = celdas(l); i += 2; let t = "<div class='tabla-wrap'><table><thead><tr>" + cab.map((c) => `<th>${inline(c)}</th>`).join("") + "</tr></thead><tbody>";
        while (i < L.length && /^\s*\|/.test(L[i])) { t += "<tr>" + celdas(L[i]).map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>"; i++; }
        h += t + "</tbody></table></div>"; continue;
      }
      let m;
      if ((m = /^(#{1,4})\s+(.*)$/.exec(l))) { cerrar(); const n = Math.min(m[1].length + 1, 4); h += `<h${n}>${inline(m[2])}</h${n}>`; }
      else if ((m = /^\s*[-*]\s+(.*)$/.exec(l))) { if (lista !== "ul") { cerrar(); h += "<ul>"; lista = "ul"; } h += `<li>${inline(m[1])}</li>`; }
      else if ((m = /^\s*\d+[.)]\s+(.*)$/.exec(l))) { if (lista !== "ol") { cerrar(); h += "<ol>"; lista = "ol"; } h += `<li>${inline(m[1])}</li>`; }
      else if (!l.trim()) cerrar();
      else { cerrar(); h += `<p>${inline(l)}</p>`; }
      i++;
    }
    cerrar(); return h;
  }

  // ---------------------------------------------------------- gráficos SVG simples
  function lineaSVG(etqs, vals, sufijo) {
    const W = 460, H = 190, pl = 40, pr = 14, pt = 14, pb = 28, ok = vals.filter((x) => typeof x === "number");
    if (ok.length < 2) return "<p class='nota'>Faltan datos para este gráfico.</p>";
    let mn = Math.min(...ok), mx = Math.max(...ok); const pad = (mx - mn) * 0.2 || 1; mn -= pad; mx += pad;
    const X = (i) => pl + (i * (W - pl - pr)) / (etqs.length - 1), Y = (x) => pt + (1 - (x - mn) / (mx - mn)) * (H - pt - pb);
    let d = "", pts = "";
    vals.forEach((x, i) => { if (typeof x !== "number") return; d += (d ? "L" : "M") + X(i).toFixed(1) + " " + Y(x).toFixed(1); pts += `<circle cx="${X(i).toFixed(1)}" cy="${Y(x).toFixed(1)}" r="3.5" fill="#3d756e"><title>${etqs[i]}: ${nf(x, 1)}${sufijo}</title></circle>`; });
    const ticks = [mn + pad, (mn + mx) / 2, mx - pad].map((t) => `<text x="${pl - 6}" y="${Y(t) + 4}" text-anchor="end" fill="#6b7770" font-size="11">${nf(t, 1)}</text><line x1="${pl}" x2="${W - pr}" y1="${Y(t)}" y2="${Y(t)}" stroke="#e3dccf" stroke-dasharray="3 4"/>`).join("");
    const lab = etqs.map((e, i) => `<text x="${X(i)}" y="${H - 8}" text-anchor="middle" fill="#6b7770" font-size="10.5">${e}</text>`).join("");
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Línea de ${etqs[0]} a ${etqs[etqs.length - 1]}">${ticks}<path d="${d}" fill="none" stroke="#3d756e" stroke-width="2.5"/>${pts}${lab}</svg>`;
  }
  function barrasSVG(etqs, vals) {
    const W = 460, H = 190, pl = 40, pr = 10, pt = 14, pb = 28, ok = vals.filter((x) => typeof x === "number");
    if (!ok.length) return "<p class='nota'>Faltan datos para este gráfico.</p>";
    const mx = Math.max(...ok) * 1.08, bw = (W - pl - pr) / etqs.length;
    let s = [0, mx / 2, mx].map((t) => { const y = pt + (1 - t / mx) * (H - pt - pb); return `<line x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}" stroke="#e3dccf" stroke-dasharray="3 4"/><text x="${pl - 6}" y="${y + 4}" text-anchor="end" fill="#6b7770" font-size="11">${nf(t, 0)}</text>`; }).join("");
    vals.forEach((x, i) => { if (typeof x !== "number") return; const h = (x / mx) * (H - pt - pb), xx = pl + i * bw + bw * 0.18; s += `<rect x="${xx.toFixed(1)}" y="${(H - pb - h).toFixed(1)}" width="${(bw * 0.64).toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="#7a9cc0"><title>${etqs[i]}: ${nf(x, 1)}</title></rect><text x="${(xx + bw * 0.32).toFixed(1)}" y="${H - 8}" text-anchor="middle" fill="#6b7770" font-size="10.5">${etqs[i]}</text>`; });
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Barras de ingresos por periodo">${s}</svg>`;
  }

  // ---------------------------------------------------------- carga inicial
  async function iniciar() {
    if (location.protocol === "file:") $("aviso-file").hidden = false;
    $("clave").value = leer("gemini_clave") || ""; $("recordar").checked = !!leer("gemini_clave");
    $("modelo").value = leer("gemini_modelo") || $("modelo").value; $("respaldo").value = leer("gemini_respaldo") || $("respaldo").value;
    try {
      est.cfg = await (await traer("config/umbrales.json")).json();
      est.casos = await (await traer("config/casos.json")).json();
      const partes = await Promise.all(ARCHIVOS_CONTEXTO.map(async (a) => await (await traer("contexto/" + a)).text()));
      est.sistema = partes.join("\n\n---\n\n");
      est.conversacion = await (await traer("contexto/05-conversacion.md")).text();
      est.extraccion = await (await traer("contexto/extraccion.md")).text();
      $("ctx").textContent = est.sistema;
    } catch (e) { estado("No pude cargar la configuración: " + e.message, "err"); }
    dibujarCasos(); dibujarSugerencias(); eventos();
  }

  function dibujarCasos() {
    const cont = $("casos"); cont.innerHTML = "";
    est.casos.forEach((c, i) => {
      const b = document.createElement("button");
      b.className = "caso"; b.setAttribute("role", "radio"); b.setAttribute("aria-checked", i === 0 ? "true" : "false");
      b.innerHTML = `<b>${esc(c.nombre)}</b><span>${esc(c.resumen)}</span><br><small>${i === 0 ? "caso principal" : "caso conectado"}</small>`;
      b.onclick = () => elegirCaso(i); cont.appendChild(b);
    });
    elegirCaso(0);
  }
  function elegirCaso(i) {
    est.caso = est.casos[i]; if (!est.caso) return;
    [...$("casos").children].forEach((b, j) => b.setAttribute("aria-checked", j === i ? "true" : "false"));
    $("caja-tesis").hidden = !est.caso.necesitaTesis;
  }

  // ---------------------------------------------------------- eventos
  function eventos() {
    document.querySelectorAll(".tab").forEach((t) => (t.onclick = () => {
      document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("on", x === t));
      ["docs", "json", "ej"].forEach((k) => ($("p-" + k).hidden = k !== t.dataset.tab));
    }));
    ["clave", "modelo", "respaldo", "recordar"].forEach((id) => ($(id).onchange = guardarConfig));
    $("archivos").onchange = leerArchivos;
    $("btn-extraer").onclick = extraer;
    $("btn-ejemplo").onclick = async () => { try { mostrarDatos(await (await traer("datos/ejemplo_netflix.json")).json()); } catch (e) { estado(e.message, "err"); } };
    $("btn-pegar").onclick = () => { try { mostrarDatos(JSON.parse($("json-pegado").value)); } catch (e) { estado("El JSON no es válido: " + e.message, "err"); } };
    $("btn-calcular").onclick = calcular;
    $("btn-enviar").onclick = () => enviarChat($("chat-input").value);
    $("chat-input").onkeydown = (ev) => { if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); enviarChat($("chat-input").value); } };
    $("btn-redactar").onclick = redactar;
    $("btn-copiar").onclick = () => { navigator.clipboard && navigator.clipboard.writeText(est.informe).then(() => estado("Texto copiado.", "ok")); };
    $("btn-bajar").onclick = () => {
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([est.informe], { type: "text/markdown" }));
      a.download = `informe_${(est.datos && est.datos.empresa && est.datos.empresa.ticker) || "activo"}_${new Date().toISOString().slice(0, 10)}.md`; a.click();
    };
  }
  function guardarConfig() {
    guardar("gemini_modelo", $("modelo").value.trim()); guardar("gemini_respaldo", $("respaldo").value.trim());
    guardar("gemini_clave", $("recordar").checked && $("clave").value.trim() ? $("clave").value.trim() : null);
  }
  const opcionesIA = () => ({ clave: $("clave").value.trim(), modelo: $("modelo").value.trim(), respaldo: $("respaldo").value.trim(), sistema: est.sistema, alEsperar: (m) => estado(m) });

  // ---------------------------------------------------------- 3. datos
  const aBase64 = (f) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(f); });
  async function leerArchivos(ev) {
    est.docs = []; const fs = [...ev.target.files]; let total = 0;
    for (const f of fs) {
      total += f.size;
      if (/\.pdf$/i.test(f.name)) est.docs.push({ nombre: f.name, mime: "application/pdf", base64: await aBase64(f) });
      else est.docs.push({ nombre: f.name, texto: await f.text() });
    }
    $("lista-archivos").textContent = fs.length ? `${fs.length} archivo(s): ${fs.map((f) => f.name).join(", ")} · ${(total / 1048576).toFixed(1)} MB` : "Ningún archivo todavía.";
    if (total > 15 * 1048576) estado("Los archivos suman más de 15 MB: puede fallar. Sube solo las páginas con las tablas.", "err");
  }
  async function extraer() {
    if (!est.docs.length) return estado("Sube al menos un reporte.", "err");
    const o = opcionesIA(); if (!o.clave) return estado("Pega tu clave de API en el paso 1.", "err");
    $("btn-extraer").disabled = true; estado("Extrayendo cifras… (puede tardar un minuto)");
    try {
      const r = await G.extraer({ ...o, sistema: est.extraccion, instrucciones: "Extrae las cifras de estos documentos.", empresa: $("empresa").value.trim(), documentos: est.docs });
      mostrarDatos(r.datos); estado(`Listo (modelo ${r.modelo}). Revisa las cifras antes de seguir.`, "ok");
    } catch (e) { estado(e.message, "err"); } finally { $("btn-extraer").disabled = false; }
  }

  // ---------------------------------------------------------- 4. revisión
  function refrescarCuadres(d) {
    $("cuadres").innerHTML = C.verificarCuadres(d, est.cfg).map((p) => `<div>${chip(p.ok ? "Bien" : "Atención")}<span><b>${esc(p.prueba)}</b> · ${esc(p.detalle)}</span></div>`).join("");
  }
  function mostrarDatos(d) {
    est.datos = d; $("json").value = JSON.stringify(d, null, 2); $("s-rev").hidden = false; $("s-res").hidden = true; $("s-inf").hidden = true;
    refrescarCuadres(d);
    estado("Datos cargados. Revisa los cuadres y calcula.", "ok"); $("s-rev").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---------------------------------------------------------- 5. cálculo
  function calcular() {
    try { est.datos = JSON.parse($("json").value); } catch (e) { return estado("El JSON editado no es válido: " + e.message, "err"); }
    refrescarCuadres(est.datos); // con las correcciones del usuario
    est.calculos = C.analizar(est.datos, est.cfg);
    const c = est.calculos, u = c.periodos[c.ultimo_periodo];
    if (!u) return estado("No hay periodos con etiqueta válida (ejemplo 2T-26).", "err");
    $("s-res").hidden = false; $("s-inf").hidden = true;
    const g = c.guias[c.ultimo_periodo], emp = c.empresa || {};
    $("titulo-res").textContent = `${emp.nombre || "Activo"} · ${c.ultimo_periodo}: margen operativo ${nf(u.margen_operativo_pct, 1)}%` +
      (typeof u.crecimiento_aa_pct === "number" ? `, ingresos ${u.crecimiento_aa_pct >= 0 ? "+" : ""}${nf(u.crecimiento_aa_pct, 1)}% a/a` : "") +
      (g && typeof g.variacion_utilidad_operativa_pct === "number" ? `, utilidad operativa ${g.variacion_utilidad_operativa_pct >= 0 ? "+" : ""}${nf(g.variacion_utilidad_operativa_pct, 1)}% vs guía` : "") + ".";
    const tile = (k, val, st) => `<div class="tile"><div class="k">${k}</div><div class="v">${val}</div>${chip(st)}</div>`;
    $("tiles").innerHTML =
      tile("Margen operativo", nf(u.margen_operativo_pct, 1) + "%", u.estado.margen_operativo_vs_aa) +
      tile("Crecimiento a/a", typeof u.crecimiento_aa_pct === "number" ? nf(u.crecimiento_aa_pct, 1) + "%" : "n/d", u.estado.crecimiento_aa) +
      tile("Conversión de caja", typeof u.conversion_caja_pct === "number" ? nf(u.conversion_caja_pct, 1) + "%" : "n/d", u.estado.conversion_caja) +
      tile("Deuda neta / UO 12M", typeof u.deuda_neta_sobre_uo_12m_x === "number" ? nf(u.deuda_neta_sobre_uo_12m_x, 2) + "×" : "n/d", u.estado.deuda_neta_sobre_uo_12m) +
      (g && g.estado && !g.estado.startsWith("pend") ? tile("UO vs guía", typeof g.variacion_utilidad_operativa_pct === "number" ? nf(g.variacion_utilidad_operativa_pct, 1) + "%" : "n/d", g.estado) : "");
    const etqs = Object.keys(c.periodos);
    $("ch-margen").innerHTML = lineaSVG(etqs, etqs.map((e) => c.periodos[e].margen_operativo_pct), "%");
    $("ch-ing").innerHTML = barrasSVG(etqs, etqs.map((e) => c.periodos[e].ingresos));
    $("alertas").innerHTML = c.alertas.length ? c.alertas.map((a) => `<li>${chip(a.estado)}<span><b>${esc(a.periodo)}</b> · ${esc(a.indicador)}: ${esc(a.regla)}</span></li>`).join("") : "<li>Sin alertas.</li>";
    const gk = Object.keys(c.guias);
    $("guias").innerHTML = gk.length ? `<table><thead><tr><th>Periodo</th><th>UO guía</th><th>UO real</th><th>Var. %</th><th>Efecto volumen</th><th>Efecto margen</th><th>Estado</th></tr></thead><tbody>` +
      gk.map((k) => { const x = c.guias[k], real = c.periodos[k]; return `<tr><td>${k}</td><td>${nf(x.utilidad_operativa_guia, 1)}</td><td>${real ? nf(real.utilidad_operativa, 1) : "–"}</td><td>${nf(x.variacion_utilidad_operativa_pct, 1)}</td><td>${nf(x.efecto_volumen, 1)}</td><td>${nf(x.efecto_margen, 1)}</td><td>${chip(x.estado)}</td></tr>`; }).join("") + "</tbody></table>" : "<p class='nota'>Sin guías cargadas.</p>";
    const s = c.sensibilidad;
    $("sens").innerHTML = s.base ? `<p class="nota">Base 12M (${s.base.periodos[0]} a ${s.base.periodos[3]}): ingresos ${nf(s.base.ingresos_12m, 0)}, UO ${nf(s.base.utilidad_operativa_12m, 0)}, margen ${nf(s.base.margen_pct, 1)}%. Un punto de margen vale ${nf(s.un_punto_de_margen_vale, 0)}; 1% de ingresos vale ${nf(s.un_por_ciento_de_ingresos_vale, 0)}.</p>` +
      `<table><thead><tr><th>Si cambian los ingresos</th><th>UO 12M</th><th>Cambio</th><th>Si cambia el margen (pts)</th><th>UO 12M</th><th>Cambio</th></tr></thead><tbody>` +
      s.si_cambian_los_ingresos.map((a, i) => { const b = s.si_cambia_el_margen[i]; return `<tr><td>${a.variacion_ingresos_pct > 0 ? "+" : ""}${nf(a.variacion_ingresos_pct, 0)}%</td><td>${nf(a.utilidad_operativa_12m, 0)}</td><td>${nf(a.cambio, 0)}</td><td>${b ? (b.variacion_margen_pts > 0 ? "+" : "") + b.variacion_margen_pts : ""}</td><td>${b ? nf(b.utilidad_operativa_12m, 0) : ""}</td><td>${b ? nf(b.cambio, 0) : ""}</td></tr>`; }).join("") + "</tbody></table>" : `<p class="nota">${esc(s.motivo)}</p>`;
    const cols = [["ingresos", "Ingresos"], ["utilidad_operativa", "UO"], ["margen_operativo_pct", "Margen op. %"], ["margen_bruto_pct", "Margen bruto %"], ["crecimiento_aa_pct", "Crec. a/a %"], ["conversion_caja_pct", "Conv. caja %"], ["deuda_neta", "Deuda neta"]];
    $("tabla").innerHTML = "<table><thead><tr><th>Periodo</th>" + cols.map((x) => `<th>${x[1]}</th>`).join("") + "</tr></thead><tbody>" + etqs.map((e) => `<tr><td>${e}</td>` + cols.map((x) => `<td>${nf(c.periodos[e][x[0]], 1)}</td>`).join("") + "</tr>").join("") + "</tbody></table>";
    estado("Indicadores calculados por código (sin IA).", "ok"); $("s-res").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---------------------------------------------------------- 6. informe
  async function redactar() {
    if (!est.calculos) return;
    const o = opcionesIA(); if (!o.clave) return estado("Pega tu clave de API en el paso 1.", "err");
    if (est.caso.necesitaTesis && !$("tesis").value.trim()) return estado("Escribe tu tesis para este caso de uso.", "err");
    $("btn-redactar").disabled = true; estado("Redactando el informe…");
    try {
      const r = await G.redactar({ ...o, tarea: est.caso.tarea, tesis: est.caso.necesitaTesis ? $("tesis").value.trim() : "", datos: est.datos, calculos: est.calculos });
      est.informe = r.texto;
      const sos = C.verificarInforme(r.texto, est.datos, est.calculos);
      $("s-inf").hidden = false;
      $("verif").className = "callout " + (sos.length ? "warn" : "good");
      $("verif").innerHTML = sos.length ? `<b>Verifica estas cifras:</b> no las encontré en los datos ni en los cálculos (${sos.map((x) => `<mark>${esc(x)}</mark>`).join(", ")}). Pueden ser correctas, pero compáralas con el documento antes de usarlas.`
        : "<b>Verificación automática:</b> todas las cifras del informe existen en los datos o cálculos. Aun así, compara 3 cifras con el documento original.";
      $("informe").innerHTML = md(r.texto);
      $("crit").hidden = true;
      if ($("critica").checked) {
        estado("Informe listo. Pidiendo crítica…");
        try { const k = await G.criticar({ ...o, sistema: "", informe: r.texto, datos: est.datos, calculos: est.calculos }); $("crit").hidden = false; $("crit").innerHTML = "<b>Crítica de un segundo paso</b>" + md(k.texto); }
        catch (e) { $("crit").hidden = false; $("crit").textContent = "No se pudo obtener la crítica: " + e.message; }
      }
      estado(`Informe listo (modelo ${r.modelo}).`, "ok"); $("s-inf").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) { estado(e.message, "err"); } finally { $("btn-redactar").disabled = false; }
  }

  // ---------------------------------------------------------- chat
  function dibujarSugerencias() {
    $("sugerencias").innerHTML = "";
    SUGERENCIAS.forEach((t) => { const b = document.createElement("button"); b.className = "sug"; b.textContent = t; b.onclick = () => enviarChat(t); $("sugerencias").appendChild(b); });
  }
  function burbuja(rol, html) {
    const d = document.createElement("div"); d.className = "msg " + rol; d.innerHTML = html;
    $("chat-log").appendChild(d); d.scrollIntoView({ block: "nearest", behavior: "smooth" }); return d;
  }
  async function enviarChat(texto) {
    texto = (texto || "").trim(); if (!texto) return;
    const o = opcionesIA();
    burbuja("yo", esc(texto)); $("chat-input").value = "";
    if (!o.clave) return burbuja("agente", "Para conversar necesito tu clave de API. Pégala en el paso 1 y vuelve a escribirme.");
    const ctx = est.datos ? "DATOS Y CÁLCULOS ACTUALES:\n" + JSON.stringify({ datos: est.datos, calculos: est.calculos || C.analizar(est.datos, est.cfg) }) : "DATOS Y CÁLCULOS ACTUALES: ninguno todavía (la persona aún no ha cargado un activo).";
    est.hist.push({ role: "user", parts: [{ text: texto }] });
    const espera = burbuja("agente espera", "Pensando…"); $("btn-enviar").disabled = true;
    try {
      const r = await G.conversar({ ...o, sistema: est.sistema + "\n\n---\n\n" + est.conversacion + "\n\n---\n\n" + ctx, contents: est.hist.slice(-14) });
      est.hist.push({ role: "model", parts: [{ text: r.texto }] });
      let extra = "";
      if (est.datos) {
        const sos = C.verificarInforme(r.texto, est.datos, est.calculos || C.analizar(est.datos, est.cfg));
        if (sos.length) extra = `<p class="nota">Revisa estas cifras, no las encontré en tus datos: ${sos.map((x) => `<mark>${esc(x)}</mark>`).join(", ")}.</p>`;
      }
      espera.className = "msg agente"; espera.innerHTML = md(r.texto) + extra; estado("");
    } catch (e) {
      est.hist.pop(); espera.className = "msg agente err"; espera.textContent = e.message;
    } finally { $("btn-enviar").disabled = false; }
  }

  iniciar();
})();
