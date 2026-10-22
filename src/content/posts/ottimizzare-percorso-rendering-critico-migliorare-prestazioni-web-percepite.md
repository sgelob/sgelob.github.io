---
title: Come migliorare le prestazioni web percepite e l’esperienza utente, ottimizzando il percorso di rendering critico
date: "2016-06-03T17:38:33"
categories:
  - web-performance
  - user-experience
cover: 2016/06/webpagetest-filmstrip-sintetico-sito-web-banca-intesa-sanpaolo.jpg
lang: it
seoTitle: Ottimizzare le prestazioni web percepite e l’esperienza utente
seoDescription: Un visitatore percepisce la velocità di un sito web in base a quando inizia a comparire il contenuto e a quanto prima può iniziare a interagire.
oldSlugs: []
excerpt: La percezione di quanto si carica veloce il tuo sito web è molto più importante di quanto effettivamente ci mette in totale. Un visitatore percepisce la velocità di un sito web in base a quando inizia a comparire il contenuto e a quanto prima può iniziare a interagire facendo clic sui link, aprendo il menu, ingrandendo un’immagine, oppure semplicemente facendo scroll in modo fluido.
---

Per migliorare le prestazioni web percepite su un sito web puoi ottimizzare il [percorso di rendering critico](https://developers.google.com/web/fundamentals/performance/critical-rendering-path/analyzing-crp) (Critical rendering path o CRP). Dovresti fare sì che un utente non veda lo schermo bianco per i primi secondi, prima di iniziare a vedere dei contenuti, pensando che non sta succedendo nulla o che c’è stato qualche problema con il sito web che sta visitando, vivendo così un’esperienza utente negativa e abbandonandolo velocemente.

**Siti web che forniscono una esperienza utente eccezionale, ricevono molte più visite ripetute**, che infine si trasformano in nuovi clienti fedeli o follower.

Un modo per vedere quanto ci mette un sito web ad iniziare a mostrare e renderizzare per un utente dei contenuti, sarebbe quello di **usare [WebPagetest.org](https://www.webpagetest.org/) e vedere la metrica *Start Render***, che in una specie di pellicola mostra in fotogrammi con intervallo di 0.5 secondi (puoi scegliere anche altri intervalli prima di eseguire un test) l’intero caricamento di un sito web.

![Filmstrip del test sintetico eseguito con WebPagetest.org del sito web della banca Intesa Sanpaolo](https://img.olegs.be/uploads/2016/06/webpagetest-filmstrip-sintetico-sito-web-banca-intesa-sanpaolo-960.jpg)

Per esempio, in questa immagine si vede un test sintetico eseguito con WebPagetest.org del sito web della banca Intesa Sanpaolo. Le impostazioni scelte sono Google Chrome con una connessione a fibra da Francoforte (purtroppo in Italia non c’è ancora nessun server di test). Per circa 3 secondi e mezzo lo schermo rimane completamente bianco e anche dopo, il sito web non viene renderizzato subito, lasciando passare ben altri 6 secondi di tempo prima di poter vedere qualcosa di leggibile… puoi vedere l’effetto del rendering in azione in questo video:

<iframe src="https://www.youtube.com/embed/axw-YllBIz0" width="420" height="315" frameborder="0" allowfullscreen="allowfullscreen"></iframe>

Prima il tuo visitatore riuscirà a vedere dei contenuti sul tuo sito web e prima sentirà che è veloce e vivrà una bella esperienza, restandoci più a lungo volentieri (dipende ovviamente se offri dei contenuti originali e di valore 😎).

## Come puoi ottimizzare il percorso di rendering critico

Per capire come funziona il percorso di rendering critico, dovresti prima capire [come un browser compone visualmente una pagina web](https://www.youtube.com/watch?v=n1cKlKM3jYI).

**I file CSS sono una risorsa che blocca il rendering** e quindi puoi usare le [media queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries/Using_media_queries) e media type per indicare le parti di stile non sempre necessarie, come per esempio gli stili per la stampa o per determinate dimensioni di schermi.

`<link rel="stylesheet" href="print.css" media="print">`

Questa chiamata del file CSS fa un controllo con *media type* e sarà caricato solo nel caso una pagina venga stampata. Questo foglio di stile non sarà mai caricato inutilmente in altre situazioni, senza così riempire una pagina web di stili nascosti e inutilizzati.

`<link rel="stylesheet" href="style-768-up.css" media="screen and (min-width: 768px)">`

Questo richiamo al file CSS fa un controllo con una *media query* e sarà applicato solo nel caso il sito web verrà visualizzato su dispositivi con schermi di minimo 768px di larghezza. Attenzione che in questo caso il browser scaricherà lo stesso il file anche se non lo applicherà al DOM, questo comporta una richiesta HTTP in più di una risorsa che però magari non viene utilizzata. Volendo, ci sarebbe una [soluzione JavaScript](https://christianheilmann.com/2012/12/19/conditional-loading-of-resources-with-mediaqueries/) per correggere questo problema, caricando le risorse in modo condizionale con le media queries.

**Dovresti anche caricare i file JavaScript in modo efficiente**, usando per esempio [async](https://www.w3schools.com/tags/att_script_async.asp) o [defer](https://www.w3schools.com/tags/att_script_defer.asp) e senza bloccare la costruzione del DOM, oppure usando un plugin come [loadJS](https://github.com/filamentgroup/loadJS). Conta che per esempio i file .js di statistiche come Google Analytics non bloccano il rendering perché non incidono visivamente in alcun modo sulla costruzione del DOM.

Sempre facendo i test **con WebPagetest.org, misura la metrica che si chiama [*Speed Index*](https://github.com/WPO-Foundation/webpagetest-docs)** e che indica un tempo medio dopo il quale gli elementi di una pagina web iniziano a comparire sullo schermo del visitatore.

La metrica *Total Load Time* non è da considerare quasi mai, perché è una di quelle metriche vanitose che non dicono nulla sugli effetti delle prestazioni percepite.

Altro termine di una **metrica importante si chiama *Time to Interactivity*** e indica il tempo tra quando un sito web diventa navigabile e quando invece diventa possibile interagire con i contenuti (aprire dei menu, fare clic su un link, usare il campo di ricerca oppure far partire un video).

Altra cosa da **tenere in considerazione per la velocità percepita sono le animazioni o cambi di stato degli elementi** che compongono una pagina web. Ti sarà capitato di vedere gli elementi di una pagina saltellare, lampeggiare o muoversi a scatti durante la navigazione su un sito web? Questi problemi si chiamano «Jank» e succedono quando il browser deve ridipingere (paint) gli elementi durante un cambiamento visivo (ombre, animazioni e cambi di stato di un elemento al passaggio del mouse, animazioni di uno slider, etc…) e che avviene al di sotto dei 60 fotogrammi al secondo, creando un’esperienza utente negativa e la percezione di velocità penosa. E se puoi, [non usare gli slider](https://shouldiuseacarousel.com) sui tuoi siti web 😜

Se il Jank succede sul tuo sito web, **puoi scoprire il perché usando gli strumenti del browser come [Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools)** e per esattezza la scheda «Timeline», che ti mostra il frame rate mentre interagisci con un sito web. Puoi registrare la sessione mentre utilizzi il tuo sito web per vedere poi se ci sono dei punti sotto 60fps (fotogrammi al secondo) e investigare di più facendo il debugging di quella parte, scoprendo la causa specifica e neutralizzando il rallentamento.

Fai delle **sezioni di user testing su diversi dispositivi e browser** e se hai la possibilità, prova anche a fare test in altri paesi e con connessioni diverse. In questo modo scoprirai sicuramente parti del tuo sito web che sono da velocizzare.

Lascia i tuoi visitatori con una buona impressione sulla velocità del tuo sito web, tenendo sempre in considerazione il percorso di rendering critico e il contenuto above the fold. **Considera sempre l’esperienza utente come una priorità e non lasciare che i tuoi visitatori guardino per dei secondi uno schermo vuoto** e senza poter iniziare ad interagire con i contenuti del tuo sito web.
