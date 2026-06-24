# -*- coding: utf-8 -*-
"""
FIGURAS 6.1 y 6.2 — Validación del problema y de los requerimientos (encuesta).

IMPORTANTE — PROCEDENCIA DE LOS DATOS: estas figuras NO usan datos sintéticos ni
microdatos crudos. Visualizan EXCLUSIVAMENTE los agregados numéricos que la
sección 7.1 de la tesis ya declara como hallazgos de la encuesta exploratoria
(disposición a usar ≈99 %, prioridades en escala de 5 puntos y frustraciones en
escala de 4 puntos). Se transcriben aquí como constantes para poder graficarlos;
cualquier corrección del dato debe hacerse en la fuente (§7.1) y aquí en paralelo.

FIG 6.1  Viabilidad + prioridades de cliente y experto.
FIG 6.2  La necesidad espacial latente (frustración consciente vs. valoración de
         la solución geoespacial).
"""
from _estilo import plt, style, save, INK, MUTED, BLUE, TERRA, SOFT, SAND, GRID

# ── Agregados declarados en §7.1 (escala indicada en cada bloque) ───────────
DISPOSICION_SI = 99           # % (≈ noventa y nueve por ciento)
# Prioridad del cliente (escala 1–5)
PRIO_CLIENTE = [
    ("Verificación de identidad", 4.0),
    ("Seguridad en la prestación", 3.8),
    ("Filtros de búsqueda", 3.6),
    ("Afinidad geográfica", 3.5),
    ("Detección de ubicación", 3.3),
    ("Visualización en mapa", 3.3),
]
# Prioridad del experto (escala 1–5)
PRIO_EXPERTO = [
    ("Verificación del cliente", 4.0),
    ("Reputación", 4.0),
    ("Distancia / disponibilidad", 3.8),
    ("Cobertura", 3.6),
]
# Frustraciones del cliente (escala 1–4)
FRUSTRACION = [
    ("Incertidumbre de seguridad", 2.9),
    ("Tiempo en precios/disponib.", 2.8),
    ("Dificultad de encontrar cercano", 2.2),
]
# Valoración de la solución geoespacial (escala 1–5)
SOLUCION_GEO = [
    ("Afinidad geográfica", 3.5),
    ("Detección de ubicación", 3.3),
    ("Visualización en mapa", 3.3),
]


def _barh_scores(ax, items, scale, accent, ref=None, ref_label=None):
    labels = [a for a, _ in items][::-1]
    vals = [b for _, b in items][::-1]
    y = range(len(vals))
    bars = ax.barh(list(y), vals, color=SOFT, edgecolor=INK, linewidth=0.8, height=0.66)
    bars[-1].set_color(accent)  # primer ítem (arriba) acentuado
    for yi, v in zip(y, vals):
        ax.annotate(" %.1f" % v, (v, yi), va="center", fontsize=9, color=INK, fontweight="bold")
    if ref is not None:
        ax.axvline(ref, ls="--", lw=1.1, color=MUTED)
        ax.annotate(ref_label, (ref, len(vals) - 0.4), fontsize=8, color=MUTED, ha="center")
    ax.set_yticks(list(y))
    ax.set_yticklabels(labels, fontsize=8.8)
    ax.set_xlim(0, scale)
    ax.set_xlabel("Prioridad (escala 1–%d)" % scale)
    style(ax)
    ax.grid(axis="y", visible=False)


def fig_6_1():
    fig = plt.figure(figsize=(12.4, 4.0))
    a1 = fig.add_subplot(1, 3, 1)
    a2 = fig.add_subplot(1, 3, 2)
    a3 = fig.add_subplot(1, 3, 3)

    # (a) disposición a usar — donut
    a1.pie([DISPOSICION_SI, 100 - DISPOSICION_SI], colors=[BLUE, GRID],
           startangle=90, counterclock=False, wedgeprops=dict(width=0.42, edgecolor="white"))
    a1.text(0, 0, "%d%%" % DISPOSICION_SI, ha="center", va="center",
            fontsize=20, fontweight="bold", color=INK)
    a1.text(0, -1.35, "dispuestos a usar\nuna app para contratar", ha="center",
            va="center", fontsize=9, color=MUTED)
    a1.set_title("(a) Viabilidad", fontsize=11, fontweight="bold", loc="left")

    # (b) prioridades cliente
    _barh_scores(a2, PRIO_CLIENTE, 5, BLUE)
    a2.set_title("(b) Prioridades del cliente", fontsize=11, fontweight="bold", loc="left")

    # (c) prioridades experto
    _barh_scores(a3, PRIO_EXPERTO, 5, TERRA)
    a3.set_title("(c) Prioridades del experto", fontsize=11, fontweight="bold", loc="left")

    save(fig, "fig_6_1_encuesta_prioridades.png")


def fig_6_2():
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(10.2, 3.9))

    # (a) frustración consciente (escala 1–4): cercanía = la MÁS baja
    labels = [a for a, _ in FRUSTRACION][::-1]
    vals = [b for _, b in FRUSTRACION][::-1]
    y = range(len(vals))
    bars = a1.barh(list(y), vals, color=SAND, edgecolor=INK, linewidth=0.8, height=0.6)
    bars[0].set_color(TERRA)  # cercanía (abajo) resaltada como la menor
    for yi, v in zip(y, vals):
        a1.annotate(" %.1f" % v, (v, yi), va="center", fontsize=9, color=INK, fontweight="bold")
    a1.set_yticks(list(y))
    a1.set_yticklabels(labels, fontsize=8.8)
    a1.set_xlim(0, 4)
    a1.set_xlabel("Frustración consciente (escala 1–4)")
    a1.set_title("(a) Lo que el usuario NOMBRA", fontsize=10.5, fontweight="bold", loc="left")
    a1.text(0.96, 0.30, "la cercanía es la\nmenor frustración", transform=a1.transAxes,
            ha="right", va="center", fontsize=8.4, color=TERRA,
            bbox=dict(boxstyle="round,pad=0.35", fc="white", ec=TERRA, lw=0.8, alpha=0.9))
    style(a1)
    a1.grid(axis="y", visible=False)

    # (b) valoración de la solución geoespacial (escala 1–5): alta
    _barh_scores(a2, SOLUCION_GEO, 5, BLUE, ref=3.0, ref_label="umbral de\nalta prioridad")
    a2.set_title("(b) La solución que VALORA", fontsize=10.5, fontweight="bold", loc="left")

    fig.suptitle("Necesidad espacial latente: baja frustración declarada, alta valoración de la solución",
                 fontsize=10.5, color=INK, y=1.02)
    save(fig, "fig_6_2_necesidad_latente.png")


def main():
    fig_6_1()
    fig_6_2()


if __name__ == "__main__":
    main()
