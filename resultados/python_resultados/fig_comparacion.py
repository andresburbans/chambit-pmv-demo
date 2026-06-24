# -*- coding: utf-8 -*-
"""
FIGURA 6.4 — HIVE 1 frente al ordenamiento por distancia pura.
Fuente de datos: exp2_comparison de figuras/_synth_data.json (modelo geo-core real).

(a) Caso representativo: el vecino más cercano (0,8 km) cede el primer lugar
    porque su precio queda fuera del presupuesto (ajuste 0,19), ante un candidato
    a 1,6 km que respeta el presupuesto y exhibe mejor reputación.
(b) Agregado: en qué posición del orden de HIVE 1 cae el candidato más cercano,
    sobre el conjunto de consultas; caja con la divergencia top-1 y la ρ de rangos.
"""
from _estilo import plt, style, save, load_data, INK, MUTED, BLUE, TERRA, SOFT


def main():
    d = load_data()
    e2 = d["exp2_comparison"]
    case = e2["case"]
    rows = case["rows"]

    fig, (axA, axB) = plt.subplots(1, 2, figsize=(9.4, 3.9))

    # (a) caso representativo: distancia vs reputación, color = ajuste de precio
    xs = [r["distanceKm"] for r in rows]
    ys = [r["eR"] for r in rows]
    cs = [r["fPrice"] for r in rows]
    sc = axA.scatter(xs, ys, c=cs, cmap="YlGnBu", vmin=0, vmax=1, s=90,
                     edgecolor=INK, linewidth=0.6, zorder=3)
    hive1 = next(r for r in rows if r["hiveRank"] == 1)
    dist1 = next(r for r in rows if r["distRank"] == 1)
    axA.scatter([hive1["distanceKm"]], [hive1["eR"]], s=300, marker="*",
                facecolor="none", edgecolor=BLUE, linewidth=2.0, zorder=4)
    axA.scatter([dist1["distanceKm"]], [dist1["eR"]], s=170, marker="s",
                facecolor="none", edgecolor=TERRA, linewidth=2.0, zorder=4)
    axA.annotate("HIVE 1  #1", (hive1["distanceKm"], hive1["eR"]),
                 textcoords="offset points", xytext=(8, 8), color=BLUE,
                 fontsize=9.5, fontweight="bold")
    axA.annotate("más cercano", (dist1["distanceKm"], dist1["eR"]),
                 textcoords="offset points", xytext=(6, -16), color=TERRA,
                 fontsize=9.5, fontweight="bold")
    axA.set_xlabel("Distancia (km)")
    axA.set_ylabel("Reputación esperada  E[R]")
    axA.set_title("(a) Caso representativo", fontsize=11, fontweight="bold", loc="left")
    cb = fig.colorbar(sc, ax=axA, fraction=0.046, pad=0.03)
    cb.set_label("Ajuste de precio", fontsize=9)
    cb.outline.set_linewidth(0.6)
    style(axA)

    # (b) agregado: dónde cae el más cercano en el ranking de HIVE 1
    hist = e2["nearestHiveRankHist"]
    labels = ["1", "2", "3", "4", "5", "≥6"]
    bars = axB.bar(labels, hist, color=SOFT, edgecolor=INK, linewidth=0.8)
    bars[0].set_color(BLUE)
    axB.set_xlabel("Posición del más cercano en el orden de HIVE 1")
    axB.set_ylabel("Consultas")
    axB.set_title("(b) Agregado · %d consultas" % e2["queries"],
                  fontsize=11, fontweight="bold", loc="left")
    txt = ("El primer resultado difiere\nde la distancia pura en %.1f%%\n"
           "de las consultas  (ρ = %.2f)" % (e2["topDifferPct"], e2["spearmanMean"]))
    axB.text(0.97, 0.95, txt, transform=axB.transAxes, ha="right", va="top",
             fontsize=9.2, bbox=dict(boxstyle="round,pad=0.5", fc="#f4f6f8",
                                     ec=MUTED, lw=0.8))
    style(axB)
    save(fig, "fig_6_4_comparacion.png")


if __name__ == "__main__":
    main()
