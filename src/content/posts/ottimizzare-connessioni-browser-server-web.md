---
title: Perché dovresti ottimizzare le connessioni tra il browser e un server
date: "2016-11-11T16:43:20"
categories:
  - web-performance
lang: it
oldSlugs: []
excerpt: Cerca sempre di ridurre il numero di connessioni tra il browser e il tuo server web e i tuoi utenti te ne saranno grati.
---

Il numero di [richieste che servono per comporre un sito web](https://olegs.be/2016/05/ottimizzare-richieste-browser-server-caricare-risorse-compongono-sito-web/) sono differenti dal numero di connessioni che il tuo browser apre, per ritrovare le risorse che compongono un sito web (HTML, CSS, JS e immagini).

Una connessione, solitamente, viene composta da un DNS Lookup, poi connessione iniziale e, a volte, negoziazione SSL, se si ha una connessione via HTTPS (che ti consiglio di fare, unitamente all’attivazione del nuovo protocollo web HTTP/2 da parte del tuo fornitore di hosting).

I browser moderni, riutilizzano una connessione aperta al server per scaricare più risorse e si chiama «connessione persistente». Nel browser, possono essere stabilite più connessioni contemporanee, per scaricare in parallelo i contenuti come file JS, CSS, font personalizzati e immagini.

Il numero di connessioni parallele varia da browser a browser. I browser moderni come IE10+, Chrome, Firefox e Opera permettono di attivare fino a un massimo di 6 connessioni simultanee.

Se il tuo browser apre tante connessioni al server, vuol dire che i contenuti che compongono il tuo sito web si trovano su domini diversi. Succede, per lo più, con risorse di terze parti, come per esempio gli script dei pulsanti di condivisione sui social media o le varie pubblicità.

Questo, non permette al browser di sfruttare connessioni simultanee aperte, per velocizzare lo scaricamento dei contenuti.

Usa il waterfall (per esempio con WebPageTest.org) per vedere e misurare le connessioni e le richieste, tenendo sotto controllo il peso totale del sito web e le [performance web percettive](https://olegs.be/2016/06/ottimizzare-percorso-rendering-critico-migliorare-prestazioni-web-percepite/).

Aumentando la quantità dei contenuti su una pagina web, di conseguenza ammonta il suo peso e si riduce la velocità di caricamento.

Per calcolare il peso di una pagina web, fai dei test con l’estensione YSlow su Chrome.

Inoltre, per ridurre il peso delle pagine e delle risorse che le compongono, usa la compressione server side GZIP.

Sul sito [httparchive.org](https://httparchive.org/reports/state-of-the-web?start=latest) potrai trovare diverse statistiche con i diversi dati sul numero medio delle connessioni dei siti web e sul peso e le tipologie di risorse che li compongono.

Cerca sempre di ridurre il numero di connessioni tra il browser e il tuo server web e i tuoi utenti te ne saranno grati.
