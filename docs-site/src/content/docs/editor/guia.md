---
title: Guía do editor
description: Como construír e probar unha árbore de progresión co editor visual de Yggdrasil Forge, sen tocar código.
sidebar:
  order: 1
---

**Para quen abre o editor e quere construír un skill tree sen necesariamente coñecer o código.** E abrilo é un clic: [**o editor vivo**](https://fraga-labs.github.io/yggdrasil-forge/app/) corre enteiro no navegador, sen conta e sen instalar nada. Estado do editor: 1.x — o Studio publicado co 1.0.

## Que é o editor

Yggdrasil Forge é un editor visual de **grafos de progresión**: skill trees, currículos educativos, tech trees, árbores de quests… Calquera estrutura de «para chegar a B precisas A primeiro» pódese modelar coa mesma ferramenta.

O editor é unha **app web** que vive en `examples/editor`:

```bash
corepack pnpm --filter @yggdrasil-forge-examples/editor run dev
```

Ao arrancar carga a árbore de exemplo do **panadeiro**. Para abrir outra, usa o menú **Ficheiro** (ver máis abaixo) ou pega un JSON no panel **Código**.

### Dous modos: Autoría e Proba

Na esquina superior dereita hai dous botóns: **Autoría** e **Proba**.

- **Autoría**: estás **editando** a árbore. Mover nodos, cambiar propiedades, conectar, tematizar…
- **Proba**: estás **xogando** a árbore como o faría o usuario final: dás recursos, desbloqueas nodos, ves como se enchen os estados. **Os cambios de Proba non se gardan no documento** — son unha sesión de simulación, e o botón *Reiniciar* volve ao principio.

Comeza en Autoría. Cambia a Proba para ver como se sente. Volve a Autoría para axustar. A disposición dos paneis consérvase ao cambiar de modo.

### Supervivencia e instalación

O documento **autogárdase** (con ~1 s de demora tras cada cambio): se pechas ou recargas sen exportar, ao volver aparece un banner — *«Recuperouse traballo sen exportar (data) — Continuar / Descartar»*. *Novo* empeza de cero (sen recuperación); **Exportar segue sendo o gardado real**.

![O banner de recuperación tras recargar: Recuperouse traballo sen exportar, con Continuar e Descartar](../../../assets/capturas/13-recuperacion.png)
![O menú Ficheiro coas entradas de exportación: JSON, imaxe SVG e imaxe PNG](../../../assets/capturas/12-exportar.png)

E o editor é unha **PWA**: funciona enteiro sen conexión e Chrome/Edge ofrecen instalalo como app de escritorio.

## Os paneis

![O editor completo co panadeiro: Estrutura á esquerda, Canvas no centro, Inspector á dereita, Problemas abaixo e a barra de estado](../../../assets/capturas/01-editor.png)

A pantalla divídese en paneis redimensionables. Podes pechalos coa ✕ da pestana e reabrilos desde o menú **Paneis** da barra superior, que tamén ten **Restaurar disposición**. A disposición gárdase entre sesións.

| Panel | Onde | Para que |
|---|---|---|
| **Estrutura** | esquerda | Lista de grupos e nodos. **Clic nun nodo = seleccionalo e centrar a vista nel.** |
| **Canvas** | centro | O lenzo: nodos, arestas, ferramentas de creación, Dispor, e o toggle **grafo / tarxetas**. |
| **Problemas** | centro abaixo | Os avisos da «conciencia» do editor. Clic nun aviso = ir ao nodo afectado. |
| **Inspector** | dereita | As propiedades do nodo seleccionado (ou da árbore, se non hai selección). |
| **Tema** | dereita (pestana) | O tema visual do documento: presets, recheos por estado, rexións, fondo. |
| **Código** | dereita (pestana) | O JSON do documento en vivo, editable e validable. |
| **Proba** | dereita (só en Proba) | Recursos da sesión, desbloquear/retirar rangos do nodo seleccionado, reiniciar. |

A **barra de estado** de abaixo mostra nodos, arestas, modo e tamaño do mundo (`World W×H`).

## A barra superior

- **Ficheiro** → *Novo*, *Importar* (un `.json` do formato de documento), *Exportar JSON*, *Exportar imaxe SVG* e *PNG* (só en vista grafo).
- **Paneis** → reabrir paneis pechados, restaurar disposición.
- **↶ ↷** → desfacer / refacer (tamén Ctrl+Z / Ctrl+Y).
- **− +** → afastar / achegar o canvas.
- **☀ / 🌙** → tema claro/escuro do *chrome* do editor (non do documento — ver [Theming](../../theming/)).
- **Autoría / Proba** → o modo.

![O menú Ficheiro aberto: Novo, Importar JSON, Exportar JSON e Exportar imaxe](../../../assets/capturas/02-ficheiro.png)

## O canvas

### Ferramentas (barra flotante do canvas, só en Autoría + vista grafo)

| Ferramenta | Atallo | Que fai |
|---|---|---|
| **Seleccionar** | `V` | Clic selecciona, Shift+clic engade/quita, Shift+arrastre no baleiro fai un rectángulo de selección, arrastrar un nodo móveo. |
| **Engadir nodo** | `N` | Clic no baleiro crea un nodo novo nese punto. |
| **Conectar** | `C` | Arrastra dun nodo a outro para crear unha aresta. Coa opción *«Ao conectar, o destino pasa a requirir a orixe»* activa (por defecto), a aresta tamén engade o prerrequisito; desmárcaa para unha conexión só visual. |

`Supr` elimina a selección. `Escape` cancela a interacción en curso sen tocar o documento.

![Coa ferramenta Engadir activa, un clic no baleiro crea un nodo novo que nace seleccionado](../../../assets/capturas/03-engadir.png)

![Coa ferramenta Conectar, a liña fantasma descontinua segue o rato desde o nodo de orixe ata onde vaias soltar](../../../assets/capturas/04-conexion.png)

### Mover, pan e zoom

- **Arrastra un nodo** → móvese (con varios seleccionados, móvense todos xuntos, e un só *desfacer* os devolve).
- **Arrastra o fondo** → pan. **Roda do rato** → zoom cara ao cursor. Os botóns **− +** da barra superior fan o mesmo.
- Nas árbores **grandes** (40 nodos ou máis) aparece un **minimapa** na esquina inferior esquerda: amosa a árbore enteira e **premendo nel vas alí**. Cando hai zoom aparece tamén o rectángulo do que estás a ver; se cabe todo na pantalla non o pinta, porque coincidiría co marco e non diría nada. Nas pequenas non sae, porque a árbore cabe na pantalla e só quitaría sitio.
- **Estrutura → clic nun nodo** → a vista céntrase nel (útil en árbores grandes).

### Dispor — colocar todos os nodos automaticamente

O botón **✥ Dispor** abre un menú con cinco algoritmos; cada un leva a súa condición de uso debaixo:

| Algoritmo | Úsao cando… |
|---|---|
| **Radial** | queres aneis por profundidade desde a raíz. |
| **Árbore (por niveis)** | cada nodo ten **un só pai**; con varios pais crúzanse arestas. |
| **Capas (para DAGs)** | hai nodos con **varios pais** ou requisitos múltiples (o caso habitual nas árbores educativas). |
| **Radial por grupos** | tes grupos definidos; os nodos soltos van a un oco propio. |
| **Constelación** | o grafo é solto, sen xerarquía clara. |

![O menú Dispor aberto cos cinco algoritmos e a condición de uso de cada un debaixo](../../../assets/capturas/08-dispor.png)

Dispor **coce** as posicións no documento (non é un layout «vivo»): despois podes retocar arrastrando, e **un só desfacer** devolve todas as posicións e o encadre anteriores. Se importas unha árbore sen posicións, o canvas ofréceche os algoritmos nunha barra-convite. Máis detalle en [Layouts](../../layouts/).

### Vista grafo / tarxetas

O toggle da esquina cambia entre o **grafo** (SVG clásico) e as **tarxetas**: cada grupo é unha tarxeta e cada nodo membro unha fila con icona, etiqueta e rango. As tarxetas son unha vista estrutural (seleccionar e borrar funcionan; mover e conectar son do grafo).

![A vista de tarxetas: cada grupo unha tarxeta, cada nodo unha fila con icona, etiqueta e rango](../../../assets/capturas/10-tarxetas.png)

## Inspector — editar propiedades

Con **un** nodo seleccionado, o Inspector mostra os seus campos en dous bloques: **Básico** (visible) e **Avanzado** (pregado). Sen selección, mostra os campos da **árbore** (etiqueta, descrición, autor, versión) e o editor de **Recursos**.

![O Inspector cun nodo seleccionado: bloques Básico e Avanzado cos campos de identidade, aparencia e lóxica](../../../assets/capturas/05-inspector.png)

### Campos do nodo

- **Identidade**: `id` (só lectura), **Tipo** (`small`, `notable`, `keystone`, `mastery`, `ascendancy`, `root`, `cluster`, `gateway`, `milestone`, `subtree_anchor`, `custom`), **Etiqueta** e **Descrición** (localizables; edítase a locale `gl` e as outras consérvanse).
- **Aparencia**: **Cor**, **Icona** (un emoji, unha URL de imaxe ou un id dos sets incluídos: `logic-*`, `norse-*` e `forge-*` — co botón **Escoller icona** ábrese o selector visual), **Zoom da imaxe** (só para iconas de imaxe), **Forma** (`circle`, `square`, `diamond`, `hexagon`, `octagon`) e **Tamaño**.
- **Lóxica**: **Rangos** (`maxTier`), **Custo** (pares recurso/cantidade), **Custo por rango**, **Efectos**, **Prerrequisitos** e **Exclusións**.

![O selector visual de iconas co buscador filtrando o set lóxico](../../../assets/capturas/06-iconas.png)

### Prerrequisitos

O editor lese coma unha frase: *«Este nodo desbloquéase cando [Todas / Algunha / Ningunha] destas condicións se cumpren»*, seguida da lista de condicións (nodo desbloqueado, recurso mínimo, reconto de tags…). Crear un ciclo `A → B → A` dispara un aviso en Problemas.

### Efectos

Cada efecto ten un mini-formulario segundo o tipo. O selector de «engadir efecto» só ofrece os tipos que o runtime **sabe aplicar** (`modify_resource`, `modify_node_state`, `set_node_visibility`, `unlock_node`, `set_progress`, `trigger_event`): a «boca» do editor nunca propón o que a súa «conciencia» non pode executar. Os efectos aniñados (`composite`, `conditional`) móstranse pero edítanse desde o panel Código.

### Granularidade do desfacer

- **Texto, número, cor**: o cambio confírmase ao **perder o foco** (Tab, Enter ou clic fóra). Escribir «Pan básico» é **unha** entrada de historial, non dez.
- **Selectores e caixas**: confírmanse ao instante.
- `Escape` dentro dun campo descarta o que estabas escribindo.

## Tema — o aspecto do documento

A pestana **Tema** actúa sobre a árbore enteira e gárdase **co documento** (viaxa no JSON, ten desfacer):

- **Preset**: cinco fichas — *Tintado*, *Neutro*, *Pergamiño*, *Néon*, *Bosque*. Un clic aplica o spec completo.
- **Recheo por estado**: a cor de fondo dos nodos segundo `locked / unlockable / unlocked / maxed / inProgress`. A cor propia dun nodo prevalece.
- **Cor do texto**: control directo, ou *Automático* (o editor escolle segundo o tema do chrome).
- **Rexións**: tintes por tag (crear, colorear, asignar/quitar da selección).
- **Fondo**: URL dunha imaxe de fondo do canvas.

![A pestana Tema: presets con nome, recheos por estado, cor do texto, rexións e fondo](../../../assets/capturas/07-tema.png)

Máis en [Theming](../../theming/).

## Código — o JSON en vivo

A pestana **Código** mostra o documento serializado. Mentres non tocas o texto está **sincronizado** (reflicte cada cambio do canvas). En canto escribes pasa a **borrador**: a sincronización pausa e aparece o banner **Validar · Aplicar · Descartar**. *Validar* corre exactamente a mesma validación ca Importar e marca a liña do erro; *Aplicar* substitúe o documento enteiro como **un único paso de desfacer**. As cores por sección (nodos, arestas, recursos…) axudan a orientarse. Aquí é onde pegas unha árbore xerada por unha IA — ver [A vía do dato](../../via-do-dato/).

![O panel Código co JSON en vivo, a lenda de cores por sección e as franxas laterais](../../../assets/capturas/11-codigo.png)

## Problemas — a voz da conciencia

Os **validadores brandos** avisan sen bloquear: exclusións asimétricas, ciclos de prerrequisitos, nodos fóra dos límites do mundo, referencias a recursos inexistentes, efectos que o runtime non soporta… Cada fila leva severidade, mensaxe, referencia (`node: …`) e código técnico. **Clic nunha fila = o nodo selecciónase e a vista céntrase nel.** A árbore gárdase con avisos; os **erros duros** (ids duplicados, referencias rotas) rexéitanse ao importar ou aplicar.

![O panel Problemas cun aviso de exclusión asimétrica e o botón Ver no código](../../../assets/capturas/14-problemas.png)

## Proba — xogar a árbore

En modo Proba o panel da dereita mostra os **recursos da sesión** (podes concederte máis), e para o nodo seleccionado os botóns de **desbloquear / retirar un rango** e o seu estado. Os recheos do canvas seguen os estados en vivo. **Reiniciar** volve á sesión limpa. A exportación de imaxe en Proba captura os estados da sesión.

![O modo Proba: recursos da sesión á dereita, a ficha do nodo seleccionado co custo e o botón Desbloquear](../../../assets/capturas/09-proba.png)

## Atallos

| Atallo | Acción |
|---|---|
| **Ctrl+Z** / **Ctrl+Y** (ou Ctrl+Shift+Z) | Desfacer / refacer |
| **V** / **N** / **C** | Seleccionar / Engadir nodo / Conectar |
| **Supr** | Eliminar a selección |
| **Shift+clic** | Engadir/quitar da selección |
| **Shift+arrastre no baleiro** | Rectángulo de selección |
| **Arrastre no baleiro** / **roda** | Pan / zoom |
| **Escape** | Cancelar interacción ou descartar edición nun campo |
| Nos menús: **frechas, Inicio/Fin, Escape** | Navegar as entradas, pechar e volver ao botón |

## Limitacións actuais

- **Edición común multi-selección**: con varios nodos seleccionados o Inspector non edita (mover e borrar si funcionan).
- **Locale do canvas**: as etiquetas edítanse na locale `gl`; as demais consérvanse pero non se editan desde a UI.
- **Edición de grupos**: desde o panel Código.

Para entender **por que** o editor se comporta así, le a [Guía de arquitectura](../../arquitectura/guia/). Para **engadir capacidades**, a [Guía de extensión](../../extension/guia/).
