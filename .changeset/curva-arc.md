---
'@yggdrasil-forge/core': minor
---

Estilo de curva `arc`: o único sen nesgo de dirección

`CurveStyle` gaña `'arc'` — cubic Bézier cunha combadura LIXEIRA
perpendicular ao segmento, proporcional á súa lonxitude (12% por
defecto, acoutada a 90 unidades por `arcMaxBow`).

Os cinco estilos previos asumen unha orientación dominante: vertical,
horizontal, radial ou Manhattan. Iso vale para árbores, pero nunha
MALLA, onde as arestas van a todas as direccións, o nesgo produce eses
eses raros nas perpendiculares. `'arc'` depende só da propia aresta, así
que unha tea de centos de liñas curva toda igual de suave — o «curved
bezier edges, no straight flowchart lines» que piden os mockups
fundacionais e que ata agora non se podía cumprir.

Pídese como calquera outro: `tree.layout.curve: "arc"` (ou por aresta,
con `EdgeStyle.routing`). Dúas opcións novas en `PathBuilderOptions`:
`arcBow` (fracción) e `arcMaxBow` (tope absoluto, para que unha aresta
moi longa non se converta nunha bóveda).
