---
'@yggdrasil-forge/editor-core': patch
---

As mensaxes de validación completas nos dous idiomas

Once das quince mensaxes dos validadores estaban **só en inglés**, nun
proxecto cuxo idioma por defecto é o galego: quen abría o panel
Problemas vía dous idiomas mesturados. Deixou de ser cousa só do editor
cando `ygg validate` empezou a imprimir os avisos soft, así que agora
saen tamén na saída do CLI.

Complétanse as once (`referentialIntegrity` ×4, `uniqueIds` ×2,
`unsupportedFeature` ×2, `asymmetricExclusion`, `layoutOverflow`) e
engádese unha garda: un test dispara **os cinco** validadores soft dunha
vez e esixe `gl` e `en` en toda mensaxe devolta, para que unha mensaxe
nova non naza outra vez a medias.
