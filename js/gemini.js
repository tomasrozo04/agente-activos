/* Cliente mínimo de la API REST de Gemini (nivel gratuito). Sin dependencias.
 * Funciona en el navegador y en Node 18+ (fetch global). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Gemini = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const BASE = "https://generativelanguage.googleapis.com/v1beta/models/";
  const dormir = (ms) => new Promise((res) => setTimeout(res, ms));

  /** Esquema de extracción (subconjunto OpenAPI que acepta Gemini). */
  const dato = { type: "OBJECT", nullable: true,
    properties: { valor: { type: "NUMBER", nullable: true }, fuente: { type: "STRING", nullable: true } } };
  const ESQUEMA_EXTRACCION = {
    type: "OBJECT",
    properties: {
      empresa: { type: "OBJECT", properties: {
        nombre: { type: "STRING" }, ticker: { type: "STRING", nullable: true },
        moneda: { type: "STRING" }, unidad: { type: "STRING" } }, required: ["nombre", "moneda", "unidad"] },
      periodos: { type: "ARRAY", items: { type: "OBJECT", properties: {
        etiqueta: { type: "STRING" }, ingresos: dato, costo_ingresos: dato, utilidad_operativa: dato,
        margen_operativo_reportado: dato, utilidad_neta: dato, flujo_caja_libre: dato,
        caja_e_inversiones: dato, deuda_total: dato, notas: { type: "STRING", nullable: true } },
        required: ["etiqueta"] } },
      guias: { type: "ARRAY", items: { type: "OBJECT", properties: {
        periodo: { type: "STRING" }, ingresos: dato, utilidad_operativa: dato, margen_operativo: dato },
        required: ["periodo"] } },
    },
    required: ["empresa", "periodos", "guias"],
  };

  /**
   * Llama a generateContent. Reintenta con espera si hay 429/503 y cae al modelo de respaldo.
   * opciones: { clave, modelo, respaldo, sistema, partes:[{text}|{inlineData}], json, esquema, temperatura, alEsperar }
   */
  async function generar(o) {
    if (!o.clave) throw new Error("Falta la clave de API de Gemini.");
    const modelos = [o.modelo, o.respaldo].filter((m, i, a) => m && a.indexOf(m) === i);
    const cuerpo = {
      contents: o.contents || [{ role: "user", parts: o.partes }],
      generationConfig: { temperature: o.temperatura === undefined ? 0.2 : o.temperatura },
    };
    if (o.sistema) cuerpo.systemInstruction = { parts: [{ text: o.sistema }] };
    if (o.json) {
      cuerpo.generationConfig.responseMimeType = "application/json";
      if (o.esquema) cuerpo.generationConfig.responseSchema = o.esquema;
    }
    let ultimo = null;
    for (const modelo of modelos) {
      for (let intento = 0; intento < 3; intento++) {
        let resp;
        try {
          resp = await fetch(BASE + encodeURIComponent(modelo) + ":generateContent", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": o.clave },
            body: JSON.stringify(cuerpo),
          });
        } catch (e) {
          throw new Error("No hubo conexión con la API de Gemini: " + e.message);
        }
        if (resp.ok) {
          const j = await resp.json();
          const cand = j.candidates && j.candidates[0];
          const texto = cand && cand.content && cand.content.parts
            ? cand.content.parts.map((p) => p.text || "").join("") : "";
          if (!texto) {
            const motivo = (j.promptFeedback && j.promptFeedback.blockReason) || (cand && cand.finishReason) || "sin texto";
            throw new Error("Gemini no devolvió texto (" + motivo + ").");
          }
          return { texto, modelo };
        }
        let msg = "";
        try { msg = (await resp.json()).error.message; } catch (_) { /* sin cuerpo */ }
        ultimo = new Error(`Gemini respondió ${resp.status} con el modelo ${modelo}: ${msg}`);
        if (resp.status === 400 && /API key/i.test(msg)) throw new Error("La clave de API no es válida. Revísala en AI Studio.");
        if (resp.status === 401 || resp.status === 403) throw new Error("La clave no tiene permiso o no es válida (" + resp.status + "). " + msg);
        if (resp.status === 404) break; // modelo inexistente: probar el respaldo
        if (resp.status === 429 || resp.status === 503) {
          const espera = (intento + 1) * 8000;
          if (o.alEsperar) o.alEsperar(`Límite del nivel gratuito o saturación (${resp.status}). Espero ${espera / 1000} s…`);
          await dormir(espera);
          continue;
        }
        throw ultimo;
      }
    }
    throw ultimo || new Error("No se pudo llamar a Gemini.");
  }

  /** Extrae el JSON de la respuesta aunque venga con ```json … ```. */
  function parsearJSON(texto) {
    const limpio = texto.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    try { return JSON.parse(limpio); }
    catch (e) {
      const i = limpio.indexOf("{"), f = limpio.lastIndexOf("}");
      if (i >= 0 && f > i) return JSON.parse(limpio.slice(i, f + 1));
      throw new Error("La respuesta no es un JSON válido.");
    }
  }

  async function extraer(o) {
    // o.documentos: [{nombre, mime, base64} | {nombre, texto}]
    const partes = [{ text: o.instrucciones + "\n\nEmpresa: " + (o.empresa || "(la que muestren los documentos)") }];
    o.documentos.forEach((d) => {
      partes.push({ text: `--- DOCUMENTO: ${d.nombre} ---` });
      partes.push(d.base64 ? { inlineData: { mimeType: d.mime || "application/pdf", data: d.base64 } } : { text: d.texto });
    });
    const { texto, modelo } = await generar({ ...o, partes, json: true, esquema: ESQUEMA_EXTRACCION, temperatura: 0 });
    return { datos: parsearJSON(texto), modelo };
  }

  async function redactar(o) {
    const carga = JSON.stringify({ datos: o.datos, calculos: o.calculos }, null, 1);
    let tarea = o.tarea;
    if (o.tesis) tarea += "\n\nTESIS DE LA PERSONA:\n" + o.tesis;
    const partes = [{ text: tarea + "\n\nDATOS Y CÁLCULOS (única fuente de cifras):\n" + carga }];
    const { texto, modelo } = await generar({ ...o, partes, json: false, temperatura: 0.3 });
    return { texto, modelo };
  }

  async function criticar(o) {
    const partes = [{ text: "Eres un revisor escéptico. Compara el INFORME con el JSON. Lista (viñetas cortas): cifras que no estén en el JSON, causas presentadas como hechos, y cualquier recomendación de compra, venta o mantener. Si no hay problemas, dilo en una línea.\n\nINFORME:\n" + o.informe + "\n\nJSON:\n" + JSON.stringify({ datos: o.datos, calculos: o.calculos }) }];
    return generar({ ...o, partes, json: false, temperatura: 0 });
  }

  /** Conversación: o.contents = [{role:"user"|"model", parts:[{text}]}, ...] */
  async function conversar(o) {
    return generar({ ...o, json: false, temperatura: 0.4 });
  }

  return { generar, conversar, extraer, redactar, criticar, parsearJSON, ESQUEMA_EXTRACCION };
});
