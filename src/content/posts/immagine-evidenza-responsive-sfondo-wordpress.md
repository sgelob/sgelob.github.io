---
title: Immagine in evidenza responsive come sfondo in WordPress
date: "2016-05-17T15:24:12"
categories:
  - wordpress
  - web-performance
lang: it
oldSlugs: []
excerpt: Ti sarà capitato di dover utilizzare immagini di grandi dimensioni, in quei layout che vanno molto di moda ora con le «hero images» :) in testa a una pagina, oppure avrai avuto altre esigenze simili nell’utilizzo di grandi immagini come sfondo. Ti mostro come ho fatto a rendere il caricamento delle immagini di sfondo in WordPress in modo responsivo, migliorando le prestazioni di caricamento di un sito web.
---

**Le immagini comprendono tipicamente tra il 50% e il 60% del peso totale di una pagina web**, rendendole così un campo fertile per l’ottimizzazione delle performance. Pensa che il peso medio di una pagina web [aveva superato i 2 megabyte già nel 2015](https://www.speedcurve.com/blog/web-performance-page-bloat/)…

Per questi motivi dovresti fare molta attenzione a come utilizzi le immagini sul tuo sito web, **tenendo sotto controllo sia la loro quantità che anche il peso e la compressione**.

Un modo per ottimizzare il caricamento delle immagini sui vari dispositivi, sarebbe quello di **caricarle nei tuoi template come *background* nel CSS e usando poi le media query**, per caricare dimensioni diverse in base alla larghezza del viewport di un dispositivo.

## Visualizza l’immagine in evidenza come sfondo responsive nel tuo tema WordPress

Nel template del mio tema WordPress ho scritto questo codice:

<script src="https://gist.github.com/sgelob/543466382f5ced8179b9.js"></script>

Puoi anche vedere un [template completo](https://github.com/sgelob/wp-olegs-theme/blob/master/single-galleries.php) del mio sito web su GitHub.

Questo **codice ritrova l’immagine in evidenza** di una pagina o articolo, con le dimensioni che hai impostato in WordPress dal menu *Impostazioni –> Media*, ovvero la dimensione media, grande e poi quella originale.

La parte di CSS fa sì che su schermi più piccoli e in generale **di default (mobile-first) viene caricata come sfondo l’immagine di dimensioni medie** e poi con le media query, man mano che la larghezza del viewport aumenta, aggiungo breakpoint e l’immagine di sfondo viene sostituita con la versione grande e infine con quella originale.

Nel HTML del mio sito web, l’elemento che deve mostrare l’immagine di sfondo ha la classe *.gallery-cover* che si può vedere anche in uno degli [articoli della mia galleria di foto](https://olegs.be/photos/), accedendo dai vari dispositivi o redimensionando la finestra del browser.

Anche se metti un po’ di CSS in linea, è sempre meglio che caricare immagini pesanti e di grandi dimensioni anche su **dispositivi con schermi più piccoli e meno performanti di un computer**, senza il rispetto per i visitatori mobile, sprecando il loro traffico dati Internet, consumando la batteria e rendendo la loro esperienza utente frustrante.

*Tu che tecniche usi per le immagini di sfondo responsive e per ottimizzare la velocità di caricamento dei tuoi siti web?*
