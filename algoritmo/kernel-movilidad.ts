/**
 * kernel-movilidad.ts — Escala espacial APRENDIDA del comportamiento (HIVE 1).
 *
 * EXCERPTO del módulo `geo-core` de la tesis de Ingeniería Topográfica.
 * La escala de la fricción espacial deja de ser un supuesto y se ESTIMA del
 * comportamiento real de los actores. Cada emparejamiento registrado a una
 * distancia d (aceptado o no) es una observación, y bajo la forma log-logística
 * estimar (α, β) equivale a una regresión logística sobre el logaritmo de la
 * distancia (Yang et al., 2020):
 *
 *   logit P(y = 1 | d) = β·ln α − β·ln d            ── ecuación (18) de la tesis
 *
 * es decir  logit P = b0 + b1·x  con  x = ln d,  b1 = −β,  b0 = β·ln α.
 * Se ajusta por máxima verosimilitud (Newton–Raphson / IRLS 2×2, sin librerías),
 * con contracción jerárquica hacia el global cuando la muestra es escasa. Con
 * cero datos degrada EXACTAMENTE al comportamiento de diseño (α = 2.5 km, β = 2)
 * y mejora de forma monótona con la evidencia. Módulo PURO y determinista.
 */

/** Parámetros del decaimiento espacial de una categoría (u oficio global). */
export interface MobilityKernel {
    alphaKm: number;
    beta: number;
    /** Observaciones que respaldan el ajuste (0 = valor de diseño). */
    n: number;
}

/** Kernel de respaldo: el comportamiento clásico del modelo. */
export const DEFAULT_KERNEL: MobilityKernel = { alphaKm: 2.5, beta: 2, n: 0 };

export interface KernelSample {
    distanceKm: number;
    accepted: boolean;
}

/** Cotas de sanidad del ajuste (fuera de esto, el dato manda menos que el diseño). */
const BETA_MIN = 0.4;
const BETA_MAX = 8;
const ALPHA_FIT_MIN_KM = 0.3;
const ALPHA_FIT_MAX_KM = 60;
const MIN_SAMPLES = 30;

/**
 * Ajusta (α, β) por máxima verosimilitud: regresión logística de `accepted`
 * sobre x = ln(d) vía Newton–Raphson (IRLS 2×2). Devuelve null si la muestra es
 * insuficiente, degenerada (una sola clase) o el ajuste cae fuera de las cotas.
 */
export function fitMobilityKernel(samples: ReadonlyArray<KernelSample>): MobilityKernel | null {
    const xs: number[] = [];
    const ys: number[] = [];
    let pos = 0;
    for (const s of samples) {
        if (!Number.isFinite(s.distanceKm) || s.distanceKm <= 0) continue;
        xs.push(Math.log(s.distanceKm));
        ys.push(s.accepted ? 1 : 0);
        if (s.accepted) pos++;
    }
    const n = xs.length;
    if (n < MIN_SAMPLES || pos === 0 || pos === n) return null;

    // logit P = b0 + b1·x  (esperamos b1 < 0). Arranque: b0 = logit(tasa base), b1 = 0.
    let b0 = Math.log(pos / (n - pos));
    let b1 = 0;
    for (let iter = 0; iter < 50; iter++) {
        // Gradiente y Hessiano de la log-verosimilitud.
        let g0 = 0, g1 = 0, h00 = 0, h01 = 0, h11 = 0;
        for (let i = 0; i < n; i++) {
            const z = b0 + b1 * xs[i];
            const p = 1 / (1 + Math.exp(-z));
            const r = ys[i] - p;
            const w = Math.max(1e-9, p * (1 - p));
            g0 += r;
            g1 += r * xs[i];
            h00 += w;
            h01 += w * xs[i];
            h11 += w * xs[i] * xs[i];
        }
        const det = h00 * h11 - h01 * h01;
        if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return null;
        const d0 = (h11 * g0 - h01 * g1) / det;
        const d1 = (h00 * g1 - h01 * g0) / det;
        b0 += d0;
        b1 += d1;
        if (Math.abs(d0) < 1e-7 && Math.abs(d1) < 1e-7) break;
    }

    const beta = -b1;
    if (!Number.isFinite(beta) || beta < BETA_MIN || beta > BETA_MAX) return null;
    const alphaKm = Math.exp(b0 / beta);
    if (!Number.isFinite(alphaKm) || alphaKm < ALPHA_FIT_MIN_KM || alphaKm > ALPHA_FIT_MAX_KM) return null;
    return { alphaKm, beta, n };
}

/**
 * Contracción jerárquica: con n observaciones, el kernel de la categoría se
 * mezcla con el global por ω = n / (n + n0). Con n = 0 devuelve el global exacto.
 * Es la misma filosofía de los priors Dirichlet, aplicada al parámetro espacial.
 */
export function shrinkKernel(
    fit: MobilityKernel | null,
    global: MobilityKernel = DEFAULT_KERNEL,
    n0 = 50
): MobilityKernel {
    if (!fit || fit.n <= 0) return global;
    const w = fit.n / (fit.n + n0);
    return {
        alphaKm: w * fit.alphaKm + (1 - w) * global.alphaKm,
        beta: w * fit.beta + (1 - w) * global.beta,
        n: fit.n,
    };
}
