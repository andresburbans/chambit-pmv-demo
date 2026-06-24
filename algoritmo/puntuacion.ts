/**
 * puntuacion.ts — Función de puntuación multiseñal (corazón de HIVE 1).
 *
 * EXCERPTO ILUSTRATIVO del módulo `geo-core` (no compila por sí solo: depende de
 * los módulos hermanos `friccion-espacial`, `reputacion-dirichlet` y de la
 * métrica hexagonal nativa). Sobre los candidatos que pasan la compuerta de
 * factibilidad (cobertura + foco temático), HIVE 1 evalúa una combinación lineal
 * ponderada con tratamiento explícito de la incertidumbre por término
 * (Malczewski & Rinner, 2015):
 *
 *   S(p|q) = w1·f_esp + w2·f_rep − w3·f_disp + w4·f_lex + w5·f_tem
 *            + w6·f_act + w7·f_fre + w8·f_eco + w9·f_cal      ── ecuación (16)
 *
 * La urgencia NO es un término aditivo, sino un SELECTOR del perfil de pesos: el
 * contexto no cambia los hechos del candidato, sino la importancia relativa de
 * los hechos (una necesidad urgente eleva el peso de la distancia y la relaja en
 * reputación y precio). Cada posición del orden es así descomponible señal por
 * señal: interpretabilidad por construcción.
 */

import { logLogistic, alphaEff, expDecay } from "./friccion-espacial";
import { expectedRating, ratingVariance, consistency, totalCounts, type Alpha5, type Counts5 } from "./reputacion-dirichlet";

/** Perfil de pesos del flujo Buscar (señales con dato real hoy; suman ≈ 1). */
const WEIGHTS_BUSCAR = {
    distance: 0.30, expectedRating: 0.25, varPenalty: 0.07, text: 0.14,
    categoryMatch: 0.11, recency: 0.06, price: 0.07,
} as const;

/**
 * Perfil de urgencia (pase Solicitar): el MISMO conjunto de hechos, reponderado.
 * La distancia sube de 0.28 → 0.35 a costa de la reputación y el precio.
 */
const WEIGHTS_URGENTE = {
    distance: 0.35, expectedRating: 0.20, varPenalty: 0.05, text: 0.09,
    categoryMatch: 0.07, recency: 0.03, price: 0.14,
} as const;

const ACTIVITY_HALFLIFE_H = 48;
const RECENCY_HALFLIFE_H = 90 * 24;

export interface ScoreResult {
    score: number;
    distanceKm: number;
    expectedRating: number;       // E[R]
    variance: number;             // Var[R]
    /** Aporte ponderado de cada señal (para auditar el orden). */
    components: Record<string, number>;
    /** Vector de características x_p ∈ ℝ¹⁴ — telemetría para el futuro LTR (ec. 19). */
    featureVector: number[];
}

/**
 * Puntúa un candidato `c` ya factible para la consulta `q`. (Las compuertas de
 * cobertura y foco temático, la relevancia léxica BM25 y el ajuste de precio de
 * tres niveles viven en el repositorio privado; aquí se asumen resueltos para
 * exhibir la combinación lineal y el vector de características.)
 */
export function scoreCandidate(c: CandidateFeatures, q: QuerySignals, alpha: Alpha5): ScoreResult {
    const w = q.urgent ? WEIGHTS_URGENTE : WEIGHTS_BUSCAR;

    // ── Fricción espacial: kernel aprendido modulado por densidad local ──────
    const aKm = alphaEff(q.kernelAlphaKm, q.localSupply);
    const f_dist = logLogistic(c.distanceKm, aKm, q.kernelBeta);

    // ── Reputación bayesiana (posterior Dirichlet–multinomial) ───────────────
    const eR = expectedRating(c.ratingCounts, alpha);
    const vR = ratingVariance(c.ratingCounts, alpha);
    const cons = consistency(vR);
    const f_eR = eR / 5;                 // reputación esperada normalizada
    const f_pen = Math.min(vR / 2, 1);   // penalización por dispersión / riesgo

    // ── Señales alfanuméricas (afinan entre candidatos espacialmente pares) ──
    const f_text = c.textScore;                                   // relevancia léxica
    const f_cat = c.subMatch ? 1.0 : c.catMatch ? 0.6 + 0.4 * f_text : Math.max(0.4, f_text);
    const f_rec = c.createdMs ? expDecay((Date.now() - c.createdMs) / 3.6e6, RECENCY_HALFLIFE_H) : 0.5;
    const f_price = c.priceFit;                                   // compatibilidad económica

    // ── Combinación lineal interpretable (ecuación 16) ───────────────────────
    const score =
        w.distance * f_dist +
        w.expectedRating * f_eR -
        w.varPenalty * f_pen +
        w.text * f_text +
        w.categoryMatch * f_cat +
        w.recency * f_rec +
        w.price * f_price;

    return {
        score,
        distanceKm: c.distanceKm,
        expectedRating: eR,
        variance: vR,
        components: { f_dist, f_eR, f_pen, f_text, f_cat, f_rec, f_price },
        // x_p ∈ ℝ¹⁴: señales normalizadas + variables crudas de soporte. Se
        // materializa por candidato aunque el puntaje lineal no use todas: una
        // función aprendida (LambdaMART) podrá explotar sus no linealidades.
        featureVector: [f_dist, c.distanceKm, f_eR, vR, cons, f_text, f_cat, /*f_act*/ 0.5, f_rec, f_price, c.unitMismatch, c.covSlack, c.supplyNorm, /*f_cal*/ 0],
    };
}

/* ── Tipos de soporte (recortados del contrato real del núcleo) ─────────────── */

export interface QuerySignals {
    urgent: boolean;
    kernelAlphaKm: number;
    kernelBeta: number;
    localSupply?: number;
}

export interface CandidateFeatures {
    distanceKm: number;          // distancia hexagonal H3 (centroide a centroide)
    ratingCounts: Counts5;       // histograma de reseñas (1..5 estrellas)
    textScore: number;           // relevancia léxica consulta ↔ candidato ∈ [0,1]
    subMatch: boolean;           // coincidencia exacta de subcategoría (chip)
    catMatch: boolean;           // coincidencia de categoría
    createdMs?: number;          // antigüedad del listing (recencia)
    priceFit: number;            // compatibilidad de precio sobre banda de 3 niveles
    unitMismatch: number;        // 1 si el experto no publica el método pedido
    covSlack: number;            // holgura dentro de la cobertura declarada
    supplyNorm: number;          // densidad local de oferta normalizada
}
