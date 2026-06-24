# -*- coding: utf-8 -*-
"""
Regenera TODAS las figuras de la sección 7 (Resultados) a partir del JSON del
escenario sintético (figuras/_synth_data.json) y de los agregados de la encuesta.

Flujo completo (desde la raíz del repo):
    1) npx vite build -c vite.synth.config.ts && node .tmp-synth/synth.cjs
       → corre el MODELO REAL (src/lib/geo-core) y vuelca figuras/_synth_data.json
    2) python tesis/redaccion-tesis/python_resultados/run_all.py
       → escribe los PNG en tesis/redaccion-tesis/figuras/

Salidas: fig_6_1_…, fig_6_2_…, fig_6_3_…, fig_6_4_…, fig_6_5_…, fig_6_6_…, fig_6_7_…
"""
import importlib

MODULES = [
    "fig_encuesta",          # 6.1 y 6.2
    "fig_anatomia",          # 6.3
    "fig_comparacion",       # 6.4
    "fig_comportamiento",    # 6.5
    "fig_escalamiento",      # 6.6
    "fig_robustez_ablacion", # 6.7
]


def main():
    for name in MODULES:
        print("[%s]" % name)
        importlib.import_module(name).main()
    print("\nOK — figuras regeneradas en ../figuras/")


if __name__ == "__main__":
    main()
