/**
 * indexacion-h3.ts — Indexación geoespacial discreta sobre la rejilla H3 (HIVE 1).
 *
 * EXCERPTO del sistema de información geográfica de la tesis de Ingeniería
 * Topográfica. Es la pieza fundacional del modelo: el tránsito del ESPACIO
 * CONTINUO de coordenadas (WGS84) al ESPACIO DISCRETO de la rejilla hexagonal
 * jerárquica H3 (Sahr et al., 2003; Uber, 2018). De esa discretización derivan,
 * a la vez, cinco funciones que en la literatura suelen aparecer disociadas:
 *
 *   1. ÍNDICE de búsqueda   — la proximidad se vuelve pertenencia indexable.
 *   2. MÉTRICA de decisión  — la distancia se calcula entre celdas (gridDistance).
 *   3. UNIDAD de agregación — el tablero geoanalítico cuenta por celda.
 *   4. ANONIMIZACIÓN        — la celda sustituye a la coordenada exacta.
 *   5. ISOTROPÍA            — los seis vecinos del hexágono equidistan (a
 *                              diferencia de la rejilla cuadrada y sus diagonales).
 *
 * Por qué hexágonos: teselan el plano con vecindad uniforme y sin ambigüedad de
 * adyacencia, y la jerarquía H3 permite subir y bajar de resolución de forma
 * (casi) contenida. Por qué reversible: del índice discreto se recupera el
 * centroide continuo (§6), lo que habilita la interoperabilidad con la
 * cartografía oficial (MAGNA-SIRGAS) sin almacenar nunca el punto original.
 *
 * Depende de `h3-js` (paquete público) y del módulo hermano `friccion-espacial`.
 */

import {
    latLngToCell,
    cellToLatLng,
    cellToBoundary,
    cellToParent,
    gridDisk,
    gridDistance,
    getResolution,
} from "h3-js";
import { haversineKm } from "./friccion-espacial";

/* ───────────────────────────────────────────────────────────────────────────
 * 1. Pirámide de resoluciones canónica
 *
 * La app NO guarda una sola celda, sino una PIRÁMIDE: la misma posición indexada
 * a varias resoluciones, cada una con un propósito y un nivel de privacidad. El
 * índice se guarda SIEMPRE tal como lo entrega `h3-js` (interoperabilidad), y se
 * captura fresco en cada evento geográfico (no se recicla: el usuario pudo moverse).
 * ─────────────────────────────────────────────────────────────────────────── */

export const GEO_RESOLUTIONS = {
    /** res7 · arista ≈ 1.2 km (≈ 5.2 km²). Fallback amplio / filtrado regional. */
    fallback: 7,
    /** res8 · arista ≈ 460 m (≈ 0.74 km²). Matching anonimizado y PÚBLICO. */
    matching: 8,
    /** res9 · arista ≈ 174 m (≈ 0.11 km²). Cálculo fino de distancia y ranking. */
    distance: 9,
    /** res12 · arista ≈ 9 m. Navegación privada precisa (solo almacén privado). */
    precise: 12,
} as const;

/** res6 · arista ≈ 3.2 km. Índice inverso de cobertura (§5). */
export const COVERAGE_CELL_RES = 6;

/** Anillos H3 (res7) que el georadar expande al buscar (kRing por defecto). */
export const SEARCH_RINGS_RES7 = 2;

/** Separación media centro-a-centro de celdas res8 (km) ≈ arista 461 m × √3. */
export const KM_PER_HEX_RES8 = 0.798;

/* ───────────────────────────────────────────────────────────────────────────
 * 2. Indexación  ──  discretización  (lat, lng)  →  pirámide H3
 * ─────────────────────────────────────────────────────────────────────────── */

export interface PiramideH3 {
    h3Res7: string;
    h3Res8: string;
    h3Res9: string;
    h3Res12: string;
}

/** Índice completo de un punto (incluye la resolución precisa: SOLO almacén privado). */
export function indexarPiramide(lat: number, lng: number): PiramideH3 {
    return {
        h3Res7: latLngToCell(lat, lng, GEO_RESOLUTIONS.fallback),
        h3Res8: latLngToCell(lat, lng, GEO_RESOLUTIONS.matching),
        h3Res9: latLngToCell(lat, lng, GEO_RESOLUTIONS.distance),
        h3Res12: latLngToCell(lat, lng, GEO_RESOLUTIONS.precise),
    };
}

/**
 * Índice PÚBLICO: la privacidad posicional es estructural, no una política de
 * acceso. El perfil público y el catálogo guardan solo resoluciones gruesas
 * (res7/8/9); la celda de cuadra (res12) jamás sale del documento privado. Así,
 * nadie —ni con acceso a la base— puede recuperar la dirección exacta.
 */
