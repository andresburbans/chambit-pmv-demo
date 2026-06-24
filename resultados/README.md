# Resultados y datos

Esta carpeta reúne los datos y el código Python que producen las figuras de resultados de la tesis (sección 7). La intención es que las cifras del modelo se puedan rastrear hasta su origen: no se inventaron ni se ajustaron a mano, salieron de ejecutar el modelo real sobre una población sintética y de los agregados de la encuesta.

## De dónde salen las cifras

Hay dos fuentes y conviene no mezclarlas.

El escenario sintético alimenta casi todas las figuras (la comparación contra la distancia pura, el comportamiento, el escalamiento, la robustez y la ablación). Se generó ejecutando el mismo núcleo `geo-core` que corre en la app (no una reimplementación) sobre una población de expertos sintéticos de Cali, con un generador pseudoaleatorio de semilla fija para que cualquiera obtenga los mismos números.

```
synth-scenario.ts   →   figuras/_synth_data.json   →   python_resultados/*.py   →   *.png
 (corre geo-core real)     (métricas crudas)            (este folder)              (figuras de la tesis)
```

El generador en TypeScript vive en el repositorio privado (importa el modelo completo), pero su salida, `figuras/_synth_data.json`, está incluida aquí para que las figuras se puedan regenerar sin él.

La encuesta alimenta solo las dos primeras figuras (viabilidad, prioridades y necesidad espacial latente). De ella se publican únicamente los agregados, los mismos promedios que la sección 7.1 ya declara. Ver la nota de privacidad al final.

## Cómo regenerar las figuras

Con Python 3.12 y matplotlib:

```bash
cd python_resultados
python run_all.py        # escribe los PNG en ../figuras/
```

`fig_encuesta.py` corre por su cuenta (sus agregados están en el propio script). Las demás leen `figuras/_synth_data.json`.

## Qué hay aquí

- `python_resultados/`, los scripts que dibujan cada figura (`_estilo.py` es la paleta común y `run_all.py` las genera todas de una pasada).
- `python_resultados/datos_sinteticos/`, una muestra inspeccionable de la población sintética (250 expertos y 60 consultas) en CSV y JSON, para ver la forma de los datos sin leer código.
- `figuras/_synth_data.json`, las métricas crudas de los seis experimentos tal como las emite el modelo real.
- `encuesta/metricas_encuesta.csv`, los agregados de la encuesta (promedio por requisito, en escala de 1 a 5).

## Los seis experimentos, en corto

Todas las cifras salen de `figuras/_synth_data.json`, que a su vez sale de correr el modelo real.

| Experimento | Qué mide | Resultado |
| :--- | :--- | :--- |
| 1. Corrección | Un candidato dominante sembrado debe ir primero | 100 % (200 de 200) |
| 2. Contra distancia pura | El orden del modelo frente a ordenar por sola distancia | difiere en 52,5 %, correlación 0,76 |
| 3. Comportamiento | Arranque en frío, densidad y urgencia | converge sin saltos; la escala va de 1,75 a 4,5 km; el peso de la distancia sube de 0,28 a 0,35 |
| 4. Escalamiento | Costo de la consulta al crecer el catálogo | ~160 candidatos y menos de 0,5 ms, constante de 200 a 20 000 expertos |
| 5. Robustez | Lo mismo sobre 30 poblaciones (1200 consultas) | divergencia 46,1 % (IC95 ±3,3), correlación 0,771 |
| 6. Ablación | Apagar una señal a la vez | la distancia domina (importancia 0,31, ~10× sobre las demás); las 7 señales cuentan |

Una salvedad de honestidad que conviene tener presente: esta validación es de diseño, demuestra que el modelo recupera la solución correcta y se comporta como promete, pero no mide satisfacción de usuarios reales. Eso requiere la telemetría que se difirió a propósito.

## Privacidad de la encuesta

Esta carpeta no incluye las respuestas individuales de la encuesta. Los microdatos crudos (que combinan marca temporal, género, edad, barrio de residencia y profesión, suficientes para reidentificar a una persona) se mantienen fuera del repositorio público por respeto a quienes respondieron. Lo único que se publica son los promedios por pregunta (`encuesta/metricas_encuesta.csv`), que no permiten rastrear a ningún individuo y son los que sustentan las figuras de la sección 7.1.
