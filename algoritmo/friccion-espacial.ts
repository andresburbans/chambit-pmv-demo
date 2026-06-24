/**
 * friccion-espacial.ts — Fricción de la distancia (núcleo HIVE 1).
 *
 * EXCERPTO del módulo `geo-core` de la tesis de Ingeniería Topográfica.
 * Modela la fricción espacial urbana como un decaimiento log-logístico de cola
 * pesada, en línea con la teoría de accesibilidad (Geurs & van Wee, 2004) y con
 * la Primera Ley de la Geografía de Tobler (1970): "todo está relacionado con
 * todo lo demás, pero las cosas cercanas están más relacionadas que las lejanas".
 *
 *      f_esp(d) = 1 / ( 1 + (d/α)^β )            ── ecuación (16) de la tesis
 *
 * Propiedades de diseño:  f(0) = 1,  f(α) = 0.5,  f(4α) ≈ 0.06.
 * La cola pesada mantiene competitivos a los candidatos lejanos cuyas demás
 * señales compensan la distancia, a diferencia de un núcleo gaussiano que los
 * anula de golpe.
 *
 * Módulo PURO: sin entradas/salidas, determinista y verificable en frío.
 */

/** Kernel de respaldo (comportamiento clásico con 0 datos): α = 2.5 km, β = 2. */
const DEFAULT_ALPHA_KM = 2.5;
const DEFAULT_BETA = 2;

/** Cotas del α efectivo del decaimiento (km). */
const ALPHA_BOUNDS = { minKm: 1.2, maxKm: 9 } as const;

/**
 * Modulación por densidad local de oferta:  α_eff = α · (S_ref / S)^γ  acotado.
 * Mercado escaso → el modelo "mira más lejos"; mercado denso → aprieta.
 */
const DENSITY = { gamma: 0.5, refSupply: 12, factorMin: 0.7, factorMax: 1.8 } as const;

/**
 * Decaimiento log-logístico (cola pesada): f(d) = 1 / (1 + (d/α)^β).
 */
export function logLogistic(d: number, alpha = DEFAULT_ALPHA_KM, beta = DEFAULT_BETA): number {
    if (!Number.isFinite(d) || d <= 0) return 1;
    if (!Number.isFinite(alpha) || alpha <= 0) return 0;
    if (beta === 2) {
        const r = d / alpha;
        return 1 / (1 + r * r);
    }
    return 1 / (1 + Math.pow(d / alpha, beta));
}

/**
 * α efectivo: el α del kernel (aprendido o de diseño) modulado por la densidad
 * local de mercado y acotado. Sin dato de densidad el factor es 1 y degrada al
 * kernel puro: con cero datos, el modelo se comporta exactamente como su diseño.
 */
export function alphaEff(kernelAlphaKm: number, localSupply?: number): number {
    let factor = 1;
    if (localSupply !== undefined && Number.isFinite(localSupply) && localSupply > 0) {
        factor = Math.pow(DENSITY.refSupply / localSupply, DENSITY.gamma);
        factor = Math.min(DENSITY.factorMax, Math.max(DENSITY.factorMin, factor));
    }
    const a = kernelAlphaKm * factor;
    return Math.min(ALPHA_BOUNDS.maxKm, Math.max(ALPHA_BOUNDS.minKm, a));
}

const EARTH_RADIUS_KM = 6371;

/**
 * Distancia great-circle (Haversine) en km. En HIVE 1 es solo el FALLBACK de la
 * métrica hexagonal nativa (distancia entre celdas H3). La posición se opera
 * sobre la rejilla discreta y su centroide, nunca sobre la coordenada exacta del
 * usuario: la privacidad posicional es una propiedad de la estructura del dato,
 * no de una política de acceso falible.
 */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Decaimiento exponencial por antigüedad (actividad / recencia). f(0) = 1. */
export function expDecay(ageHours: number, halfLifeHours: number): number {
    if (!Number.isFinite(ageHours) || ageHours < 0) return 1;
    if (!Number.isFinite(halfLifeHours) || halfLifeHours <= 0) return 0;
    return Math.exp(-(Math.LN2 / halfLifeHours) * ageHours);
}
