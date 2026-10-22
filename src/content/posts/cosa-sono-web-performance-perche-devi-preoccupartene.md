---
title: Cosa sono le Web Performance e perché devi preoccupartene
date: "2016-10-13T19:00:19"
categories:
  - wordpress
  - web-performance
  - user-experience
  - meetup
cover: 2015/02/olegs-belousovs-web-performance.jpg
lang: it
oldSlugs: []
excerpt: Talk culturale e esplorativo sulle Web Performance che ho fatto al WordPress Meetup di Torino (del quale sono co-organizzatore) il 12 ottobre del 2016.
---

![Olegs Belousovs – Web Performance](https://img.olegs.be/uploads/2015/02/olegs-belousovs-web-performance-960.jpg)

***Le slide e il video del talk sono [al fondo dell’articolo](#video-slide).***

## Ti piace la velocità?

![Treno giapponese Shinkansen Serie 500](https://img.olegs.be/uploads/2016/10/cosa-sono-web-performance-perche-devi-preoccupartene-03-960.jpg)

Questo è un treno giapponese Shinkansen Serie 500 con la velocità massima di 320 km/h.

Vorresti poter prendere un treno così per arrivare a destinazione, oppure un treno regionale di Trenitalia? 🙂

![Attesa dei bagagli in un aeroporto](https://img.olegs.be/uploads/2016/10/cosa-sono-web-performance-perche-devi-preoccupartene-04-960.jpg)

Questo scenario ti è noto? Piacevole o no? Soprattutto quando si ritorna dalle vacanze… 🙂

### La storia dell’aeroporto di Houston

Dopo che le autorità aeroportuali hanno analizzato la situazione delle lamentele dei passeggeri più a fondo, è stato rivelato che ci voleva circa un minuto per arrivare dal gate di arrivo al ritiro bagagli, in questo modo i passeggeri dovevano trascorrere più di 7 minuti di attesa per le loro valigie.

La soluzione dell’aeroporto è stata di spostare i gate degli arrivi più distante dalla zona di ritiro bagagli, in modo da fare la strada di circa 7 minuti per raggiungere quella zona. Il risultato è stato che i reclami si sono ridotti praticamente a zero.

![Pulsante di chiamata per l’attraversamento pedonale](https://img.olegs.be/uploads/2016/10/cosa-sono-web-performance-perche-devi-preoccupartene-05-960.jpg)

Questi dispositivi ci sono in tutto il mondo ma molti non funzionano (e in alcune città funzionano solo di notte).

Per esempio nella città di New York ce ne sono centinaia se non migliaia di questi pulsanti e molti sono disattivati. Le persone continuano a schiacciarli anche se senza risultato.

Aspettare al semaforo per attraversare la strada è attesa passiva. Il pulsante ci da il pensiero di controllare la situazione e diventiamo più tolleranti all’attesa passando da quella passiva a quella attiva.

![Pulsante di chiusura e apertura porte dell’ascensore](https://img.olegs.be/uploads/2016/10/cosa-sono-web-performance-perche-devi-preoccupartene-05-1-960.jpg)

Altro esempio simile a quello di prima. Conosci questo pulsante?

Vogliamo sempre arrivare più velocemente a destinazione… quindi la velocità conta, sempre!

Negli ascensori c’è anche un altro elemento che fa sì che passiamo dall’attesa passiva a quella attiva… Sai qual’è? Lo specchio… dove ci possiamo specchiare e vedere come siamo belli mentre saliamo o scendiamo…

Sul web non è tanto diverso, **una persona che sta cercando delle informazioni o deve acquistare un prodotto, vuole farlo in modo rapido e senza intoppi**.

Conclusione: **le persone odiano aspettare!**

## La definizione di Web Performance

Le Web Performance si riferiscono alla velocità con la quale le pagine web vengono scaricate e visualizzate in un web browser dell’utente.

Web Performance Optimization (WPO), o meglio le ottimizzazioni dei siti web, sono il settore delle conoscenze sull’aumento delle prestazioni web.

*Fonte: [Wikipedia](https://en.wikipedia.org/wiki/Web_performance)*

## Perché è importante che i tuoi siti web siano veloci e quali fattori vengono influenzati dalla lentezza?

### Fattori umani e psicologici – User Experience

La parte più importante per una persona che visita un sito web sono le **[prestazioni percepite](https://olegs.be/2016/06/ottimizzare-percorso-rendering-critico-migliorare-prestazioni-web-percepite/)**. Quindi, non importa tanto il tempo che ci mette il tuo sito web a caricarsi in totale, quanto **la velocità con la quale il tuo visitatore inizia a vedere i contenuti sullo schermo e può cominciare a interagire**.

Nel suo libro «[High Performance Browser Networking](https://amzn.to/2eZIbBZ)», Ilya Grigorik delinea metriche per la percezione della velocità negli umani:

- **100 millisecondi** come tempi di risposta sembrano immediati;
- **100-300 millisecondi** creano un piccolo, ma percettibile, ritardo;
- **300-1000 millisecondi** si percepiscono come «funziona»;
- **1 secondo** costituisce un notevole ritardo per un utente. Interrompe il flusso di pensiero e, probabilmente, l’utente inizierà a cambiare il contesto mentalmente;
- **10 secondi** – «torno dopo…».

**Abbiamo la memoria a breve termine limitata**, più aspettiamo e più il compito da eseguire risulta difficile.

**L’uomo ha bisogno del sentimento di controllo.** L’attesa e l’impossibilità di controllare la situazione genera la frustrazione e l’ansia.

### La lentezza ha un impatto sul tuo brand

Uno studio di Gomez dice che **88% delle persone difficilmente torneranno su un sito web, dopo aver vissuto un’esperienza lenta**… quindi queste persone andranno dalla concorrenza.

Relativo alle **prestazioni percepite**, approfondisci il concetto del [contenuto above-the-fold](https://developers.google.com/speed/docs/insights/PrioritizeVisibleContent?hl=it), la tecnica [critical CSS](https://www.smashingmagazine.com/2015/08/understanding-critical-css/) e così dette [ottimizzazioni del percorso di rendering critico](https://olegs.be/2016/06/ottimizzare-percorso-rendering-critico-migliorare-prestazioni-web-percepite/) (Critical Rendering Path).

Quindi oltre al hardware del device c’è da considerare prima di tutto il nostro «processore» e come funziona, cioè il cervello umano. 👾

### La velocità è valore – Le metriche di business

Innumerevoli studi hanno trovato una connessione indiscutibile tra i tempi di caricamento di un sito web e le metriche di business come il numero di pagine viste, il tasso di conversione e la frequenza di rimbalzo.

Se hai a cuore di offrire un’esperienza utente più veloce per i tuoi clienti online, prendi in considerazione seriamente il **costante monitoraggio e la misurazione delle performance di velocità del tuo sito web e-commerce**.

Non avere un sito web mobile-friendly e ottimizzato per alte prestazioni, significa aiutare i tuoi concorrenti ad avere più successo…

> Il 23% delle persone ha maledetto il proprio dispositivo mobile, il 11% ha urlato contro e **il 4% lo ha gettato via**, dopo aver percepito problemi di performance durante una transazione.
> 
> — Ricerca di Harris Interactive per Tealeaf, 2011

![Uomo incazzato lancia il suo telefono contro il muro](https://img.olegs.be/uploads/2016/09/mobile-web-is-slow-phone-rage-throw-wall.gif)

### Ottimizzazione per i motori di ricerca (SEO)

Ottimizzando la velocità del tuo sito automaticamente migliori anche SEO.

Il tempo di caricamento di una pagina è uno dei fattori importanti di ranking sui motori di ricerca.

**Un sito web eccessivamente lento avrà un posizionamento sui motori di ricerca peggiore rispetto ad un altro sito web più veloce.**

Oramai, le informazioni che Google conta la velocità di un sito web come uno dei fattori di ranking [sono ufficiali](https://searchengineland.com/google-now-counts-site-speed-as-ranking-factor-39708) (già dal 2010).

> Dopo aver ottimizzato la velocità di caricamento del loro sito web, smartfurniture.com **ha visto un incremento del 20% del traffico organico, del 14% le visualizzazioni delle pagine e soprattutto una crescita di vendite**.
> 
> — [Margaret Kuchler di Akamai Technologies, 2011](https://www.retailtouchpoints.com/features/executive-viewpoints/the-growing-need-for-speed-how-site-performance-increasingly-influences-search-rankings)

Guardati su WordPress.tv il [talk di Gianni Vascellari su WordPress e SEO](https://wordpress.tv/2016/09/15/gianni-vascellari-wp-seo/), fatto al WordPress Meetup Torino di settembre. Ha parlato anche lui un po’ di Web Performance e del legame con SEO.

### Dispositivi mobile connessi a Internet

**Per alcune persone il mobile sarebbe l’unico Internet che conoscono.**

Si chiamano utenti «[mobile-only](https://www.comscore.com/Insights/Blog/Number-of-Mobile-Only-Internet-Users-Now-Exceeds-Desktop-Only-in-the-U.S)» e non hanno mai avuto accesso a Internet da un computer o altri dispositivi con risorse maggiori e schermi grandi.

Verifica che il tuo sito web sia adatto per i risultati di ricerca di Google ottimizzati per i dispositivi mobili.

Test di compatibilità con dispositivi mobili: [http://bit.ly/1EVi9R3](https://search.google.com/test/mobile-friendly?utm_source=mft&utm_medium=redirect&utm_campaign=mft-redirect)

> Un terzo (32%) degli utenti lamenta che i siti web e app su mobile sono lenti a caricare.
> 
> — Harris Interactive (per Skava), 2013

C’è anche da prendere in considerazione la parte hardware dei dispositivi mobile. **Alcuni dispositivi hanno la quantità di memoria di un Pentium 486 degli anni '90**…

Per esempio, le immagini progressive consumano molti cicli del processore e di conseguenza tirano giù la batteria, come anche i siti pesanti in generale.

Oltre al hardware e molto più importante, ci sarebbe il fenomeno della latenza di rete (network latency o RTT – Round Trip Time). Quando inserisci l’indirizzo di un sito web da una connessione 3G o 4G nel browser del tuo dispositivo mobile, la richiesta non va direttamente al server dove sta il tuo sito web ma prima al ripetitore o la torre cellulare più vicina, e poi da lì solamente al server, idem al ritorno, quando una risorsa viene spedita dal server al browser. Esempio: un’immagine o un file JS/CSS.

Qui potrei farti rivedere la GIF di prima 😁

![Frammentazione della dimensione degli schermi sui dispositivi Android dal report del 2014 di Open Signal](https://img.olegs.be/uploads/2016/10/cosa-sono-web-performance-perche-devi-preoccupartene-14-960.jpg)

*Frammentazione della dimensione degli schermi sui dispositivi Android – [Report del 2014 di Open Signal](https://www.theguardian.com/technology/2014/aug/22/android-fragmented-developers-opensignal).*

### Crescita di persone connesse a Internet al livello mondiale

Nel 2000 c’erano solo 400 milioni di utenti Internet in tutto il mondo. **Oggi, gli utenti di Internet sono [oltre 3 miliardi](https://www.internetlivestats.com/internet-users/)** (la popolazione del nostro pianeta, ammonta a circa 7.4 miliardi di persone).

**Nei prossimi 5 anni, circa altri 4 miliardi di persone avranno accesso a Internet**, grazie a diverse iniziative e progetti come [Project Loon](https://loon.com).

**E i tuoi siti web sono abbastanza veloci per essere visti non da un iPhone o altri dispositivi di ultima generazione**, ma da dispositivi mobile molto più economici, con schermi più piccoli e con processori più lenti?

In più, **ogni kilobyte scaricato per le persone su mobile ha un costo**. Potete verificare il costo della visualizzazione del vostro sito web in diversi paesi con questo servizio: What Does My Site Cost?

Sei pronto per questi 4 miliardi di nuovi possibili visitatori o clienti?

## Alcuni dati presi dalle ricerche fatte sulle Web Performance

> 3 secondi di attesa basterebbero all’80% dei visitatori per decidere di abbandonare un sito web lento.
> 
> — [State of the Union, 2015](https://www.radware.com/spring-sotu2015-lpc-6442455858/)

> Il 60% degli utenti di Internet si aspetta la stessa User Experience sia su mobile che su desktop.»
> 
> — [Radware Fastview, 2015](https://www.radware.com/spring-sotu2015-lpc-6442455858/)

> Il 71% delle 1500 persone intervistate, si sente regolarmente infastidito dai siti web lenti.»
> 
> — “Need for Speed,” 1&1 Internet, 2011

> Il 33% degli utenti insoddisfatti racconterà agli altri l’esperienza negativa vissuta su un sito web.
> 
> — [Radware Fastview, 2015](https://www.radware.com/spring-sotu2015-lpc-6442455858/)

> Oggi, il 49% delle persone online si aspetta i tempi di caricamento di 2 secondi o meno, e il 18% (1 su 5) si aspetta che le pagine web si carichino in modo istantaneo.»
> 
> — Akamai Technologies, 2014

Puoi trovare altri case studies simili su [wpostats.com](https://wpostats.com/)

Questo, diciamo, era il «perché» preoccuparsi delle Web Performance, ora vediamo il «come» individuare i problemi e «cosa» li causa.

## Strumenti per misurare le Web Performance

Prima devi misurare le prestazioni attuali del tuo sito web, individuare i vari problemi che lo rendono lento e solo dopo pensare alle ottimizzazioni da fare.

Essendo ogni sito web diverso da un altro, senza una misurazione accurata non serve buttare sopra tutti i plugin e le tecniche di ottimizzazione di questo mondo, perché si rischia di finire a fare over-optimization, che è un concetto spesso nominato anche in SEO.

In poche parole, non serve strafare… ma è ovvio che **ogni byte ottimizzato conta**!

### Test di misurazione sintetici

Diciamo che si tratta di una simulazione dello stato di salute del tuo sito.

Facendo un **[test sintetico](https://olegs.be/2016/09/come-eseguire-test-sintetici-web-performance-webpagetest-org/)** con uno degli strumenti disponibili gratuitamente (WebPagetest.org, Pingdom Website Speed Test o Google PageSpeed Insights), **riesci a simulare una visita al tuo sito web con delle condizioni da te scelte**, vedendo i dettagli del risultato alla fine.

1. Puoi comparare il tuo sito web con quelli dei tuoi competitor;
2. puoi verificare come il design del tuo sito web influisce sulle Web Performance;
3. riesci a capire come si comporta la tua nuova versione del sito web rispetto alla precedente.

### WebPagetest.org (vista Waterfall)

![Screenshot di WebPagetest.org (vista Waterfall)](https://img.olegs.be/uploads/2016/10/cosa-sono-web-performance-perche-devi-preoccupartene-25-960.jpg)

Io utilizzo per lo più questo tool open source che si chiama [WebPageTest.org](https://www.webpagetest.org/) e te lo consiglio vivamente.

### WebPagetest.org (vista Filmstrip)

![Screenshot di WebPagetest.org (vista Filmstrip)](https://img.olegs.be/uploads/2016/10/cosa-sono-web-performance-perche-devi-preoccupartene-26-960.jpg)

Puoi vedere con la frazione di mezzo secondo e anche meno i fotogrammi di come avviene il rendering del tuo sito web e cosa vede una persona per prima cosa sullo schermo.

Queste sono metriche di User Experience e non dei numeri vanitosi come Load Time o il punteggio di PageSpeed Insights

### WebPagetest.org (confronto video)

<iframe src="https://www.youtube.com/embed/64FdytErJnw" width="320" height="180" frameborder="0" allowfullscreen="allowfullscreen"></iframe>

Questo strumento permette di comparare due siti e vederli caricarsi fianco a fianco. Ottimo per mostrare per esempio a un cliente come è messo in confronto alla sua concorrenza. Si può anche fare il test del vostro sito con connessioni diverse o con browser diversi o da location nel mondo diverse e vedere una comparazione fianco a fianco.

Torino vince di 800ms (quasi 1 secondo). Tra l’altro, lo sai che il [WordCamp Milano 2016](https://2016.milano.wordcamp.org/) sarà il 21 e 22 ottobre?

Tutti questi dati sono legati per lo più alle performance percettive e a esperienza utente.

Se vuoi sapere di più su webpagetest.org, guarda [il video del mio talk](https://www.youtube.com/watch?v=1Jp9_0YJI7I) fatto il mese scorso al Meetup del gruppo Web Performance di Torino.

### Google PageSpeed Insights

![screenshot di Google PageSpeed Insights](https://img.olegs.be/uploads/2016/10/cosa-sono-web-performance-perche-devi-preoccupartene-28-960.jpg)

Ti restituisce un numero che è un po’ una *vanity metric*, perché non ti mostra bene i dettagli. Diventa però un’ossessione arrivare a 100% e [io ci riesco](https://developers.google.com/speed/pagespeed/insights/?url=https%3A%2F%2Folegs.be%2F) con il mio sito web. 😎

Ti mostra anche una serie di suggerimenti e link agli approfondimenti. Lo strumento fa un test sintetico sia su schermi piccoli che su quelli grandi. Non si conosce però nulla sulla macchina e le impostazioni di dove avviene realmente questo test.

Ci sarebbe anche [Pingdom Website Speed Test](https://tools.pingdom.com/) e mostra un po’ più di informazioni, compreso il waterfall e la possibilità di scelta della location.

Altro tool che ti consiglio e [YSlow](http://yslow.org/) e puoi scaricarlo come estensione per Google Chrome.

### Google Chrome DevTools

![Screenshot di Google Chrome DevTools](https://img.olegs.be/uploads/2016/10/cosa-sono-web-performance-perche-devi-preoccupartene-29-960.jpg)

Ci sono anche gli strumenti per gli sviluppatori integrati nel tuo web browser. In questo caso, il browser è Google Chrome e le schede relative alle Web Performance sono «Timeline» e «Network».

Puoi aprire il pannello con *alt+cmd+I* su Mac e *Shift+Ctrl+I* sul resto dei sistemi operativi.

Questo è uno strumento molto potente con la possibilità di analizzare nel dettaglio ogni sito web.

Per esempio, è comodo per vedere se sul server è già attivo il protocollo HTTP/2. Ovviamente il sito web dovrebbe usare un certificato SSL per usufruire di questa nuova tecnologia.

Se ti interessa, c’è un [video](https://www.youtube.com/watch?v=aXQQXSxIyQU) di Simone Bordet dal Meetup di Turin Web Performance Group (meetup che organizzo io), che spiega bene tutti i vantaggi di questa tecnologia.

Controlla con il tuo fornitore di hosting se HTTP/2 è già attivo sulle loro macchine.

## Monitoraggio degli utenti reali – RUM

![Screenshot di monitoraggio degli utenti reali (RUM) con Google Analytics](https://img.olegs.be/uploads/2016/10/cosa-sono-web-performance-perche-devi-preoccupartene-30-960.jpg)

Quelli di prima erano tutti test sintetici, questo invece è un RUM e sta per «Real User Monitoring».

A differenza dei test sintetici, che sono soltanto una simulazione, **questo test mostra dati reali dei visitatori del tuo sito con le loro condizioni reali di connessione, location, OS, browser e dispositivi in uso**.

Dati che sono da monitorare e fare comparazione con i test sintetici. Inoltre, in Google Analytics si possono fare report incrociati e verificare per esempio come le cattive Web Performance siano legate al bounce rate.

## Le principali cause di pessime Web Performance

- Immagini in formati errati e non ottimizzate;
- file testuali (JS e CSS) non compressi con Gzip;
- file JavaScript e CSS non minificati;
- utilizzo di troppi font personalizzati;
- molte regole di CSS inutilizzate nel front-end;
- video che si caricano in automatico;
- script di terze parti non raggiungibili (SPOF).

## kB medi per pagina divisi per tipo di contenuto

![kB medi per pagina divisi per tipo di contenuto](https://img.olegs.be/uploads/2016/10/cosa-sono-web-performance-perche-devi-preoccupartene-32-960.jpg)

*Fonte: [httparchive.org](https://httparchive.org/reports/state-of-the-web?start=latest#bytesperpage)*

Come vedi, le immagini sono l’offensiva maggiore delle Web Performance e fanno oltre il 60% di tutte le risorse che compongono i siti web su Internet.

Quello evidenziato in rosso, invece, è il peso di un sito medio oggi, quasi 2 mega e mezzo! Pazzesco! Se pensi che 5-6 anni fa era sotto 1 mega. 🙃

## Proiezione: pagine da 3 MB nel 2017?

![Proiezione: pagine da 3 MB nel 2017?](https://img.olegs.be/uploads/2016/10/cosa-sono-web-performance-perche-devi-preoccupartene-33-960.jpg)

*Fonte: [Tammy Everts, SOASTA](https://www.speedcurve.com/blog/web-performance-page-bloat/) (novembre 2015)*

Penso che con questo andamento e con l’utilizzo di alcuni temi WordPress, quelli «tutto-fare», ci arriveremo molto in fretta a uno scenario del genere…

## Sfatiamo qualche mito sulle ottimizzazioni delle Web Performance?

### «Acquisto un server più potente»

Non serve sempre acquistare dei server più potenti e spendere soldi inutilmente, non sono strategie che vanno bene a lungo termine.

Sarebbe un po’ come continuare a spegnere gli incendi, senza cercare di capire come mai cominciano e fare qualcosa in modo da evitarli in futuro.

> 80-90% del tempo degli utenti, che aspettano le pagine web che si caricano, viene speso nel front-end. Cominciate da lì.
> 
> — Steve Souders

### «Le connessioni diventano più veloci»

![Un grafico che mostra un test di velocità fatto sul sito etsy.com](https://img.olegs.be/uploads/2016/10/cosa-sono-web-performance-perche-devi-preoccupartene-36-960.jpg)

Questo grafico mostra un test di velocità fatto sul sito etsy.com

> Aumentando la banda di 1,233% è risultato in pagine che erano appena del 55% più veloci, il che significa che le reti più veloci non sono la cura delle prestazioni, come alcune persone pensano.
> 
> — Tammy Everts, Time is Money

Quindi, anche se in parte la velocità della connessione favorisce la velocità di caricamento di un sito, ad un certo punto però raggiunge quasi un plateau.

### «Le ottimizzazioni delle Web Performance sono da fare solo a fine progetto»

Molti pensano che il testing delle Web Performance sarebbe da fare solo al progetto finito.

Il tutto per una questione di tempi e costi e succede nella maggior parte dei casi, soprattutto nelle tradizionali agenzie web, dove manca la cultura delle Web Performance.

Questo crea dei problemi a monte, soprattutto perché sicuramente **servirà ritornare all’inizio del progetto e rivedere l’architettura** del sito web lento.

Al posto di sprecare tempo e risorse preziose testando alla fine, un team di lavoro dovrebbe sfruttare le soluzioni di test delle web perf durante tutto il processo di design e sviluppo, correggendo eventuali problemi o sviste in modo più facile e meno costoso.

**Prevenire per non curare.**

Sempre più aziende stanno adottando un **approccio di test continuo**, realizzando piccoli test di performance durante lo sviluppo nella fase iniziale.

**«Lo facciamo poi» = Mai.**

Quindi, dovrebbe essere il compito di tutte le persone coinvolte in un team web, a partire dalla strategia dei contenuti e passando dal design e codice…

Dopo aver visto il «cosa» causa i problemi di Web Performance, vediamo ora invece «come» risolverli…

## Alcuni metodi per ottimizzare le Web Performance

Di conseguenza queste sono anche le cause della cattive Web Performance…

- Riduci le richieste HTTP al minimo;
- ottimizza le immagini oltre Photoshop;
- minifica i file CSS, JS e HTML delle pagine;
- comprimi i file CSS, JS e HTML con Gzip;
- utilizza una Content Delivery Network;
- metti CSS nel <head> e JS prima di </body>;
- concatena JS e CSS (non serve con HTTP/2);
- evita i redirect inutili.

Aggiungo e ti parlo di nuovo delle immagini che sono l’offensiva maggiore, ma anche la cosa più facile da ottimizzare.

I signori di Dexecure hanno analizzato 4.3 milioni di immagini JPEG dai 500,000 siti top in httparchive.org, per un totale di 195GB di dati.

Hanno trovato che il 38.9% di quelle immagini aveva dei metadati. In queste immagini, **i metadati occupavano nella media il 15.8% del peso totale dell’immagine**!

**Usa i formati file giusti e ottimizza le tue immagini oltre Photoshop con strumenti come ImageOptim** (su Mac).

## «E come lo faccio con WordPress?»

«Finalmente!», penserai in questo momento… 😜

Per chi sviluppa i temi e plugin si applicano le regole e le tecniche descritte prima.

Per chi non sviluppa niente ma utilizza WordPress più per pubblicare i contenuti, ci sono degli accorgimenti base e alcuni plugin da utilizzare.

Scegli con cura il hosting, possibilmente più vicino al tuo audience principale, analizzando prima le statistiche.

Fai le prove di velocità della demo, prima di acquistare un tema WordPress premium.

Misura ogni volta le Web Performance, dopo aver attivato un plugin o inserito uno script di terze parti che interviene sul front-end.

Ottimizza le immagini prima di caricarle nella libreria dei media, ridimensionandole e comprimendole ulteriormente con ImageOptim o simile.

Disinstalla e cancella i plugin inutilizzati o non necessari…

## Plugin per migliorare le Web Performance su WordPress

- [W3 Total Cache](https://it.wordpress.org/plugins/w3-total-cache/)
- [WP Rocket](https://wp-rocket.me) (Premium)
- [Scripts To Footer](http://bit.ly/2cazLEx)
- [Plugin Organizer](https://wordpress.org/plugins/plugin-organizer/)
- [EWWW Image Optimizer](https://wordpress.org/plugins/ewww-image-optimizer/)
- [WP Lazysizes](http://bit.ly/2ckB5GR)
- [Plugin Performance Profiler](http://bit.ly/2cUyu60)

## La cultura delle Web Performance

**Le Web Performance sono un mind-set.**

Tutte le persone che toccano con mano in qualche modo il web, dovrebbero sapere queste cose e prenderle in considerazione sul serio, sempre.

**Usa i vari case studies rilevanti per convincere sull’importanza delle Web Performance** le altre persone del vostro team o in azienda.

Mostra un confronto del sito web con i principali competitor, utilizzando per esempio il confronto video di WebPagetest.org che abbiamo visto prima.

> Innanzitutto, noi crediamo che la velocità è più di una caratteristica. La velocità è la caratteristica più importante.
> 
> — Fred Wilson, Union Square Ventures

### Libri sulle Web Performance

Quindi, parlando sempre di cultura, **a volte basta un libro per cambiare il tuo mind-set** e in confronto a una conferenza, dove magari c’è una persona che ti legge cosa c’è scritto in un libro, vale la pena di spendere 20/30 € e leggerlo da soli, al posto di spenderne magari 200/300 €.

Invece i workshop penso che sono molto meglio, almeno tocchi con mano e capisci davvero come fare.

Questi sono i libri che mi hanno dato molto…

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

### Blog sulle Web Performance

- [Web Performance Today](http://bit.ly/2cvlobR)
- [O'Reilly Performance](http://oreil.ly/2cc1aWi)
- [Planet Performance](http://bit.ly/2caZny7)
- [Catchpoint’s Blog](http://bit.ly/2cvlq3p)
- [Steve Souders](http://bit.ly/2cEOXLv)
- [Ilya Grigorik](http://bit.ly/2cHVhTI)
- [Tim Kadlec](http://bit.ly/2c0xsXk)

### Web Performance Community

- Meetup del Turin Web Performance Group
- Gruppo Web Performance su Slack (in inglese)
- [Gruppo Web Performance Italia su Facebook](http://bit.ly/29MRgHA)

![WordPress community al Contributor Day del WordCamp Torino 2016](https://img.olegs.be/uploads/2016/10/wordcamp-torino-2016-contributor-day-wordpress-people-community-960.jpg)

*Foto di Gianni Vascellari al Contributor Day del WordCamp Torino 2016.*

Il web lo facciamo tutti noi, per altre persone come noi, e anche se questo argomento, insieme all’accessibilità e alla sicurezza, può sembrare il meno «sexy», dovresti preoccupartene non meno di che tema e plugin usare sul tuo sito WordPress, proprio per il rispetto delle persone che poi visitano i siti che fai e per rendere tutti insieme il web un posto migliore!

## Il video intero del mio talk

<iframe width="560" height="315" src="https://videopress.com/embed/2qGsKO6U" frameborder="0" allowfullscreen="" allow="clipboard-write"></iframe><script src="https://videopress.com/videopress-iframe.js"></script>

Grazie per l’attenzione!

Ora mettiti al lavoro per rendere il web più veloce ;)