export function indexarPublico(lat: number, lng: number): Omit<PiramideH3, "h3Res12"> {
    return {
        h3Res7: latLngToCell(lat, lng, GEO_RESOLUTIONS.fallback),
        h3Res8: latLngToCell(lat, lng, GEO_RESOLUTIONS.matching),
        h3Res9: latLngToCell(lat, lng, GEO_RESOLUTIONS.distance),
    };
}

/* ───────────────────────────────────────────────────────────────────────────
 * 3. Jerarquía  ──  navegar la pirámide sin volver a geocodificar
 *
 * H3 es jerárquica: toda celda tiene un único padre en la resolución superior.
 * Esto permite derivar la celda de búsqueda (res7) desde la de ranking (res9)
 * sin re-geocodificar ni guardar lat/lng — la pirámide se reconstruye sola.
 * ─────────────────────────────────────────────────────────────────────────── */

/** Sube una celda a la resolución `res` (su padre). Null si la celda es más gruesa. */
export function celdaPadre(cell: string, res: number): string | null {
    if (!cell) return null;
    try {
        const r = getResolution(cell);
        if (r === res) return cell;
        if (r > res) return cellToParent(cell, res);
        return null; // ya es más gruesa que `res`: no se refina con seguridad
    } catch {
        return null;
    }
}

/** Celda de BÚSQUEDA (res7) de una celda cualquiera de la pirámide. */
export function aCeldaBusqueda(cell: string): string | null {
    return celdaPadre(cell, GEO_RESOLUTIONS.fallback);
}

/* ───────────────────────────────────────────────────────────────────────────
 * 4. Vecindad de búsqueda y métrica de distancia
 *
 * El embudo recorta el universo ANTES de puntuar: en lugar de recorrer el
 * catálogo entero, solo se leen las celdas vecinas a la consulta. El costo de la
 * consulta depende así de la DENSIDAD LOCAL y no del tamaño total del catálogo.
 * ─────────────────────────────────────────────────────────────────────────── */

/** Disco de k anillos alrededor de una celda (la celda + sus vecinas hasta k). */
export function vecindadBusqueda(cell: string, k: number = SEARCH_RINGS_RES7): string[] {
    return gridDisk(cell, Math.max(0, k));
}

/**
 * Distancia hexagonal nativa (km nominales) entre dos celdas: `gridDistance`
 * (entera, exacta, barata) normalizada a res8 y multiplicada por KM_PER_HEX_RES8.
 * El modelo razona sobre el espacio discreto, no sobre el continuo: candidatos en
 * la misma celda son indistinguibles por diseño (la anonimización ya destruyó la
 * precisión sub-celda). Fallback a Haversine de centroides si `gridDistance` falla
 * (cruces de cara icosaédrica/pentágonos, irrelevantes a escala urbana).
 */
export function distanciaHexKm(cellA: string, cellB: string): number | null {
    const a = celdaPadre(cellA, GEO_RESOLUTIONS.matching);
    const b = celdaPadre(cellB, GEO_RESOLUTIONS.matching);
    if (!a || !b) return null;
    try {
        const cells = gridDistance(a, b);
        if (!Number.isFinite(cells) || cells < 0) return null;
        return cells * KM_PER_HEX_RES8;
    } catch {
        const [alat, alng] = cellToLatLng(a);
        const [blat, blng] = cellToLatLng(b);
        return haversineKm(alat, alng, blat, blng);
    }
}

/* ───────────────────────────────────────────────────────────────────────────
 * 5. Índice INVERSO de cobertura  (patrón "radius containment")
 *
 * Un experto declara un radio de cobertura variable (1 km … nacional) y el
 * cliente debe ver a TODO experto cuya cobertura lo alcanza, sin importar la
 * distancia. Un disco alrededor del cliente no sirve (su radio es fijo). En su
 * lugar, al publicar, el listing PRECALCULA las celdas res6 que su cobertura
 * cubre; el cliente consulta `coverageCells array-contains <su celda res6>` y una
 * sola lectura indexada devuelve los servicios que lo cubren. El costo de
 * escritura se paga una vez; la lectura (camino caliente) queda O(1).
 * ─────────────────────────────────────────────────────────────────────────── */

/** Coberturas ≥ este umbral (km) no se "celdean" (el array sería enorme): bucket aparte. */
export const WIDE_COVERAGE_KM = 60;

/** Separación aproximada centro-a-centro de celdas res6 (km). Para dimensionar k. */
const RES6_RING_KM = 5.2;

