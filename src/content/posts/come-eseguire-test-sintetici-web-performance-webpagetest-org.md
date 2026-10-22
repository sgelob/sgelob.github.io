---
title: Come eseguire i test sintetici delle Web Performance con WebPageTest.org
date: "2016-09-30T13:43:51"
categories:
  - web-performance
  - meetup
cover: 2016/10/olegs-belousovs-eseguire-test-sintetici-web-performance-webpagetest-turin-meetup.jpg
lang: it
oldSlugs: []
excerpt: Il talk che ho fatto al meetup del Turin Web Performance Group, il 27 settembre 2016, parlando di come leggere il Waterfall di WebPageTest e delle Web Performance percepite. Ho spiegato anche il perché fosse importante che il tuo sito web sia veloce, leggero e performante!
---

![Come eseguire i test sintetici delle Web Performance su webpagetest.org](https://img.olegs.be/uploads/2016/10/eseguire-test-sintetici-web-performance-webpagetest-960.jpg)

Ho raccolto davvero tanto materiale e sono sicuro che dopo aver letto questo articolo, andrai via con più ispirazione e con nuove conoscenze.

Prima di spiegare come si usa WebPageTest, ci tenevo a parlare un po’ di cultura generale, dei concetti base delle Web Performance, di alcuni temi fondamentali e delle loro differenze.

***Le slide e il video del talk sono [al fondo dell’articolo](#video-slide).***

## Come un browser fa il rendering dei contenuti

![Un ciclo di tempo di caricamento della pagina tra il tuo browser e il contenuto sul server](https://img.olegs.be/uploads/2016/10/ciclo-tempo-caricamento-pagina-browser-utente-contenuto-server-960.jpg)

*Fonte: [Designing for Performance di Lara Callender Hogan](https://designingforperformance.com/basics-of-page-speed/#how-browsers-render-content)*

I principali fattori in gioco sono:

**Latency** – che è la quantità di tempo necessaria per un pacchetto di dati per arrivare da un punto all’altro. Su mobile c’è anche la torre cellulare o un ripetitore di mezzo e a volte pure un proxy server.

**Bandwidth** – «La larghezza di banda aggiuntiva ha un impatto positivo sulle Web Performance, non è però la *cura a tutto*, come alcune persone suppongo che sia.» – Tammy Everts. In questo esperimento viene mostrato che anche se le connessioni diventano più veloci, non risolvono però completamente i problemi con i siti web lenti.

Le **richieste** sono i file che compongono un sito web, quindi CSS, JavaScript, HTML, immagini e font.

Le **connessioni TCP** possono essere fino a 6 in parallelo con HTTP/1.1. Invece on il protocollo HTTP/2 attivo sul server, con una sola connessione trasferisci tutte le richieste di risorse. Guardati il video [HTTP/2 – Finalmente! con Simone Bordet](https://www.youtube.com/watch?v=aXQQXSxIyQU), dal nostro Web Performance meetup di luglio.

**TTFB (Time to First Byte)** è il primo byte che il browser riceve, quindi di solito è un buon indicatore di back-end veloce a rispondere.

![Analisi della performance del percorso di rendering critico](https://img.olegs.be/uploads/2016/10/analisi-performance-percorso-rendering-critico-960.jpg)

*Fonte: [Analisi della performance del percorso di rendering critico](http://bit.ly/1pgxuec)*

Cosa succede in questo diagramma:

Affronti il primo round trip di rete per recuperare il documento HTML.

Il markup recuperato ti informa che serviranno anche i file CSS e JavaScript: significa che **il browser deve tornare al server e ottenere questi file CSS e JavaScript**, prima che possa eseguire il rendering della pagina sullo schermo.

Di conseguenza, **il browser affronterà un minimo di 3 round trip prima di poter visualizzare la pagina**. I file CSS e JavaScript potrebbero eseguire round trip multipli nel caso del loro peso eccessivo.

Per poter eseguire il file JavaScript dovrai anche bloccare e aspettare il **CSSOM (CSS Object Model)**.

Le richieste CSS e JavaScript saranno avviate più o meno nello stesso momento. Praticamente, il browser ottiene l’HTML, scopre entrambe le risorse e avvia le due richieste.

**Un CSS esterno, di solito blocca il rendering** degli elementi nel DOM dopo di lui e invece un file **JavaScript, blocca il parsing** e la costruzione del DOM.

Il browser costruisce il DOM in modo incrementale e quindi puoi usarlo a tuo vantaggio per ottimizzare il [percorso di rendering critico](https://olegs.be/2016/06/ottimizzare-percorso-rendering-critico-migliorare-prestazioni-web-percepite/).

«Il **DOM (Document Object Model)** è lo standard ufficiale del W3C per la rappresentazione di documenti strutturati in maniera da essere neutrali sia per la lingua che per la piattaforma.» – [Wikipedia](https://it.wikipedia.org/wiki/Document_Object_Model)

## Ottimizzazione del percorso di rendering critico

Le **performance percepite** sono la vera velocità e quella che un utente reale percepisce durante la visita di un sito web.

Non importa tanto il tempo che ci mettono i tuoi siti web a caricarsi in totale, quanto **la velocità con la quale i tuoi visitatori iniziano a vedere i contenuti sullo schermo** e possono cominciare a interagire.

Se per i primi secondi un utente vede una pagina bianca, l’esperienza utente sarà pessima e alcune persone potrebbero pensare che non sta succedendo nulla o che il tuo sito non funziona e quindi abbandonarlo.

[Ottimizzando il percorso di rendering critico](https://olegs.be/2016/06/ottimizzare-percorso-rendering-critico-migliorare-prestazioni-web-percepite/), puoi migliorare in modo significativo il momento in cui esegui il primo rendering delle tue pagine. Vedrai dopo **la funzionalità Filmstrip di WebPageTest**, che mostra proprio come avviene gradualmente il rendering dei contenuti in un browser.

Una delle metriche più importanti in WebPageTest sarà **Speed Index**, che è il tempo medio entro il quale vengono visualizzate le parti visibili della pagina (in millisecondi).

In una [ricerca di Christine Perfetti e Lori Landesman](https://articles.uie.com/download_time/), il sito Amazon.com era il più lento a caricarsi ma era percepito dagli utenti come il più veloce, e invece il sito About.com era il più veloce a caricarsi ma percepito però come il più lento.

Leggi di più nel mio articolo [Come migliorare le prestazioni web percepite e l’esperienza utente, ottimizzando il percorso di rendering critico](https://olegs.be/2016/06/ottimizzare-percorso-rendering-critico-migliorare-prestazioni-web-percepite/)

## Differenza tra Synthetic Testing e RUM

**Synthetic Testing**, chiamato anche Synthetic Performance Monitoring e Active Monitoring, è **un controllo simulato dello stato di salute del tuo sito web**. Permette di misurare una serie di metriche come Response Time, Load Time, numero di risorse che compongono una pagina e le dimensioni, tutto questo simulando diversi tipi di connessioni (3G, 4G, ADSL, fibra etc…). Puoi testare anche un sito web in produzione, una volta che va online.

Synthetic Testing è utile per capire:

- come sei messo in confronto alla tua competizione;
- come il design delle tue pagine influisce sulle Web Performance;
- come la nuova versione del tuo sito web si comporta in confronto alla precedente (benchmarking prima/dopo).

**RUM** sta per Real User Measurement ed è **la pratica per misurare l’esperienza degli utenti reali, mentre navigano attraverso un sito web**. Gli esseri umani hanno molte differenze dalle macchine e queste differenze sono ciò che rende RUM diverso dal testing e monitoraggio sintetico. Con RUM puoi monitorare come vanno le Web Performance nel tempo, gli ambienti dei tuoi utenti reali (sistema operativo, browser, etc…), come si comportano gli script di terze parti, etc…

RUM è un monitoring passivo che ascolta tutto il traffico sul tuo sito web. Ci sono diversi tool a pagamento come SOASTA mPulse ma c’è anche la possibilità di monitorare queste metriche in [Google Analytics](https://analytics.googleblog.com/2012/03/measure-your-websites-performance-with.html).

La parte più importante è che **i dati RUM si legano strettamente con User Experience e metriche di business** come il bounce rate, page views, tempo di permanenza sul sito e ovviamente il tasso di conversione (nel caso di un sito ecommerce).

Non puoi usare RUM per fare benchmarking con la competizione e non puoi usarlo per testare un sito in staging.

## Differenza tra PageSpeed Insights e WebPageTest

**PageSpeed Insights** di Google ti mostra solo un numero e quindi una metrica vanitosa che non ti dice nulla sull’esperienza dell’utente reale. Spesso leggo online «Come faccio ad avere 100 su 100 su PageSpeed?» o cose simili…

Con **WebPageTest**, riesci a capire meglio come una persona sente e percepisce la velocità del tuo sito web in diverse condizioni di connessione e utilizzando vari browser, attraverso gli strumenti come Waterfall, Filmstrip e Video.

## Cos’è WebPageTest?

**WebPageTest è un progetto open source** che è principalmente sviluppato e supportato da Google come parte dei loro sforzi per rendere il web più veloce.

WebPageTest è uno strumento che è stato originariamente sviluppato da AOL per uso interno ed era stato open sourced nel 2008 sotto licenza BSD. La piattaforma **è in fase di sviluppo attivo su GitHub** ed è anche disponibile per il download, se desideri installare un’istanza privata.

La versione online su www.webpagetest.org è gestita per il beneficio della comunità di Web Performance, con **diverse aziende e gli individui che forniscono le infrastrutture di test in tutto il mondo**.

In Italia non abbiamo ancora una location di testing. Se vuoi contribuire al progetto, puoi contattare Patrick Meenan e offrire la tua volontà e la disponibilità di aiutare la community. Dovresti essere coinvolto attivamente nella community, altrimenti non penso che la tua proposta verrà accettata. E… «aspettati di essere hackerato» :)

*Fonte: www.webpagetest.org/about*

## Synthetic Testing con WebPageTest

**Prima devi misurare le prestazioni attuali del tuo sito, individuare i vari problemi che lo rendono lento e solo dopo pensare alle ottimizzazioni da fare.**

Essendo ogni sito web diverso da un altro, senza una misurazione accurata non serve buttare sopra tutti i plugin e le tecniche di ottimizzazione di questo mondo, perché si rischia di finire a fare over-optimization.

Utilizza WebPageTest quando vuoi solo con una connessione e un browser. Si può condividere un link al test e assicurarsi che sono tutti sulla stessa pagina.

In sostanza, con WebPageTest.org puoi:

1. scoprire quanto è veloce una pagina;
2. trovare il modo di renderla più veloce.

Una volta inserito un indirizzo URL e fatto partire il test si finisce su una pagina con dei risultati.

Vediamo ora, parte per parte, gli elementi che compongono i risultati di un test.

## Gradi di ottimizzazione in WebPageTest

![Gradi di ottimizzazione in WebPageTest](https://img.olegs.be/uploads/2016/10/gradi-ottimizzazione-webpagetest-960.jpg)

**I gradi di ottimizzazione possono essere da A (90%+) a F (0-59%)** e vanno a incremento di 10 punti.

Sono organizzati in ordine di importanza delle ottimizzazioni, da sinistra a destra.

**First Byte Time** è il tempo che passa fino a quando il browser riceve il primo byte della risposta del server.

**Keep-alive Enabled** misura l’efficienza del riutilizzo della connessione. Controlla le richieste che riaprono una connessione in modo efficiente (configurazione server side).

**Compress Transfer** controlla se le risorse testuali (JS, CSS, HTML) trasferite sono compresse con Gzip (configurazione server side). Immagini sono risorse binarie e vengono escluse dal calcolo di grado della compressione.

**Compress Images** misura la qualità delle JPEG, ottimizzandole e facendo una comparazione con quelle reali sul sito. Le immagini progressive sono buone per le performance percepite.

**Cache Static Content** controlla se i contenuti statici hanno impostazioni di durata della cache. Dato che potrebbe arrivare da Cache-Control: max-age oppure Expires header.

**Effective use of CDN** vede se si fa uso di una CDN per ridurre i tempi di round trip, caricando le risorse dai punti più vicini fisicamente ai visitatori del sito. Qui non c’è un grado ma dice soltanto se passa o non passa il grado di valutazione.

## La tabella con i dati del risultato di testing

![La tabella con i dati di WebPageTest](https://img.olegs.be/uploads/2016/10/tabella-dati-webpagetest-960.jpg)

Sono le **metriche che indicano la comunicazione tra il browser e il server** e la loro misurazione in millisecondi e byte.

**Load Time** è la stessa cosa di Document Complete Time e indica il tempo dalla richiesta iniziale fino a quando il browser genera l’evento onLoad (fino a quando il browser considera la pagina caricata).

**First Byte** è il tempo fino a quando il browser riceve il primo byte della risposta del server.

**Start Render** indica quando il contenuto inizia a visualizzarsi nel browser dell’utente (conosciuto anche come First Paint). Nota che Start Render non indica se il primo contenuto che compare nel browser è utile o importante, o semplicemente sono degli annunci pubblicitari o widget.

**User Time**: il W3C User Timing spec fornisce una API per sviluppatori in modo da aggiungere metriche personalizzate per le loro applicazioni web. Viene fatto attraverso due funzioni principali:

- **performance.mark** – registra il tempo (in millisecondi) dal navigationStart;
- **performance.measure** – registra il delta tra i due marchi.

Nel caso del mio sito web, ho un marcatore performance.mark('fonts:active'); che mi dice quando i font custom vengono caricati e applicati.

**Speed Index** è il tempo medio entro il quale vengono mostrate le parti visibili della pagina (espresso in millisecondi e dipende dalle dimensioni del viewport). C’è una formula matematica per il calcolo che ora non ti sto a elencare 😀

**DOM Elements** indica il numero di elementi nel documento HTML.

**Document Complete** sono le metriche raccolte fino a quando il browser considera la pagina caricata (evento onLoad). Accade di solito dopo che tutti i contenuti di immagini sono caricati, ma potrebbe non includere il contenuto che viene attivato dall’esecuzione di JavaScript.

**Document Complete: Time** Stessa cosa di Load Time… **Document Complete:** **Requests** Il numero di richieste HTTP prima dell’evento onLoad che il browser deve fare per raccogliere le risorse della pagina come immagini, JavaScript, CSS, etc (esclusa la prima richiesta). **Document Complete:** **Bytes In** La quantità di dati che il browser dove scaricare per caricare la pagina. (metrica spesso chiamata Page Size)

**Fully Loaded** è il momento quando tutte le risorse di una pagina, tra cui script di terze parti che non sono visibili, sono stati caricati e la pagina è completa. Di solito comprende qualsiasi attività che viene attivata da JavaScript dopo che il principale caricamento della pagina è terminato.

**Fully Loaded: Time** Tempo dall’inizio della navigazione iniziale fino a quando c’è stata inattività della rete per 2 secondi dopo il Document Complete. **Fully Loaded:** **Requests** Il numero di richieste HTTP totali che il browser deve fare per raccogliere le risorse della pagina come immagini, JavaScript, CSS, etc (esclusa la prima richiesta). **Fully Loaded:** **Bytes In** Numero totale dei byte ricevuti in questo test.

**Visually complete** è il momento in cui tutto il contenuto nel viewport ha finito il rendering e nulla è cambiato nel viewport dopo quel punto, mentre la pagina continuava il suo caricamento. È un buon modo per misurare l’esperienza degli utenti, che così vedono una schermata piena di contenuti e sono in grado di iniziare a interagire con il contenuto del tuo sito.

Vediamo ora come leggere un Waterfall… ovvero il grafico a cascata.

## Leggere il Waterfall di WebPageTest

![Come leggere un Waterfall di WebPageTest.org](https://img.olegs.be/uploads/2016/10/come-leggere-waterfall-webpagetest-960.jpg)

**Ogni riga del Waterfall corrisponde a una richiesta di una risorsa separata.**

La prima richiesta che fa il browser di solito viene fatta per ritrovare il documento HTML del sito e include anche il DNS Lookup, che praticamente ritrova dove risiede su Internet il suo contenuto. Le richieste successive ritrovano file CSS, JS, immagini, font e avranno questa struttura:

- tempo di connessione iniziale del browser al server;
- tempo per il browser di ricevere indietro il primo byte dal server;
- tempo per caricare e mostrare il contenuto nel browser.

![Waterfalls 101](https://img.olegs.be/uploads/2016/10/waterfalls-101-960.jpg)

*Fonte: [Waterfalls 101 di Web Performance Today](http://bit.ly/1nT9yLK)*

**DNS Lookup** risolve indirizzo umano a un IP. Come guardare su una rubrica telefonica e associare il nome a un numero di telefono.

**Initial Connection** è il tempo che il browser ci mette per connettersi al server. Come comporre un numero di telefono e aspettare una risposta.

**SSL Negotiation** aggiunge tempi di caricamento, perché il browser e il server si devono mettere d’accordo su un modo sicuro di comunicare.

**TTFB** è il tempo che ci mette il server per prepararsi a rispondere a una richiesta. Quando il server cerca qualcosa nel DB o si connette a API esterne.

**Content Download** è il tempo che ci mette il server a spedire indietro nel browser il contenuto richiesto. Proporzionale direttamente al peso della risorsa e velocità di connessione.

![Waterfalls 101](https://img.olegs.be/uploads/2016/10/waterfalls-101-00-960.jpg)

*Fonte: [Waterfalls 101 di Web Performance Today](http://bit.ly/1nT9yLK)*

**Start Render, Document Complete e Fully Loaded** (per la descrizione, vedi la sezione [La tabella con i dati del risultato di testing](#tabella)).

Il **rosso** sono gli errori HTTP, come l’errore 404 (risorsa non trovata) e gli errori interni del server come il 500.

Il **giallo** sono per lo più Redirect 301. Evitali, perché causano un round trip inutile. Capita anche che sono file in cache, soprattutto se si fanno test con Repeat View attivato nelle impostazioni.

Problemi visibili in un Waterfall:

- Se il **TTFB fosse molto lungo**, significa che c’è un problema lato back-end;
- se c’è **l’arancio all’inizio di ogni barra**, significa che ci sono nuove connessioni aperte. Attiva Keep-Alive sul server;
- guarda se c’è del **testo rosso** che sono di solito errori 404 e 500;
- guarda se ci sono **barre molto lunghe**, spesso significa che ci sono file molto pesanti;
- guarda se ci sono dei **gap tra una richiesta e un’altra**. Se ci fossero, significa che c’è un problema di connessione o con JavaScript.

Cose buone visibili in un Waterfall:

- se ci sono **meno righe possibili**;
- se ci sono **meno barre arancioni possibili**;
- se le **barre di colore verde fluo sono più corte** possibili;
- **meno blu** possibile;
- le linee verticali **Start Render e Document Complete dovrebbero avvenire il più presto possibile**, e queste linee devono essere il **più vicino possibile tra loro**. (lo vedi nella prossima schermata);
- se il **Waterfall fosse molto verticale**, significa che c’è un buon utilizzo della rete.

## Vista Connection View in WebPageTest

![La vista Connection View in WebPageTest](https://img.olegs.be/uploads/2016/10/connection-view-web-performance-webpagetest-960.jpg)

La vista Connection View in WebPageTest **mostra ogni connessione a un server e le richieste che vengono recuperate**.

**Il numero di richieste che ci vogliono per caricare la pagina è diverso dal numero di connessioni** che un browser fa per recuperare i contenuti.

Le parti chiare sono TTFB e quelle scure sono il download della risorsa.

Questo è un buon metodo per scoprire gli anti-pattern delle ottimizzazioni delle Web Performance del percorso di rendering critico.

Le connessioni aperte possono essere riutilizzate per trasferire le risorse dallo stesso dominio.

## Funzionalità Filmstrip, Video e Visual Comparison di WebPageTest

Vedi il video e la parte delle demo, a partire dal [minuto 52:00](https://youtu.be/1Jp9_0YJI7I?t=52m17s).

Puoi creare dei video di comparazione del tuo sito, di un sito della tua concorrenza o del tuo contro il loro.

Puoi **confrontare il risultato con la posizione geografica** del tuo hosting rispetto a una visita da vicino e una dall’altra parte del mondo.

Puoi **confrontare le velocità di connessione**, simulando la visita al tuo sito con una connessione a fibra e una con 3G.

> Many people have had success [convincing](https://x.com/kskoeld/status/607255499931820032) their [peers](https://x.com/AndyDavies/status/606920954170769408) [and](https://x.com/TheMattShull/status/607200762880352256) [VIPs](https://x.com/danielsleeth/status/606884233672589314) to care about performance using comparison videos.
> 
> — Lara Hogan

## WebPageTest.org Tricks

**Controlla la disponibilità delle risorse.** Essendo un tool pubblico, capita che ci sono delle code di attesa. [Questa pagina](http://bit.ly/2cwFlhk) serve per vedere la disponibilità in questo momento di ogni location di testing.

Puoi **generare un Waterfall personalizzato**, scegliendo solo le righe che ti servono oppure un lasso di tempo di caricamento. L’opzione si trova sotto la visualizzazione di un Waterfall e si chiama «customize waterfall».

C’è un modo per **elencare tutte le immagini presenti su una pagina** del sito che si sta analizzando. Comodo per vedere solo tutte le risorse di immagini, isolate in una schermata. L’opzione si trova sotto la visualizzazione di un Waterfall e si chiama «View all Images».

Con **Flow View** puoi simulare un percorso di visita attraverso più pagine e analizzare poi quella finale. Esempio: Home Page –> Blog –> Articolo. Si imposta dalla home page di WebPageTest, prima di fare un test, andando nelle impostazioni avanzate e nella scheda «Script». Per esempio:

`logData 0 navigate https://olegs.be/blog/ logData 1 navigate https://olegs.be/2016/07/nasce-meetup-turin-web-performance-group/`

Puoi anche fare **l’autenticazione e la manipolazione del DOM** nel tuo sito. Per esempio torna utile nel caso di **testing delle Web Performance di un’area riservata**. Si fa sempre andando nelle impostazioni avanzate e inserendo le istruzioni nella scheda «Script». Esempio:

`lodData 0 navigate https://olegs.be/login setValue id=u username setValue id=p password submitForm id=login-form logData 1 navigate https://olegs.be/profile/username`

Puoi **simulare il blocco delle richieste HTTP** di una risorsa. Utile per simulare per esempio il fallimento di caricamento di uno script di terze parti e l’effetto che crea sul rallentamento del sito e il suo rendering, conosciuto anche con il termine di [SPOF](https://it.wikipedia.org/wiki/Single_point_of_failure). Si fa sempre andando nelle impostazioni avanzate e inserendo le istruzioni nella scheda «Script». Esempio di blocco della pubblicità:

`block ads navigate https://olegs.be/`

Altri tips & tricks e la [documentazione completa](https://github.com/WPO-Foundation/webpagetest-docs) (in inglese).

## Utilizzi avanzati di WebPageTest

[**RESTful APIs**](https://github.com/WPO-Foundation/webpagetest-docs). Puoi inviare test facendo POST o GET verso https://www.webpagetest.org/runtest.php e riceverete una risposta in XML e altri formati.

[**Continuous Integration**](http://bit.ly/2cHotI2). Esiste un’integrazione con wrapper Node.js, Jenkins, Travis-CI e altri tool di CI.

[**Private Instances**](https://github.com/WPO-Foundation/webpagetest-docs). WebPageTest è disponibile come pacchetto software per l’installazione e la gestione di istanze private.

## Test sintetici oltre WebPageTest

[**YSlow**](http://yslow.org/) analizza le pagine web e perché sono lente, basandosi sulle regole di Web Performance di Yahoo! (sul loro sito ci sono una lista di 34 regole e Best Practices).

Disponibile in diversi modi: come estensione per i browser, come bookmarklet, Command Line (HAR), PhantomJS, Node.js e ovviamente il Source Code.

Io uso l’estensione per Chrome, per vedere nel tab «Components» il peso e il numero totale delle componenti di una pagina web.

Altri tool per fare test sintetici:

- [Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools/evaluate-performance?hl=en)
- [Pingdom Website Speed Test](https://tools.pingdom.com/)
- [Yellow Lab Tools](https://yellowlab.tools)
- [sitespeed.io](https://www.sitespeed.io/)

## Le principali cause di pessime Web Performance

- **Immagini** in formati errati e non ottimizzate;
- file testuali **(JS e CSS) non compressi** con Gzip;
- file **JavaScript e CSS non minificati**;
- utilizzo di **troppi font personalizzati**;
- molte **regole di CSS non utilizzate** nel front-end;
- **video** che si caricano in automatico;
- **script di terze parti** non raggiungibili (SPOF)…

In più abbiamo **Latency**, che è la quantità di tempo necessaria per un pacchetto di dati per arrivare da un punto all'altro. Ti ricordi che su mobile c’è anche la torre cellulare o ripetitore di mezzo?

Alcune cose sono [fuori dal tuo controllo](https://olegs.be/2016/06/fattori-prestazioni-velocita-web-non-sempre-sotto-nostro-controllo/) come: la rete dati che si sta utilizzando, il browser in utilizzo, il hardware dei dispositivi, la location geografica dei tuoi visitatori…

## Alcuni metodi per ottimizzare le Web Performance

- **Ottimizza le immagini** oltre Photoshop…;
- **riduci le richieste HTTP** al minimo;
- **minifica i file** CSS, JS e HTML delle pagine;
- **comprimi i file** CSS, JS e HTML con Gzip;
- **utilizzate una CDN** (Content Delivery Network);
- metti **CSS nel <head>** e **JS prima di </body>**;
- concatena JS e CSS (non serve con HTTP/2);
- **evita i redirect** inutili….

**Le immagini sono l’offensiva maggiore**, ma anche la cosa più facile da ottimizzare…

I signori di Dexecure hanno analizzato 4.3 milioni di immagini JPEG dai 500,000 siti top in httparchive.org, per un totale di 195GB di dati. Hanno trovato che il 38.9% di quelle immagini aveva dei metadati. In queste immagini, **i metadati occupavano nella media il 15.8% del peso totale dell’immagine!**

## Leggi i libri sulle Web Performance!

### «[Time Is Money](https://www.amazon.it/Time-Money-Business-Value-Performance/dp/1491928743/)» di Tammy Everts

![Libro Time Is Money di Tammy Everts](https://img.olegs.be/uploads/2016/10/libro-time-is-money-tammy-everts-960.jpg)

Libro culturale sull’importanza delle Web Performance nel mondo ecommerce.

### «[Using WebPageTest](https://www.amazon.it/Using-WebPageTest-Rick-Viscomi/dp/1491902590/)» di Rick Viscomi, A. Davies e M. Duran

![Libro Using WebPageTest di Rick Viscomi, A. Davies e M. Duran](https://img.olegs.be/uploads/2016/10/libro-using-webpagetest-960.jpg)

Libro tecnico su come usare WebPageTest, che parte in modo semplice e arriva ai capitoli molto complessi.

### «[Designing for Performance](https://www.amazon.it/Designing-Performance-Weighing-Aesthetics-Speed/dp/1491902515/)» di Lara Callender Hogan

![Libro Designing for Performance di Lara Callender Hogan](https://img.olegs.be/uploads/2016/09/libro-designing-for-performance-lara-hogan-960.jpg)

Ottimo libro culturale per designer e sviluppatori, ma anche per persone che operano nel web in generale.

### «[Responsible Responsive Design](https://amzn.to/2ckcl1B)» di Scott Jehl

![Libro Responsible Responsive Design di Scott Jehl](https://img.olegs.be/uploads/2016/10/libro-responsible-responsive-design-scott-jehl-960.jpg)

Ottimo libro per chi fa sviluppo front-end e responsive web design.

## Iscriviti ai blog sulle Web Performance

- [Web Performance Today](http://bit.ly/2cvlobR) – Blog curato da Kent Alstad di Radware;
- [O'Reilly Performance](http://oreil.ly/2cc1aWi) – Blog su O'Reilly Media;
- [Planet Performance](http://bit.ly/2caZny7) – Aggregatore di RSS curato dal Stoyan Stefanov. Anche tu puoi contribuire alla lista dei siti su GitHub;
- [Catchpoint’s Blog](http://bit.ly/2cvlq3p) – Blog della società Catchpoint che offre strumenti di end-user monitoring;
- [Blog di Steve Souders](http://bit.ly/2cEOXLv);
- [Blog di Ilya Grigorik](http://bit.ly/2cHVhTI);
- [Blog di Tim Kadlec](http://bit.ly/2c0xsXk).

## Guarda i video corsi sulle Web Performance

**Gratuiti:**

- corso di [Website Performance Optimization](http://bit.ly/1XLxEq4) su Udacity;
- corso di [Browser Rendering Optimization](https://www.udacity.com/course/browser-rendering-optimization--ud860) su Udacity.

**A pagamento:**

- corso di [High Speed UX](https://www.oreilly.com/videos/high-speed-ux/9781491943588/) con Steve Souders;
- corso [Introduction to WPO](https://www.oreilly.com/videos/introduction-to-web/9781771373883/) con Kent Alstad.

## Partecipa alla comunità delle Web Performance

- Se sei di Torino o dintorni, vieni a trovarmi al meetup del Turin Web Performance Group che si tiene ogni fine mese;
- partecipa nel gruppo Web Performance su Slack (in inglese);
- entra e partecipa nel [gruppo Web Performance Italia](http://bit.ly/29MRgHA) su Facebook.

Ti aspetto 😉 🚀

## Leggi e studia i case studies su wpostats.com

Su [wpostats.com](https://wpostats.com/) ci sono i case studies ed esperimenti che dimostrando l’impatto delle ottimizzazioni delle web performance (WPO) sulla user experience e metriche di business.

> Il 23% delle persone ha maledetto il proprio dispositivo mobile, il 11% ha urlato contro e [**il 4% lo ha gettato via**](https://giphy.com/gifs/test-jess-angry-frustrated-cell-phone-1080AfGtovINTq), dopo aver percepito problemi di performance durante una transazione.
> 
> — Ricerca di Harris Interactive per Tealeaf, 2011

Leggi spesso i nuovi case studies su [wpostats.com](https://wpostats.com/), per convincerti che le performance contano e convincere i tuoi clienti, capi o membri del team di prenderle in considerazione sul serio e mettere le persone al centro di tutto…

…perché altrimenti, se non misuri e non ottimizzi i siti che realizzi, questo è quello che le persone probabilmente faranno mentre visiteranno questi siti lenti, soprattutto da mobile… 😡

![Uomo incazzato lancia il suo telefono contro il muro](https://img.olegs.be/uploads/2016/09/mobile-web-is-slow-phone-rage-throw-wall-960.jpg)

## Il video intero del mio talk

<iframe src="https://www.youtube.com/embed/1Jp9_0YJI7I" width="320" height="180" frameborder="0" allowfullscreen="allowfullscreen"></iframe>

## Le slide del mio talk

<iframe src="//www.slideshare.net/slideshow/embed_code/key/n0E5sn7QDO52gM" width="320" height="180" frameborder="0" marginwidth="0" marginheight="0" scrolling="no" allowfullscreen="allowfullscreen"></iframe>

Grazie per la tua attenzione! Se hai delle domande da farmi o vuoi aggiungere qualcosa, scrivimi tutto nei commenti qui sotto.

**[#perfmatters](https://x.com/hashtag/perfmatters) [#webperf](https://x.com/hashtag/webperf)**
