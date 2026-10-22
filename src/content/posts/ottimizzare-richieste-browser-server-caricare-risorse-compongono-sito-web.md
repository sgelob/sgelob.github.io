---
title: Come ottimizzare le richieste di risorse che fa un browser a un server web
date: "2016-05-30T18:31:20"
categories:
  - web-performance
cover: 2016/05/olegs-be-chrome-canary-network-pannel-waterfall.jpg
lang: it
seoTitle: Ottimizzare richieste di risorse che fa un browser al server web
seoDescription: Ottimizzare il numero e il peso delle richieste HTML, immagini, CSS, JS incide in modo significativo sul tempo di caricamento e velocità del tuo sito web.
oldSlugs: []
excerpt: Ottimizzando il numero e il peso delle richieste che servono per comporre il tuo sito web (HTML, immagini, CSS, JS), potrebbe incidere in modo significativo sul suo tempo di caricamento e la velocità con la quale verrà visualizzato in un browser dai tuoi visitatori.
---

Le richieste delle risorse di un sito web si possono vedere facendo un test nell’ispettore del tuo browser nella scheda «Network» (per esempio in [Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools)), oppure con un test su [WebPagetest.org](https://www.webpagetest.org/). Ti farò vedere in un articolo a parte come fare questi test e come leggere e ispezionare un grafico a cascata (Waterfall). Per avere dei risultati più precisi, **ti consiglio una volta aperta la scheda «Network» di fare un  refresh premendo *cmd+shift+R*** (su Mac), forzando in questo modo l’aggiornamento senza cache in Google Chrome.

## Esempio di un grafico a cascata (Waterfall) nel pannello «Network» del browser Chrome Canary

![Google Chrome Canary DevTools – Network Panel Waterfall](https://img.olegs.be/uploads/2016/05/olegs-be-chrome-canary-network-pannel-waterfall-960.jpg)

**Ogni riga del grafico a cascata corrisponde a una richiesta di una risposta dal server con una risorsa**. La prima richiesta che fa il browser di solito viene fatta per ritrovare il HTML del tuo sito web e include anche il DNS Lookup, che ritrova dove risiede su Internet il suo contenuto. Le richieste successive ritrovano file CSS, JS, immagini, font e avranno questa struttura:

1. Tempo di connessione iniziale del browser al tuo server;
2. Tempo per il browser di ricevere indietro il primo byte dal server;
3. Tempo per caricare e mostrare il contenuto nel browser.

Si parla per lo più di millisecondi, ma **dipende molto dal peso della risorsa da scaricare e i tempi complessivi potrebbero aumentare di parecchio**. Più risorse separate ci sono da scaricare, processare e mostrare nel tuo browser e più i tempi per avere il tuo sito web completo aumenteranno. Per questo motivo considera sempre e analizza il peso delle risorse che compongono il tuo sito web e la loro quantità.

Per esempio puoi ottimizzare il numero di immagini da mostrare, quanti font personalizzati utilizzare, i vari file JavaScript e CSS separati che possono essere tranquillamente uniti e *minificati*.

**Se hai tante piccole immagini usate per comporre parti del layout, puoi unirle in uno [Image Sprite](https://www.w3schools.com/css/css_image_sprites.asp)**, riducendo così il numero di richieste a una sola. Se hai immagini di grandi dimensioni, oltre al salvarle per il web in Adobe Photoshop o altro software per editing di immagini, comprimile ulteriormente con uno strumento di compressione come [ImageOptim](https://imageoptim.com/mac). Considera anche l’utilizzo delle tecniche di immagini responsive, per mostrare versioni con dimensioni diverse in base alle dimensioni dello schermo del dispositivo dal quale un utente visiterà il tuo sito web.

**I file JavaScript e CSS si possono concatenare in meno file e minificarli**, togliendo automaticamente spazi, commenti etc… riducendone il peso e impostando anche l’ordine giusto di caricamento, con le tecniche di [async](https://www.w3schools.com/tags/att_script_async.asp) o [defer](https://www.w3schools.com/tags/att_script_defer.asp), per assicurare un’esperienza utente migliore per le persone che visiteranno il tuo sito web.

**Per caricare i font personalizzati senza bloccare il rendering della pagina, utilizzo [Web Font Loader](https://github.com/typekit/webfontloader)** per caricare quelli di Google su questo mio sito web. Si tratta di una libreria JavaScript sviluppata da Google e Typekit che ti permette una gestione ottimale e aggiunge il controllo quando utilizzi *@font-face* per importare i tuoi font esterni in modo asincrono.

Per fare gli audit di velocità di caricamento di un sito web e **per simulare le connessioni di reti più lente come (2G e 3G), utilizzo spesso la versione del browser [Chrome Canary](https://www.google.com/chrome/canary/)** che di solito ha già integrate all’interno le ultime funzionalità che le versioni normali di Chrome non hanno ancora. Per simulare le connessioni a reti lente, puoi usare anche un tool gratuito per Mac come [Network Link Conditioner](https://nshipster.com/network-link-conditioner/).

Alcune di queste tecniche, come per esempio il concatenamento dei file CSS/JS oppure unire le immagini in sprite, potrebbero diventare presto del tutto obsolete se non controproducenti con la sempre più reale diffusione del protocollo web [HTTP/2](https://http2.github.io/faq/). **Su questo mio sito web il protocollo HTTP/2 è già attivo e i risultati si vedono unitamente al certificato SSL** (per funzionare, questo protocollo richiede per forza di cose una connessione attiva via HTTPS) e per questo ringrazio il mio hosting fantastico [SiteGround](https://www.siteground.com/index.htm?afcode=643d883698337aa8cdd2ff223ee5634b).

*Conoscevi già queste tecniche di ottimizzazione delle richieste che fa il tuo browser al server? Ne conosci altre che non ho elencato? Fammi sapere qui sotto nei commenti* 🙃
