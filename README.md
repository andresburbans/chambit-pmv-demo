# Chambit

Chambit es una aplicación web para encontrar y contratar a la persona indicada cuando hace falta un servicio a domicilio, sea un plomero, un electricista, un cerrajero o un carpintero. Corre en el navegador y se instala en el teléfono como cualquier otra aplicación, sin pasar por una tienda. Por dentro es exigente, pero de cara al usuario hace una sola cosa: uno dice qué necesita y desde dónde, y recibe una lista corta de expertos cercanos, confiables y disponibles, ordenada por qué tan bien encaja cada uno con esa necesidad.

Está en línea y operando en [chambit.co](https://chambit.co).

Lo difícil está en esa lista corta. Cuando hay decenas de candidatos repartidos por la ciudad, decidir quién va primero no es ordenar por distancia y ya. Hay que sopesar la cercanía contra la reputación, el precio contra el presupuesto y la urgencia contra la agenda, y hacerlo sin pedirle al usuario que entienda nada de eso. Ese motor de decisión es el centro del proyecto y se llama HIVE 1.

## De la tesis a la aplicación

Chambit no nació como una idea de negocio sino como un trabajo de grado en Ingeniería Topográfica. La pregunta que lo originó fue cómo diseñar un sistema de información geográfica que conecte de forma confiable la oferta y la demanda de servicios presenciales en Santiago de Cali, superando tres barreras concretas (la información dispersa, la desconfianza entre desconocidos y la fricción de la distancia).

El punto de partida es una idea propia de la topografía. En los servicios que se prestan en persona la ubicación no es un atributo más del perfil, es una restricción del mundo físico. Un buen plomero al otro lado de la ciudad, sin cobertura en la zona, no sirve por muchas reseñas que tenga. Esa intuición, la misma que aplica cualquiera cuando busca a alguien "por el barrio", es la que el modelo vuelve matemática: la posición deja de ser un filtro accesorio y pasa a ser la variable que estructura toda la búsqueda.

Este repositorio es la parte abierta de ese trabajo. No está la aplicación completa (la interfaz, la base de datos, las reglas de seguridad y la lógica de negocio se mantienen privadas), sino el núcleo del modelo: los fragmentos de código donde vive la lógica geográfica y estadística, con la explicación de por qué están hechos así. Sirve como anexo verificable de la tesis y como referencia para quien quiera entender o reutilizar el modelo.

## El modelo HIVE 1

HIVE 1 (de *Hyper-local Intelligent Vicinity Engine*) es el modelo de búsqueda geocontextual de la tesis, en su versión 1.0. El nombre viene de la colmena, una estructura hexagonal que es a la vez almacén, centro de información y sistema de exploración del territorio, las mismas funciones que el modelo ejerce sobre la rejilla hexagonal H3.

Por dentro funciona como un embudo. En vez de evaluar el catálogo entero, descarta por etapas hasta quedarse con los pocos candidatos que importan.

```
   Posición (WGS84)
        │  se discretiza a la rejilla H3
        ▼
   1. Vecindad      recorta el universo a las celdas cercanas
        ▼
   2. Compuerta     descarta lo inviable (cobertura y tema)
        ▼
   3. Puntuación    ordena lo viable con varias señales   (ec. 16)
        ▼
   Lista y mapa
```

La misma matemática sirve a los tres flujos de la plataforma (la exploración del catálogo, las oportunidades que ve el experto y el orden de las propuestas que recibe el cliente), cambiando solo la fuente de candidatos. Un núcleo, varios flujos.

El resto de este documento recorre cómo está construido ese embudo: primero la indexación del territorio, luego la matemática del orden y, al final, cómo se validó.

## Cómo se ordena el territorio

La primera decisión, y la más de fondo, es pasar del espacio continuo de coordenadas al espacio discreto de la rejilla hexagonal jerárquica H3 (Sahr et al., 2003; Uber, 2018). En lugar de guardar la coordenada exacta de cada quien, el sistema guarda la celda hexagonal que la contiene. De esa única decisión salen cinco cosas a la vez: un índice de búsqueda (la cercanía se vuelve pertenencia a una celda), una métrica de distancia (contar celdas entre dos puntos), una unidad para agregar datos en el tablero, una manera de anonimizar la posición, y la isotropía del hexágono (sus seis vecinos quedan a la misma distancia, cosa que la cuadrícula no logra por culpa de sus diagonales).

El sistema no guarda una sola celda sino una pirámide, la misma posición a varias resoluciones, cada una con su uso y su nivel de privacidad.

| Resolución | Arista aprox. | Para qué | Privacidad |
| :--- | :--- | :--- | :--- |
| res7 | 1.2 km | Búsqueda y filtrado regional | Pública |
| res8 | 460 m | Emparejamiento anonimizado | Pública |
| res9 | 174 m | Distancia fina y ranking | Pública |
| res12 | 9 m | Navegación precisa | Privada, no sale del documento privado |

Indexar tiene cuatro movimientos. Se discretiza el punto con `latLngToCell` en cada evento (no se recicla el índice del perfil, porque el usuario pudo moverse). Se sube por la jerarquía con `cellToParent` cuando hace falta la celda de búsqueda a partir de la de ranking, sin volver a geocodificar. Se expande la vecindad con `gridDisk` para mirar solo las celdas alrededor de la consulta antes de puntuar, de modo que el costo dependa de la densidad local y no del tamaño del catálogo. Y la cobertura se resuelve al revés: como un experto declara un radio variable (de un kilómetro a nacional), al publicar se precalculan las celdas que su radio cubre, y el cliente solo pregunta si la suya está entre ellas con una única lectura indexada. El código está en [`algoritmo/indexacion-h3.ts`](./algoritmo/indexacion-h3.ts).

Discretizar pierde el punto exacto a propósito, pero la indexación sigue siendo reversible en lo que cuenta. De la celda se recuperan su centroide (el punto que se dibuja en el mapa) y su polígono (lo que pinta el tablero), sin tocar nunca la posición original. Esa reversibilidad es además el puente hacia la cartografía oficial: el centroide está en WGS84 (EPSG:4326) y se puede llevar a MAGNA-SIRGAS (EPSG:4686) con los parámetros del IGAC, un corrimiento que a la escala de estas celdas queda por debajo del tamaño de la propia celda.

## La matemática del ordenamiento

Una vez filtrados los candidatos viables, cada uno recibe un puntaje. No es una caja negra sino una suma ponderada de señales, donde cada término tiene su justificación y se puede auditar por separado (Malczewski & Rinner, 2015).

$$
S(p\mid q)= w_{1}f_{esp} + w_{2}f_{rep} - w_{3}f_{disp} + w_{4}f_{lex} + w_{5}f_{tem} + w_{6}f_{act} + w_{7}f_{fre} + w_{8}f_{eco} + w_{9}f_{cal}
$$

La señal de más peso es la distancia, modelada con un decaimiento log-logístico de cola pesada, fiel a la fricción urbana y a la primera ley de la geografía de Tobler (1970). La cola pesada deja competir a un candidato lejano si lo demás lo respalda, cosa que un decaimiento gaussiano cortaría en seco. El código está en [`friccion-espacial.ts`](./algoritmo/friccion-espacial.ts).

$$
f_{esp}(d) = \frac{1}{1 + (d/\alpha)^{\beta}}
$$

La reputación no es el promedio de estrellas sino una distribución. Con los conteos por estrella y un previo de Dirichlet, el posterior entrega la calificación esperada y su varianza en forma cerrada (Jøsang & Haller, 2007), y esa varianza penaliza a quien tiene notas polarizadas aunque su promedio sea alto. Quien no tiene historial aparece como "Nuevo" y su nota converge a la del mercado a medida que llega evidencia, sin certezas prematuras. El código está en [`reputacion-dirichlet.ts`](./algoritmo/reputacion-dirichlet.ts).

$$
\mathbb{E}[R_p]=\sum_{k} k\cdot\frac{n_k+\alpha_k}{N+\alpha_0}, \qquad
\text{Var}[R_p]=\sum_{k} k^2\cdot\frac{n_k+\alpha_k}{N+\alpha_0}-\mathbb{E}[R_p]^2
$$

La escala $\alpha$ de la distancia no es un número fijo puesto a mano. Se aprende del comportamiento real: cada emparejamiento aceptado o rechazado a una distancia dada es un dato, y ajustar la curva equivale a una regresión logística sobre el logaritmo de la distancia, resuelta por máxima verosimilitud. Con pocos datos el modelo se encoge hacia un valor global, así que arranca exactamente en su comportamiento de diseño ($\alpha = 2.5$ km, $\beta = 2$) y mejora a medida que hay evidencia. El código está en [`kernel-movilidad.ts`](./algoritmo/kernel-movilidad.ts).

Hay un detalle de diseño que vale la pena señalar. La urgencia no suma un término al puntaje, cambia el perfil de pesos. Una necesidad urgente sube el peso de la distancia (de 0.28 a 0.35) y baja el de la reputación y el precio, porque la urgencia no altera los hechos del candidato sino la importancia relativa de cada hecho. Y por cada candidato que evalúa, el modelo guarda un vector de catorce características que una etapa futura de aprendizaje de ordenamiento podrá consumir sin rehacer nada. El código está en [`puntuacion.ts`](./algoritmo/puntuacion.ts).

## Cómo se puso a prueba

Como la plataforma todavía no tiene tráfico real, el modelo se validó sobre un escenario sintético y reproducible de Cali, ejecutando la misma librería que corre en la app (no una reimplementación) con una semilla fija, y se le verificaron sesenta y cuatro propiedades formales en frío. Los números de cabecera son estos.

| Métrica | Resultado | Detalle |
| :--- | :--- | :--- |
| Candidato correcto en primer lugar | 100 % | 200 de 200 consultas |
| Lo mismo, bajo 30 poblaciones distintas | 97.8 % | 1174 de 1200 consultas |
| Cuánto cambia el primer resultado frente a ordenar por sola distancia | 46.1 % | IC95 ±3.3 |
| Correlación con la sola distancia | 0.77 | sensible a la cercanía, sin reducirse a ella |
| Señal más decisiva (ablación) | Distancia | aproximadamente un orden de magnitud sobre las demás |
| Candidatos revisados al pasar de 200 a 20 000 expertos | ~160 | constante, menos de 0.5 ms por consulta |

En corto: el modelo recupera la respuesta correcta, mejora de forma clara y estable el viejo "ordenar por cercanía", reparte la decisión entre todas sus señales con la distancia al frente, y su costo no crece con el catálogo sino con la densidad local.

Los datos y el código que producen estas cifras (la población sintética, las métricas crudas que salen del modelo y los agregados de la encuesta) están en [`resultados/`](./resultados), con las instrucciones para regenerar cada figura.

## Qué hay en este repositorio

En [`algoritmo/`](./algoritmo) están los fragmentos puros del núcleo, cada uno atado a su ecuación en la tesis.

- [`indexacion-h3.ts`](./algoritmo/indexacion-h3.ts), la pirámide H3, la indexación, la vecindad y la reversibilidad.
- [`friccion-espacial.ts`](./algoritmo/friccion-espacial.ts), la fricción de la distancia (ec. 16).
- [`reputacion-dirichlet.ts`](./algoritmo/reputacion-dirichlet.ts), la reputación bayesiana (ec. 17).
- [`kernel-movilidad.ts`](./algoritmo/kernel-movilidad.ts), la escala espacial aprendida (ec. 18).
- [`puntuacion.ts`](./algoritmo/puntuacion.ts), la combinación de señales y el vector de características (ec. 16 y 19).

Son funciones puras y deterministas: con las mismas entradas dan siempre la misma salida, sin estado externo ni red. Lo que no está, y es a propósito, es el resto de la aplicación (interfaz, datos, autenticación, seguridad), por privacidad de los usuarios y por tratarse de un producto en operación.

En [`resultados/`](./resultados) están los datos y el código Python que generan las figuras de la sección 7 (la población sintética, las métricas que salen del modelo y los agregados de la encuesta). De la encuesta solo se publican los promedios; las respuestas individuales se quedan fuera por privacidad.

## Autoría y cómo citar

Trabajo de grado en Ingeniería Topográfica, *[universidad]*, 2026. Autor: *[nombre]*. Director(a): *[nombre]*. Prototipo en [chambit.co](https://chambit.co).

```bibtex
@thesis{chambit_hive1_2026,
  author = {Burbano Suarez, Andrés Felipe and Quenán Ortiz, Liliana Marisol},
  title  = {{Desarrollo de un Sistema de Información Geográfico para conectar usuarios con prestadores de servicios domiciliarios y profesionales en Cali}},
  school = {Universidad del Valle},
  year   = {2026},
  type   = {Trabajo de grado en modalidad investigación e innovación (Ingeniería Topográfica)},
  url    = {https://chambit.co},
  note   = {Código fuente: \url{https://github.com/andresburbans/chambit-pmv-demo}}
}
```

El material se comparte con fines académicos. Para cualquier uso o redistribución, conviene escribir al autor.
