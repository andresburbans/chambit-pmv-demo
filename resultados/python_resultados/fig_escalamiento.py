# -*- coding: utf-8 -*-
"""
FIGURA 6.6 — Costo de la consulta frente al tamaño del catálogo.
Fuente: exp4_scaling de figuras/_synth_data.json (modelo geo-core real).

A densidad local constante, HIVE 1 sólo evalúa las ofertas que caen en la
vecindad H3 (el mismo prefiltro que el índice resuelve en producción): los
candidatos examinados y el tiempo por consulta se mantienen planos mientras el
catálogo crece de 200 a 20 000, frente al crecimiento lineal de la evaluación
exhaustiva. Confirma empíricamente el costo independiente del tamaño del catálogo.
"""
from _estilo import plt, style, save, load_data, BLUE, TERRA


def main():
    d = load_data()
    rows = d["exp4_scaling"]["rows"]
    N = [r["N"] for r in rows]
    neigh = [r["examinedNeighborhood"] for r in rows]
    brute = [r["examinedBrute"] for r in rows]
    tN = [r["timeNeighborhoodMs"] for r in rows]
    tB = [r["timeBruteMs"] for r in rows]

    fig, (a1, a2) = plt.subplots(1, 2, figsize=(9.6, 3.9))

    a1.plot(N, brute, "-s", color=TERRA, lw=1.8, ms=5, mfc="white", mec=TERRA,
            label="evaluación exhaustiva")
    a1.plot(N, neigh, "-o", color=BLUE, lw=2.0, ms=5, mfc="white", mec=BLUE,
            label="HIVE 1 (vecindad H3)")
    a1.set_xscale("log")
    a1.set_yscale("log")
    a1.set_xlabel("Tamaño del catálogo  N")
    a1.set_ylabel("Candidatos evaluados")
    a1.set_title("(a) Candidatos evaluados", fontsize=11, fontweight="bold", loc="left")
    a1.legend(frameon=False, fontsize=8.6, loc="upper left")
    style(a1)

    a2.plot(N, tB, "-s", color=TERRA, lw=1.8, ms=5, mfc="white", mec=TERRA,
            label="evaluación exhaustiva")
    a2.plot(N, tN, "-o", color=BLUE, lw=2.0, ms=5, mfc="white", mec=BLUE,
            label="HIVE 1 (vecindad H3)")
    a2.set_xscale("log")
    a2.set_xlabel("Tamaño del catálogo  N")
    a2.set_ylabel("Tiempo por consulta (ms)")
    a2.set_title("(b) Costo temporal", fontsize=11, fontweight="bold", loc="left")
    a2.legend(frameon=False, fontsize=8.6, loc="upper left")
    style(a2)
    save(fig, "fig_6_6_escalamiento.png")


if __name__ == "__main__":
    main()
