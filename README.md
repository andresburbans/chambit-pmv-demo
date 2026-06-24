<div align="center">

# Chambit · Modelo de búsqueda geocontextual **HIVE 1**

**Repositorio complementario de tesis — Ingeniería Topográfica**

*Demostración del fundamento matemático y de ingeniería del modelo de búsqueda
geocontextual que ordena la oferta y la demanda de servicios presenciales en
Santiago de Cali.*

🌐 **Prototipo desplegado:** **[chambit.co](https://chambit.co)**

</div>

> [!NOTE]
> **Metadatos de la tesis** *(por completar)*
> **Título:** *…* · **Autor:** *…* · **Director(a):** *…*
> **Programa:** Ingeniería Topográfica · **Universidad:** *…* · **Año:** 2026

---

Este repositorio acompaña al documento de tesis y existe para **mostrar, de forma
abierta y verificable, el núcleo del modelo** sin exponer la totalidad del código
fuente de la plataforma. Reúne el enlace al prototipo funcional desplegado y una
selección curada de los fragmentos algorítmicos que dan al modelo su fuerza
matemática y disciplinar. La numeración de ecuaciones y figuras que se cita
(ec. 16–21, etc.) corresponde al documento de tesis.

## Tabla de contenido

1. [El producto: Chambit](#1-el-producto-chambit)
2. [El modelo HIVE 1](#2-el-modelo-hive-1)
3. [Fundamento matemático y de ingeniería topográfica](#3-fundamento-matemático-y-de-ingeniería-topográfica)
4. [Validación experimental](#4-validación-experimental)
5. [Alcance de este repositorio](#5-alcance-de-este-repositorio)
6. [Reproducibilidad](#6-reproducibilidad)
7. [Cómo citar](#7-cómo-citar)
8. [Autoría y licencia](#8-autoría-y-licencia)

---

## 1. El producto: Chambit

Chambit es un **sistema de información geográfica servido como aplicación web
progresiva (PWA)** que conecta a clientes con expertos de servicios presenciales
(plomería, electricidad, cerrajería, carpintería, entre otros) bajo criterios
simultáneos de **pertinencia temática, confianza y localización**. El sistema
opera como un *decisor silencioso*: el usuario formula preguntas simples sobre
qué necesita y dónde, y recibe tarjetas ordenadas por afinidad, sin manipular
coordenadas, celdas, distribuciones ni pesos.

**Cómo probarlo** — el prototipo está desplegado en **[chambit.co](https://chambit.co)**
(versión 1.0). Los flujos **operativos y desplegados** son: registro y sesión
persistente, inscripción georreferenciada, descubrimiento proximal, el asistente
de exploración (**Buscar**) con el modelo HIVE 1, los resultados en **lista y
mapa** con localización anonimizada por centroide de celda, el perfil de experto,
y el ciclo de propuesta, negociación, cierre y calificación. El flujo de difusión
de solicitudes (**Solicitar**) opera con despliegue parcial y la telemetría de
ordenamiento se difirió de forma deliberada (ver §5).

## 2. El modelo HIVE 1

**HIVE 1** (*Hyper-local Intelligent Vicinity Engine*, versión 1.0) es el modelo
de búsqueda geocontextual de la tesis. Su premisa, propia de la ingeniería
topográfica, es que **en los servicios presenciales la posición no es un atributo
accesorio sino una restricción del mundo físico** que condiciona la viabilidad de
la conexión. La componente espacial se trata, por tanto, como variable
*estructurante*, y se integra con señales alfanuméricas de reputación, precio,
pertinencia temática y actividad.

Su arquitectura es un **embudo de decisión por etapas**:

```
   Posición continua (WGS84)
            │  discretización
            ▼
   ┌─────────────────────────┐
   │ 1. Rejilla hexagonal H3 │  vecindad → recorte del universo de búsqueda
   └─────────────────────────┘
            ▼
   ┌─────────────────────────┐
   │ 2. Compuerta            │  cobertura + foco temático (descarta lo inviable)
   └─────────────────────────┘
            ▼
   ┌─────────────────────────┐
   │ 3. Puntuación multiseñal│  combinación lineal interpretable  S(p|q)  (ec. 16)
   └─────────────────────────┘
            ▼
   ┌─────────────────────────┐
   │ 4. Ordenamiento         │  combinación lineal HOY · LTR preparado (ec. 19–21)
   └─────────────────────────┘
            ▼
   Lista y mapa para el usuario
```

La misma matemática de decisión sirve a los tres flujos (exploración del
catálogo, oportunidades del experto y ordenamiento de propuestas): **un núcleo,
varios flujos** (`scoreCandidate`, `scoreOpportunity`, `scoreProposal`).

## 3. Fundamento matemático y de ingeniería topográfica

El núcleo (`geo-core`) es un **módulo puro**: sin dependencias de interfaz ni de
infraestructura, determinista y verificable en frío. Esta sección enlaza cada
pieza matemática con su fragmento de código en [`/algoritmo`](./algoritmo).

### 3.1 Discretización del territorio — rejilla hexagonal jerárquica H3

El tránsito del **espacio continuo de coordenadas** al **espacio discreto** de la
rejilla hexagonal jerárquica H3 (Uber, 2018) es la decisión fundacional. De ella
derivan, a la vez, cinco funciones que en la literatura suelen aparecer
disociadas: la **eficiencia** de la consulta (la proximidad se vuelve pertenencia
indexable), la **isotropía** de las vecindades, la **métrica** de decisión, la
**unidad de agregación** territorial y la **anonimización posicional por capas**.
La posición se opera siempre sobre la celda y su centroide, **nunca sobre la
coordenada exacta**: la privacidad posicional es una propiedad de la estructura
del dato y no de una política de acceso.

### 3.2 Fricción espacial — decaimiento log-logístico · ec. (16)

La fricción de la distancia se modela con un núcleo log-logístico de **cola
pesada**, coherente con la Primera Ley de la Geografía (Tobler, 1970) y la teoría
de accesibilidad (Geurs & van Wee, 2004):

$$
f_{esp}(d) = \frac{1}{1 + (d/\alpha)^{\beta}}, \qquad f(0)=1,\; f(\alpha)=0.5,\; f(4\alpha)\approx 0.06
$$

La cola pesada mantiene competitivos a los candidatos lejanos cuyas demás señales
compensan la distancia. 📄 **Código:** [`algoritmo/friccion-espacial.ts`](./algoritmo/friccion-espacial.ts)

### 3.3 Reputación bayesiana — posterior Dirichlet–multinomial · ec. (17)

La reputación se trata como **distribución y no como promedio**. Con los conteos
ordinales por estrella $\mathbf{n}$ y un prior de Dirichlet $\boldsymbol{\alpha}$,
el posterior es $\text{Dir}(\boldsymbol{\alpha}+\mathbf{n})$, del que se derivan
en forma cerrada la calificación esperada y su varianza (Jøsang & Haller, 2007):

$$
\mathbb{E}[R_p]=\sum_{k} k\cdot\frac{n_k+\alpha_k}{N+\alpha_0}, \qquad
\text{Var}[R_p]=\sum_{k} k^2\cdot\frac{n_k+\alpha_k}{N+\alpha_0}-\mathbb{E}[R_p]^2
$$

La esperanza alimenta la señal de reputación; la varianza **separa el nivel del
riesgo** (penaliza a quien tiene notas polarizadas aunque su media sea alta). El
arranque en frío se resuelve con una cadena de priors con retroceso jerárquico y
la presentación honesta como «Nuevo» del candidato sin evidencia.
📄 **Código:** [`algoritmo/reputacion-dirichlet.ts`](./algoritmo/reputacion-dirichlet.ts)

### 3.4 Escala espacial aprendida — kernel de movilidad · ec. (18)

La escala $\alpha$ del decaimiento **deja de ser un supuesto** y se estima del
comportamiento real: cada emparejamiento a distancia $d$ (aceptado o no) es una
observación, y ajustar la log-logística equivale a una **regresión logística
sobre $\ln d$**:

$$
\text{logit}\,P(y=1\mid d) = \beta\ln\alpha - \beta\ln d
$$

Se resuelve por máxima verosimilitud (Newton–Raphson / IRLS, sin librerías) con
**contracción jerárquica** hacia el global cuando la muestra es escasa: con cero
datos el modelo degrada *exactamente* al comportamiento de diseño ($\alpha=2.5$
km, $\beta=2$) y mejora de forma monótona con la evidencia.
📄 **Código:** [`algoritmo/kernel-movilidad.ts`](./algoritmo/kernel-movilidad.ts)

### 3.5 Puntuación multiseñal — combinación lineal interpretable · ec. (16) / (19)

Sobre los candidatos factibles se evalúa una combinación lineal ponderada con
tratamiento explícito de la incertidumbre por término (Malczewski & Rinner, 2015):

$$
S(p\mid q)= w_{1}f_{esp} + w_{2}f_{rep} - w_{3}f_{disp} + w_{4}f_{lex} + w_{5}f_{tem} + w_{6}f_{act} + w_{7}f_{fre} + w_{8}f_{eco} + w_{9}f_{cal}
$$

La **urgencia no es un término aditivo sino un selector del perfil de pesos**: una
necesidad urgente eleva el peso de la distancia (de 0.28 a 0.35) y relaja la
reputación y el precio. Cada posición del orden es **descomponible señal por
señal** (interpretabilidad por construcción), y por cada candidato se materializa
el vector de características $\Phi(q,p)\in\mathbb{R}^{14}$ que una futura etapa de
aprendizaje de ordenamiento (LambdaMART, ec. 19–21) consumirá sin rediseñar la
captura. 📄 **Código:** [`algoritmo/puntuacion.ts`](./algoritmo/puntuacion.ts)

## 4. Validación experimental

El modelo se validó sobre un **escenario sintético reproducible de Cali**
(semilla fija, ejecutando la librería real, sin reimplementarla), además de una
verificación formal de 64 propiedades en 9 familias. Métricas de cabecera
(Tabla 6 de la tesis):

| Métrica | Resultado | Detalle |
| :--- | :--- | :--- |
| Candidato dominante en 1.ª posición (corrección) | **100 %** | 200 / 200 consultas |
| Candidato dominante en 1.ª posición (robustez) | **97.8 %** | 1174 / 1200 · 30 semillas · densidad doble |
| Divergencia del 1.er resultado vs. distancia pura | **46.1 %** | IC95 ±3.3 · 30 semillas |
| Correlación de rangos con la sola distancia | **0.77** | IC95 ±0.004 |
| Señal más estructurante (ablación) | **Distancia** | importancia 0.31 · reordena el 1.º en el 85.8 % |
| Señales con contribución no nula (ablación) | **7 / 7** | ninguna es peso muerto |
| Candidatos examinados (catálogo 200 → 20 000) | **≈ 160** | constante · < 0.5 ms por consulta |

La distancia domina **aproximadamente un orden de magnitud** por encima de
cualquier señal alfanumérica, confirmando la hipótesis geocontextual; el resto de
señales aporta la discriminación fina entre candidatos espacialmente comparables.

## 5. Alcance de este repositorio

> [!IMPORTANT]
> Este repositorio **no contiene el código fuente completo** de Chambit. Es una
> selección curada con fines académicos y de divulgación.

**Qué incluye** — los fragmentos del **núcleo matemático puro** (`geo-core`):
fricción espacial, reputación Dirichlet, kernel de movilidad aprendido y la
función de puntuación multiseñal, en [`/algoritmo`](./algoritmo).

**Qué no incluye, y por qué** — la aplicación PWA, el modelo de datos, las reglas
de seguridad, la autenticación, la capa de persistencia y la lógica de negocio se
mantienen privados por motivos de **seguridad, privacidad de los usuarios y
propiedad intelectual**. Los fragmentos publicados son funciones puras que
ilustran la matemática sin revelar la infraestructura ni datos reales.

## 6. Reproducibilidad

Los fragmentos de [`/algoritmo`](./algoritmo) son **TypeScript puro y
determinista**: dadas las mismas entradas devuelven siempre el mismo resultado,
sin estado externo ni acceso a red. La validación de la tesis se ejecutó con un
**generador pseudoaleatorio de semilla fija** sobre esta misma librería, de modo
que lo medido es el comportamiento real del modelo y no una aproximación.

## 7. Cómo citar

```bibtex
@thesis{chambit_hive1_2026,
  author = {Apellido, Nombre},
  title  = {{Título de la tesis}},
  school = {Universidad},
  year   = {2026},
  type   = {Trabajo de grado de Ingeniería Topográfica},
  note   = {Prototipo: https://chambit.co · Código: https://github.com/andresburbans/chambit-pmv-demo}
}
```

## 8. Autoría y licencia

Autoría del modelo HIVE 1, su implementación y este material: **[autor de la
tesis]**, 2026. El contenido se publica con fines académicos. Salvo indicación en
contrario, los fragmentos de código se ofrecen para **lectura y verificación
académica**; consúltese al autor para cualquier uso o redistribución.

<div align="center">
<sub>Ingeniería Topográfica · Santiago de Cali · 2026</sub>
</div>
