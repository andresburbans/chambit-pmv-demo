/**
 * reputacion-dirichlet.ts — Reputación bayesiana (núcleo HIVE 1).
 *
 * EXCERPTO del módulo `geo-core` de la tesis de Ingeniería Topográfica.
 * La reputación se trata como una DISTRIBUCIÓN y no como un promedio decorativo.
 * Con los conteos ordinales por estrella n = (n1..n5) y un prior de Dirichlet
 * α = (α1..α5), el posterior es  θ ~ Dir(α + n),  del que se derivan en forma
 * cerrada la calificación esperada y su varianza (Jøsang & Haller, 2007):
 *
 *   E[R]  = Σ_k  k · (n_k + α_k) / (N + α0)            ── ecuación (17)
 *   Var[R]= Σ_k  k² · (n_k + α_k) / (N + α0)  −  E[R]²
 *
 * con N = Σ n_k  y  α0 = Σ α_k. La esperanza alimenta la señal de reputación y
 * la varianza separa el NIVEL del RIESGO (un experto con notas polarizadas se
 * penaliza aunque su media sea alta). Módulo PURO y determinista.
 */

export type Alpha5 = readonly [number, number, number, number, number];
export type Counts5 = readonly [number, number, number, number, number];

const STARS = [1, 2, 3, 4, 5] as const;

/** Prior global de respaldo (curva en J típica de marketplaces). α0 = 7. */
export const GLOBAL_FALLBACK_ALPHA: Alpha5 = [1, 1, 1, 2, 2];

/** E[R | n, α] bajo el posterior Dirichlet–multinomial. Rango [1, 5]. */
export function expectedRating(n: Counts5, a: Alpha5): number {
    const N = n[0] + n[1] + n[2] + n[3] + n[4];
    const a0 = a[0] + a[1] + a[2] + a[3] + a[4];
    const denom = N + a0;
    if (denom <= 0) return 0;
    let s = 0;
    for (let i = 0; i < 5; i++) s += (STARS[i] * (n[i] + a[i])) / denom;
    return s;
}

/** Var[R | n, α]. Doble como métrica de polarización / riesgo del experto. */
export function ratingVariance(n: Counts5, a: Alpha5): number {
    const N = n[0] + n[1] + n[2] + n[3] + n[4];
    const a0 = a[0] + a[1] + a[2] + a[3] + a[4];
    const denom = N + a0;
    if (denom <= 0) return 0;
    let er = 0;
    const p = new Array<number>(5);
    for (let i = 0; i < 5; i++) {
        p[i] = (n[i] + a[i]) / denom;
        er += STARS[i] * p[i];
    }
    let v = 0;
    for (let i = 0; i < 5; i++) {
        const diff = STARS[i] - er;
        v += diff * diff * p[i];
    }
    return v;
}

/** Consistencia ∈ (0, 1]. 1 = consistente, → 0 = polarizado. */
export function consistency(varR: number): number {
    if (!Number.isFinite(varR) || varR < 0) return 1;
    return 1 / (1 + varR);
}

/** Total de reseñas del vector de conteos. */
export function totalCounts(n: Counts5): number {
    return n[0] + n[1] + n[2] + n[3] + n[4];
}

/**
 * Arranque en frío encadenado: deriva un vector de conteos desde el escalar
 * (rating, ratingCount) mientras no exista el histograma real de cinco estrellas.
 * El N efectivo se ACOTA (maxN) porque "trabajos completados" no son "reseñas":
 * tratarlos 1:1 concentraría el posterior con evidencia que no existe. Reparte el
 * conteo entre floor/ceil del promedio para que la media implícita coincida.
 */
export function deriveCountsFromLegacy(
    rating: number | undefined,
    ratingCount: number | undefined,
    maxN = 8
): Counts5 {
    const total = Math.min(Math.max(0, Math.floor(ratingCount ?? 0)), Math.max(0, maxN));
    if (total === 0) return [0, 0, 0, 0, 0];
    const r = Math.max(1, Math.min(5, rating ?? 3));
    const lo = Math.floor(r);
    const hi = Math.ceil(r);
    const out = [0, 0, 0, 0, 0];
    if (lo === hi) {
        out[lo - 1] = total;
    } else {
        const nHi = Math.round(total * (r - lo));
        out[lo - 1] = total - nHi;
        out[hi - 1] = nHi;
    }
    return [out[0], out[1], out[2], out[3], out[4]];
}

/*
 * NOTA. El módulo completo añade además:
 *   · sampleExpectedRating(): una MUESTRA del posterior (muestreo de Thompson)
 *     para explorar con candidatos de poca evidencia, repartiendo exposición de
 *     forma proporcional a la incertidumbre (rompe el bucle "el primero se
 *     refuerza a sí mismo"); y
 *   · estimatePriorMoM(): reestimación del prior α por el método de los momentos
 *     a partir de las distribuciones observadas, con retroceso jerárquico
 *     (subcategoría → categoría → ciudad → global).
 * Se omiten aquí por brevedad; este excerpto conserva el núcleo cerrado (ec. 17).
 */
