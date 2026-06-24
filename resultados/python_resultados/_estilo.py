# -*- coding: utf-8 -*-
"""
Estilo y utilidades compartidas por los generadores de figuras de la sección 7
(Resultados y discusión) de la tesis. Paleta sobria gris/negro + dos acentos
pastel (azul = HIVE 1 / modelo; terracota = línea base / contraste), coherente
con las figuras de ecuaciones ya incrustadas en el documento.

No genera nada por sí mismo: lo importan los scripts `fig_*.py`.
"""
import json
import os
import matplotlib

matplotlib.use("Agg")  # backend sin ventana: escribe PNG directo
import matplotlib.pyplot as plt  # noqa: E402

# ── Rutas ───────────────────────────────────────────────────────────────────
HERE = os.path.dirname(os.path.abspath(__file__))
FIGDIR = os.path.join(HERE, "..", "figuras")          # donde viven los PNG de la tesis
DATA_PATH = os.path.join(FIGDIR, "_synth_data.json")  # producido por scripts/synth-scenario.ts

# ── Paleta ──────────────────────────────────────────────────────────────────
INK = "#23262b"      # negro de tinta (ejes, texto)
MUTED = "#8a8f98"    # gris medio (notas, referencias)
GRID = "#e6e8eb"     # gris de rejilla
BLUE = "#6b8fbf"     # acento 1 — HIVE 1 / modelo
TERRA = "#cf8a63"    # acento 2 — línea base / contraste
SOFT = "#b9c6d8"     # azul desaturado (barras neutras)
SAND = "#e3d2c3"     # terracota desaturado (barras neutras 2)

plt.rcParams.update({
    "font.family": "DejaVu Sans", "font.size": 10.5,
    "axes.edgecolor": INK, "axes.labelcolor": INK, "text.color": INK,
    "xtick.color": INK, "ytick.color": INK, "axes.linewidth": 0.9,
    "axes.grid": True, "grid.color": GRID, "grid.linewidth": 0.8,
    "figure.facecolor": "white", "axes.facecolor": "white", "savefig.facecolor": "white",
})


def load_data():
    """Carga el JSON del escenario sintético (modelo geo-core real)."""
    with open(DATA_PATH, encoding="utf-8") as fh:
        return json.load(fh)


def style(ax):
    """Quita el marco superior/derecho y afina los ticks."""
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.tick_params(length=3, width=0.8)


def save(fig, name):
    """Guarda en figuras/ a 200 dpi y cierra la figura."""
    fig.tight_layout()
    path = os.path.join(FIGDIR, name)
    fig.savefig(path, dpi=200, bbox_inches="tight")
    plt.close(fig)
    print("  escrita:", name)
