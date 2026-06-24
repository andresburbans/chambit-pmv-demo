# -*- coding: utf-8 -*-
"""
FIGURA 6.7 — Robustez multi-semilla y ablación de señales.
Fuente: exp5_robustness y exp6_ablation de figuras/_synth_data.json (modelo real).

(a) y (b) Robustez: las cifras de cabecera (correlación de rangos HIVE-vs-distancia
    y divergencia del primer resultado) se repiten sobre 30 poblaciones sintéticas
    independientes (1200 consultas). La dispersión entre semillas es estrecha, de
    modo que los resultados no dependen de una semilla afortunada.
(c) Ablación: importancia de cada señal medida como 1 − ρ(orden completo, orden
    sin la señal). La distancia domina con holgura (≈10× cualquier señal
    alfanumérica), evidencia cuantitativa de la estructurancia espacial; las siete
    señales tienen importancia no nula (ninguna es peso muerto).
"""
import random
from _estilo import plt, style, save, load_data, INK, MUTED, BLUE, TERRA, SOFT

SIG_ES = {
    "distance": "Distancia", "text": "Texto", "price": "Precio",
    "expectedRating": "Reputación E[R]", "recency": "Recencia",
    "varPenalty": "Penaliz. varianza", "categoryMatch": "Foco temático",
}


def _strip(ax, values, mean, ci, color, xlabel, fmt):
    random.seed(7)
    ys = [1 + (random.random() - 0.5) * 0.5 for _ in values]
    ax.axvspan(mean - ci, mean + ci, color=color, alpha=0.16, zorder=1)
    ax.axvline(mean, color=color, lw=1.8, zorder=2)
    ax.scatter(values, ys, s=26, color=color, edgecolor="white", linewidth=0.5,
               alpha=0.9, zorder=3)
    ax.set_ylim(0.4, 1.6)
    ax.set_yticks([])
    ax.set_xlabel(xlabel)
    ax.text(0.5, 0.90, fmt, transform=ax.transAxes, ha="center", va="top",
            fontsize=9.4, bbox=dict(boxstyle="round,pad=0.4", fc="#f4f6f8",
                                    ec=MUTED, lw=0.8))
    style(ax)
    ax.grid(axis="y", visible=False)


def main():
    d = load_data()
    e5 = d["exp5_robustness"]
    e6 = d["exp6_ablation"]

    fig = plt.figure(figsize=(12.6, 3.8))
    a1 = fig.add_subplot(1, 3, 1)
    a2 = fig.add_subplot(1, 3, 2)
    a3 = fig.add_subplot(1, 3, 3)

    # (a) correlación de rangos por semilla
    sp = e5["spearman"]
    _strip(a1, e5["perSeedSpearman"], sp["mean"], sp["ci95"], BLUE,
           "ρ de rangos (HIVE 1 vs distancia), por semilla",
           "ρ = %.3f ± %.3f  (IC95)\n%d semillas · %d consultas"
           % (sp["mean"], sp["ci95"], e5["seeds"], e5["seeds"] * e5["queriesPerSeed"]))
    a1.set_title("(a) Estabilidad de la correlación", fontsize=10.5,
                 fontweight="bold", loc="left")

    # (b) divergencia top-1 por semilla
    td = e5["topDifferPct"]
    _strip(a2, e5["perSeedTopDiffer"], td["mean"], td["ci95"], TERRA,
           "Divergencia del primer resultado (%), por semilla",
           "%.1f%% ± %.1f  (IC95)\ncand. dominante #1 en %.1f%%"
           % (td["mean"], td["ci95"], e5["plantedTop1"]["pct"]))
    a2.set_title("(b) Estabilidad de la divergencia", fontsize=10.5,
                 fontweight="bold", loc="left")

    # (c) ablación: importancia por señal
    rows = e6["rows"]
    labels = [SIG_ES.get(r["signal"], r["signal"]) for r in rows]
    imp = [r["importance"] for r in rows]
    flips = [r["top1FlipPct"] for r in rows]
    ypos = list(range(len(rows)))[::-1]
    colors = [BLUE if r["signal"] == "distance" else SOFT for r in rows]
    a3.barh(ypos, imp, color=colors, edgecolor=INK, linewidth=0.8, height=0.66)
    for y, v, f in zip(ypos, imp, flips):
        a3.annotate("  %.3f  (flip %.0f%%)" % (v, f), (v, y), va="center",
                    fontsize=8.0, color=INK)
    a3.set_yticks(ypos)
    a3.set_yticklabels(labels, fontsize=9)
    a3.set_xlim(0, max(imp) * 1.42)
    a3.set_xlabel("Importancia  (1 − ρ entre orden con y sin la señal)")
    a3.set_title("(c) Ablación de señales · %d consultas" % e6["queries"],
                 fontsize=10.5, fontweight="bold", loc="left")
    style(a3)
    a3.grid(axis="y", visible=False)
    save(fig, "fig_6_7_robustez_ablacion.png")


if __name__ == "__main__":
    main()
