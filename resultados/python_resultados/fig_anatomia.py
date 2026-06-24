# -*- coding: utf-8 -*-
"""
FIGURA 6.3 — Anatomía de un ordenamiento real (interpretabilidad).
Fuente: anatomy de figuras/_synth_data.json (modelo geo-core real).

Descompone el puntaje de los seis primeros candidatos de una consulta concreta en
la contribución ponderada de cada señal (w_j · f_j). Hace visible que el orden no
es una caja negra: cada posición es la suma trazable de distancia, reputación,
foco, precio y recencia, menos la penalización por varianza. El #1 gana por un
equilibrio de señales, no por dominar una sola.
"""
from _estilo import plt, style, save, load_data, INK, MUTED, BLUE, TERRA, SOFT, SAND

# Orden y color de cada señal (sobrio, distinguible).
SIGNALS = [
    ("distancia", "Distancia", BLUE),
    ("reputacion", "Reputación", "#7ba098"),
    ("foco", "Foco temático", TERRA),
    ("precio", "Precio", SOFT),
    ("recencia", "Recencia", SAND),
    ("texto", "Texto", "#9a8fb0"),
]
PEN = ("penalizacion", "−Penaliz. varianza", "#c98a8a")


def main():
    d = load_data()
    a = d.get("anatomy")
    if not a:
        print("  (sin datos de anatomía en el JSON)")
        return
    rows = a["rows"]
    ys = list(range(len(rows)))[::-1]  # #1 arriba

    fig, ax = plt.subplots(figsize=(10.8, 4.2))
    for y, r in zip(ys, rows):
        c = r["contrib"]
        cursor = 0.0
        for key, _label, color in SIGNALS:
            v = c.get(key, 0.0)
            if v <= 0:
                continue
            ax.barh(y, v, left=cursor, height=0.62, color=color,
                    edgecolor="white", linewidth=0.6, zorder=3)
            cursor += v
        pos_sum = cursor
        pen = c.get(PEN[0], 0.0)  # negativo
        # penalización: segmento hachurado que "come" del extremo derecho
        if pen < 0:
            ax.barh(y, pen, left=pos_sum, height=0.62, color=PEN[2],
                    edgecolor="white", linewidth=0.6, hatch="////", zorder=4)
        score = r["score"]
        ax.plot([score, score], [y - 0.4, y + 0.4], color=INK, lw=1.6, zorder=5)
        ax.annotate("  score %.3f" % score, (pos_sum, y), va="center",
                    fontsize=8.8, color=INK, fontweight="bold")
        ax.annotate("#%d · %.1f km · E[R] %.2f" % (r["rank"], r["distanceKm"], r["eR"]),
                    (0.004, y + 0.30), va="bottom", fontsize=8.0, color=MUTED)

    ax.set_yticks([])
    ax.set_xlabel(r"Contribución al puntaje  ($w_j \cdot f_j$)")
    ax.set_xlim(0, max(sum(max(v, 0) for v in r["contrib"].values()) for r in rows) * 1.12)
    ax.set_title("Descomposición del puntaje por señal — consulta de ejemplo (presupuesto $%s)"
                 % "{:,}".format(a["budget"]).replace(",", "."),
                 fontsize=10.5, fontweight="bold", loc="left")
    # leyenda a la derecha (evita colisión con el rótulo del eje X)
    handles = [plt.Rectangle((0, 0), 1, 1, color=col) for _, _, col in SIGNALS]
    handles.append(plt.Rectangle((0, 0), 1, 1, color=PEN[2], hatch="////"))
    labels = [lab for _, lab, _ in SIGNALS] + [PEN[1]]
    ax.legend(handles, labels, frameon=False, fontsize=8.4, ncol=1,
              loc="center left", bbox_to_anchor=(1.005, 0.5))
    style(ax)
    ax.grid(axis="y", visible=False)
    save(fig, "fig_6_3_anatomia.png")


if __name__ == "__main__":
    main()
