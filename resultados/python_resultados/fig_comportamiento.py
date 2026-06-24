# -*- coding: utf-8 -*-
"""
FIGURA 6.5 — Propiedades de comportamiento del modelo (tres paneles).
Fuente: exp3_behavior de figuras/_synth_data.json (modelo geo-core real).

(a) Arranque en frío: E[R] parte del prior («Nuevo») y converge a la media real
    a medida que se acumula evidencia, sin saltos ni certezas prematuras.
(b) Modulación por densidad: la escala espacial α_eff se expande donde la oferta
    escasea y se contrae donde es densa ("mira más lejos solo cuando hace falta").
(c) Urgencia: al conmutar el perfil de pesos (w_dist 0,28→0,35) el orden se
    reacomoda en favor de los candidatos más próximos.
"""
from _estilo import plt, style, save, load_data, MUTED, BLUE, TERRA, SOFT


def main():
    d = load_data()
    b = d["exp3_behavior"]
    fig, (a1, a2, a3) = plt.subplots(1, 3, figsize=(12.2, 3.7))

    # (a) arranque en frío
    cs = b["coldStart"]
    a1.axhline(cs["trueMean"], ls="--", color=MUTED, lw=1.2,
               label="media real (%.2f)" % cs["trueMean"])
    a1.plot(cs["n"], cs["eR"], "-o", color=BLUE, lw=1.8, ms=4.5, mfc="white",
            mec=BLUE, label="E[R] estimada")
    a1.scatter([0], [cs["priorMean"]], s=70, color=TERRA, zorder=5)
    a1.annotate("«Nuevo»", (0, cs["priorMean"]), textcoords="offset points",
                xytext=(10, -2), color=TERRA, fontsize=9.5, fontweight="bold")
    a1.set_xlabel("Reseñas acumuladas")
    a1.set_ylabel("Reputación esperada  E[R]")
    a1.set_title("(a) Arranque en frío", fontsize=11, fontweight="bold", loc="left")
    a1.legend(frameon=False, fontsize=8.5, loc="lower right")
    style(a1)

    # (b) modulación por densidad
    dd = b["density"]
    a2.plot(dd["supply"], dd["alphaEff"], "-o", color=BLUE, lw=1.8, ms=4.5,
            mfc="white", mec=BLUE)
    a2.scatter([dd["refSupply"]], [dd["baseAlpha"]], s=80, color=TERRA, zorder=5)
    a2.annotate("oferta de referencia\n(α = %.1f km)" % dd["baseAlpha"],
                (dd["refSupply"], dd["baseAlpha"]), textcoords="offset points",
                xytext=(12, 10), color=TERRA, fontsize=8.6)
    a2.set_xlabel("Oferta local (densidad)")
    a2.set_ylabel(r"Escala espacial  $\alpha_{eff}$ (km)")
    a2.set_title("(b) Modulación por densidad", fontsize=11, fontweight="bold", loc="left")
    a2.text(0.04, 0.06, "escaso → mira más lejos", transform=a2.transAxes,
            fontsize=8.4, color=MUTED)
    style(a2)

    # (c) urgencia: bump chart de rangos (agendada → urgente)
    u = b["urgency"]
    for r in u:
        ru = r["rankUrgent"]
        if ru is None:
            continue
        swap = r["rankScheduled"] != ru
        col = TERRA if swap else SOFT
        lw = 2.2 if swap else 1.0
        a3.plot([0, 1], [r["rankScheduled"], ru], "-o", color=col, lw=lw, ms=5,
                mfc="white", mec=col, zorder=3 if swap else 2)
        if swap:
            a3.annotate(" %.1f km" % r["distanceKm"], (1, ru), fontsize=8.2,
                        color=TERRA, va="center")
    a3.set_xlim(-0.25, 1.45)
    a3.set_xticks([0, 1])
    a3.set_xticklabels(["Agendada", "Urgente"])
    a3.invert_yaxis()
    a3.set_ylabel("Posición en el orden")
    a3.set_title(r"(c) Urgencia · $w_{dist}$ 0.28→0.35", fontsize=11, fontweight="bold", loc="left")
    style(a3)
    a3.grid(axis="x", visible=False)
    save(fig, "fig_6_5_comportamiento.png")


if __name__ == "__main__":
    main()