export interface IndiceCobertura {
    /** true si la cobertura es tan amplia que se trae por bucket, no por celdas. */
    wideCoverage: boolean;
    /** Celdas res6 cubiertas por el disco de cobertura (vacío si `wideCoverage`). */
    coverageCells: string[];
}

/** Índice de cobertura de un servicio dado su punto y su radio (km). */
export function indiceCobertura(lat: number, lng: number, km: number): IndiceCobertura {
    if (km >= WIDE_COVERAGE_KM) {
        return { wideCoverage: true, coverageCells: [] };
    }
    const center = latLngToCell(lat, lng, COVERAGE_CELL_RES);
    const k = Math.max(1, Math.ceil(km / RES6_RING_KM) + 1); // +1 anillo de seguridad
    const buffer = km + RES6_RING_KM; // tolerancia de borde (≈ media celda)
    const cells = gridDisk(center, k).filter((c) => {
        const [clat, clng] = cellToLatLng(c);
        return haversineKm(lat, lng, clat, clng) <= buffer;
    });
    if (!cells.includes(center)) cells.push(center); // la celda del punto, siempre
    return { wideCoverage: false, coverageCells: cells };
}

/* ───────────────────────────────────────────────────────────────────────────
 * 6. REVERSIBILIDAD  ──  del índice discreto al espacio continuo
 *
 * La discretización es deliberadamente "con pérdida" (el punto exacto se borra),
 * pero la indexación es REVERSIBLE en lo que importa: de la celda se recupera su
 * CENTROIDE y su POLÍGONO. Esa reversibilidad es lo que:
 *   · dibuja los pines del mapa (centroide de celda, no coordenada del usuario),
 *   · pinta las celdas del tablero geoanalítico (polígono de agregación), y
 *   · habilita la interoperabilidad con la cartografía oficial (MAGNA-SIRGAS),
 * todo ello SIN almacenar ni exponer jamás la posición original.
 * ─────────────────────────────────────────────────────────────────────────── */

export interface Coordenada {
    lat: number;
    lng: number;
}

/** Reversibilidad básica: celda H3 → centroide WGS84. Es el "pin" del mapa. */
export function revertirACentroide(cell: string): Coordenada {
    const [lat, lng] = cellToLatLng(cell);
    return { lat, lng };
}

/**
 * Reversibilidad de superficie: celda H3 → polígono (vértices del hexágono).
 * Es la huella de agregación que el tablero geoanalítico pinta por celda.
 */
export function revertirAPoligono(cell: string): Coordenada[] {
    return cellToBoundary(cell).map(([lat, lng]) => ({ lat, lng }));
}

export interface PuntoGeodesico {
    lat: number;
    lng: number;
    /** Marco de referencia de origen: el que difunde el GPS. */
    crsOrigen: "EPSG:4326"; // WGS84
    /** Marco de referencia oficial de Colombia (destino de interoperabilidad). */
    crsDestino: "EPSG:4686"; // MAGNA-SIRGAS
}

/**
 * Reversibilidad hacia la cartografía oficial colombiana (MAGNA-SIRGAS).
 *
 * El centroide de la celda está en WGS84 (EPSG:4326), el marco que difunde el GPS.
 * La cartografía oficial de Colombia usa MAGNA-SIRGAS (EPSG:4686), densificación
 * de SIRGAS alineada a ITRF. A la escala de las celdas que el modelo publica
 * (res8 ≈ 460 m, res9 ≈ 174 m), el corrimiento de datum entre ambos marcos es
 * SUB-CELDA (orden submétrico), de modo que la reversibilidad de la indexación
 * basta para interoperar: del índice discreto se recupera el centroide WGS84 y,
 * cuando se requiere rigor geodésico, se aplica la transformación de datum con una
 * librería de proyecciones y los parámetros oficiales del IGAC. Por ejemplo:
 *
 *     import proj4 from "proj4";
 *     const [lng4686, lat4686] = proj4("EPSG:4326", "EPSG:4686", [lng, lat]);
 *
 * Esta función entrega el centroide con su CRS de origen y destino anotados, y
 * deja la transformación numérica precisa a la capa geodésica (proj4/IGAC).
 */
export function revertirAMagnaSirgas(cell: string): PuntoGeodesico {
    const { lat, lng } = revertirACentroide(cell);
    // A la escala de las celdas publicadas el corrimiento es sub-celda; se anota
    // el CRS para que la capa geodésica aplique la transformación oficial.
    return { lat, lng, crsOrigen: "EPSG:4326", crsDestino: "EPSG:4686" };
}
