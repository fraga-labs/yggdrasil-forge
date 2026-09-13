---
'@yggdrasil-forge/cli': patch
'@yggdrasil-forge/editor-core': patch
'@yggdrasil-forge/editor-react': patch
---

Ningunha bandeira do `ygg` falla calada, e a documentación xa nomea o sexto motor

Probando o CLI coas mans (non lendo o código) apareceron catro
descartes silenciosos, todos saíndo con **código 0** como se fose ben:

- `ygg render … --drak` — un `--dark` mal escrito — renderizaba en
  CLARO. Calquera `--` non recoñecido caía nun burato entre `takeOption`
  (que só retira a opción cando lle atopa valor) e o filtro de
  positional (`!a.startsWith('--')`).
- `ygg layout … --out` co ficheiro esquecido cuspía o documento enteiro
  polo **stdout** en vez de escribilo.
- `ygg render … --width lol` collía o ancho por defecto sen dicir nada:
  medíase con `parseInt` e despois só se comprobaba que fose finito.
- `ygg render … --width 0` (ou negativo) escribía un SVG dun **píxel**
  anunciando «svg escrito». O recorte a 1 que fai `standaloneSvg` está
  ben na biblioteca —nunca emitir `width="0"`— pero o sitio de non
  aceptar a orde é o CLI.

O comentario de `--grant`/`--unlock` xa dicía que «o descarte silencioso
non o admitimos»; só que a regra valía para dúas bandeiras de cinco.
Agora a mesma vara mide todas, nos cinco comandos, e a mensaxe nomea o
erro real: `opción descoñecida «--drak»`, `--out precisa un valor (p.ex.
--out saida.svg)`. `ygg validate --jsno` dicía «agardaba un só ficheiro,
recibín 2», que non axudaba a ninguén.

**E a documentación publicada seguía falando de cinco motores de
layout.** `mesh` — a xoia desta entrega, o único que le as arestas —
non aparecía no README do `cli` (que é a páxina de npm), nin no de
`editor-core`, nin no do `editor-react` («five engines»), nin no README
raíz, nin na «vía do dato» das docs. É o mesmo fallo que xa se corrixira
no erro de `--algo`: quen buscaba o motor lía que non existía. Ao
README do `cli` engádenselle tamén `--minimap`, `--grant` e `--unlock`,
que levaban toda a entrega sen documentar.
