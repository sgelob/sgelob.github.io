---
title: Fattori di prestazioni di velocità web che non sono sempre sotto il nostro controllo
date: "2016-06-07T10:00:27"
categories:
  - web-performance
  - user-experience
cover: 2016/06/frammentazione-dispositivi-mobile-android-opensignal-agosto-2014.png
lang: it
seoTitle: Fattori di prestazioni di velocità web fuori dal nostro controllo
seoDescription: I fattori fuori controllo sono la lentezza della rete mobile, browser utilizzato su dispositivo e la distanza fisica dell’utente dal server di un sito web.
oldSlugs: []
excerpt: Pur facendo tutte le ottimizzazioni delle prestazioni di velocità per il web di questo mondo, restano lo stesso dei fattori che sono proprio fuori dal nostro controllo. Per esempio la lentezza della rete mobile, tipo di browser utilizzato su un dispositivo mobile e anche la distanza fisica dell’utente dal server dove risiede il tuo sito web. Queste cose sono da prendere in considerazione seriamente e provare a immaginare e simulare le varie situazioni nelle quali un utente si potrebbe trovare.
---

## Posizione geografica

**I fattori fuori dal nostro controllo sono per lo più lato geografico**, per questo motivo ti consiglio di usare una CDN (content delivery network) per i tuoi file JS, CSS e soprattutto per le immagini.

Durante la visita di un sito web **il browser fa delle [richieste fisiche al server](https://olegs.be/2016/05/ottimizzare-richieste-browser-server-caricare-risorse-compongono-sito-web/) per recuperare le risorse** che lo compongono (immagini, CSS, JS etc…) e la velocità di caricamento dipende anche in base a quanto sei distante fisicamente da questo server.

**Nelle prestazioni di velocità del web, il concetto si chiama *latency*** e indica la quantità di tempo necessario per il server dove risiede il tuo sito web di ricevere ed elaborare una richiesta per una risorsa di una pagina web.

Se il tuo server si trova in Italia e invece i tuoi utenti per lo più sono in Cina, **considera seriamente di prendere un server più vicino a loro o usa una CDN**. Una CDN serve per avere copie dei dati del tuo sito web su più server nel mondo e fornire i file agli utenti che lo visitano da un server più vicino a loro fisicamente. Puoi monitorare le statistiche del tuo sito web e vedere da dove provengono la maggior parte delle visite e in base ai dati scegliere una strategia ben pianificata.

La posizione geografica, sommata alla copertura di rete mobile, fa un mix micidiale, soprattutto se il sito web che si sta visitando non è responsive e non stato ottimizzato per le prestazioni di velocità.

## Tipi di connessione di rete

**La velocità di connessione varia molto sia da paese a paese che da zone sullo stesso territorio nazionale**, soprattuto se si parla di connessioni dati sui dispositivi mobile. Considera sempre che di sicuro tu farai i test del tuo sito web con una velocità che non rappresenta la media di quella dei tuoi visitatori. Ci sono degli strumenti adatti per simulare le connessioni a reti lente, come per esempio il tool per Mac che si chiama [Network Link Conditioner](https://nshipster.com/network-link-conditioner/). Puoi anche [simulare una connessione con DevTools di Google Chrome](https://developers.google.com/web/tools/chrome-devtools/network/network-conditions?hl=en), selezionato nelle opzioni della scheda «Network» la voce *Throttling*.

Inoltre, **il peso del tuo sito web incide molto sugli utenti che lo visitano da mobile**, in quanto il trasferimento dei dati sui dispositivi portatili hanno un costo per le persone e significa che se il tuo sito web pesa molto sarà caro da visitare.

> Gli utenti da dispositivi mobili (smartphone e/o tablet) sono stati 22.4 milioni nel mese di marzo 2016, pari al 50,8% della popolazione italiana tra i 18 e i 74 anni.
> 
> – [Audiweb, marzo 2016](https://www.audiweb.it/static/upload/porting/2016/05/Audiweb_CS_Total_Digital_Audience_Marzo_2016.pdf)

Oggi, anche se gli operatori telefonici ci vendono dei piani tariffari di dati 4G, in realtà **i nostri dispositivi non sono mai solo su 4G ma saltano di continuo da una connessione ad un’altra** (3G e anche 2G). Ce lo dice anche Ilya Grigorik, l’ingegnere delle prestazioni web di Google, nel suo libro «[High Performance Browser Networking](https://www.amazon.it/gp/product/1449344763/)».

> …even users with the latest handsets will continuously transition between 4G, 3G, and even 2G networks based on the continuously changing conditions of their radio environments.
> 
> – [Ilya Grigorik, High Performance Browser Networking](https://hpbn.co)

Puoi vedere tu stesso una [mappa con la copertura di reti mobile](https://www.opensignal.com) e notare che per esempio nella tua zona la **copertura di rete non è per niente uniforme**, oltre ad esserci delle zone proprio non coperte. Se ti interessa questo argomento delle connessioni mobile, ti consiglio di leggere anche questo report sull’Italia: [State of Mobile Networks: Italy](https://www.opensignal.com/reports/2016/05/italy/state-of-the-mobile-network) (Maggio 2016).

## Browser diversi con funzioni differenti

**Pure i browser incidono in modo significativo sulle [performance web percettive](https://olegs.be/2016/06/ottimizzare-percorso-rendering-critico-migliorare-prestazioni-web-percepite/).** I browser fanno il rendering dei contenuti in modi diversi e sono in uso [svariati tipi e versioni](https://gs.statcounter.com/#all-browser-ww-monthly-201505-201605). Per esempio, alcuni browser non mostrano le immagini finché non vengono scaricate completamente, perché non supportano le immagini progressive.

### I 9 browser più utilizzati al mondo – Maggio 2015-2016

![I 9 browser più utilizzati al mondo – Maggio 2015-2016](https://img.olegs.be/uploads/2016/06/9-top-browser-utilizzati-mondo-maggio-2015-2016-statcounter-480.jpg)

*Fonte: [StatCounter Global Stats – Browser Market Share](https://gs.statcounter.com/#all-browser-ww-monthly-201505-201605)*

Anche se il browser più utilizzato è Google Chrome, resta un bel mix del quasi 50% di altri browser.

Ci sono milioni di persone che usano per esempio [Opera Mini che è un proxy browser](https://it.wikipedia.org/wiki/Opera_\(browser\)#Browser_Opera_Mini) e funziona in modo diverso dai browser tradizionali. Praticamente, una volta richiesta una pagina di un sito web, Opera Mini la comprime lato server e spedisce nel browser una versione statica della pagina, come se fosse un PDF e toglie tutto JavaScript. Quindi, ogni volta che un utente fa un clic su una voce di menu che per dire deve aprire un menu a tendina, ci sarà una nuova chiamata al server e il tempo del roundtrip per rispedire indietro la nuova versione della pagina con il cambiamento.

Questo browser viene usato per lo più per risparmiare il traffico dati mobile, che ricordo ha un costo per gli utenti… quindi **siti web più leggeri = meno costi per gli utenti**. Puoi anche risparmiare traffico dati navigando da mobile con il browser Google Chrome, attivando una funzionalità di compressione dei dati [Data Compression Proxy](https://support.google.com/chrome/answer/2392284), che però non toglie JavaScript e funziona come gli altri browser.

**I browser moderni supportato fino a 6 connessioni parallele** (con il protocollo HTTP/2 attivo sul server e supportato dal browser non c’è più questo limite) e invece altri browser non arrivano a caricare e renderizzare in parallelo che si trasforma in tempi di caricamento molto più lunghi.

Ti ricordo che i **siti web più leggeri sono anche più ecologici**, perché utilizzano meno energia elettrica per le richieste che devono viaggiare dal browser al server e le risorse che devono poi tornare per comporre una pagina e visualizzarla per un utente. Questo si trasformano anche in risparmio per te se utilizzi risorse esterne come CDN, perché significherà che spenderai meno soldi in traffico dati o per i servizi tipo Amazon S3.

## Hardware dei dispositivi mobile

**Il tuo sito web deve essere veloce per essere visto [non da un iPhone](https://data.wurfl.io/MOVR/pdf/2016_q1/MOVR_2016_q1.pdf),** ma altri dispositivi non di ultima generazione. I dispositivi mobile più diffusi sono molto più economici dei prodotti famosi, con schermi più piccoli, con processori più lenti e spesso con la memoria di un Pentium degli anni 90.

> Il traffico dati da mobile è cresciuto del 60% tra il 1° trimestre 2015 e 1° trimestre 2016.
> 
> – [Ericsson Mobility Report June 2016](https://www.ericsson.com/assets/local/mobility-report/documents/2016/Ericsson-mobility-report-june-2016.pdf)

Non pensare che se il tuo sito web si vede bene dal tuo nuovo luccicante iPhone così avviene per tutti gli altri utenti. **I dispositivi mobile più diffusi al mondo hanno il sistema operativo Android** e hanno le componenti hardware molto meno potenti.

### Visualizzazione della frammentazione dei dispositivi mobile Android (agosto 2014)

![Visualizzazione della frammentazione dei dispositivi mobile Android (OpenSignal – agosto 2014)](https://img.olegs.be/uploads/2016/06/frammentazione-dispositivi-mobile-android-opensignal-agosto-2014-960.jpg)

*Fonte: [OpenSignal](https://www.theguardian.com/technology/2014/aug/22/android-fragmented-developers-opensignal)*

Conta che poi ci sono tutta una serie di altri dispositivi con sistemi operativi iOS, Windows Phone, BlackBerry e altri ancora e che hanno loro specifiche hardware differenti…

Per esempio, uso eccessivo di immagini non responsive e codice JavaScript manda su di giri il processore, consuma molta memoria e tira giù parecchio la batteria di uno smartphone.

Va bene testare i tuoi siti con emulatori o con DevTools di Chrome, simulando le condizioni da mobile ma ti consiglio sempre e comunque di **fare sempre dei test sui dispositivi reali**. Potrebbe essere davvero costoso avere una tua flotta di dispositivi, ma nel mondo esistono comunque diversi OpenDeviceLab e ce ne sono anche in Italia. Se vedi che non ci sono laboratori di device nella tua zona, saresti il candidato ideale per formarne uno ;)

**Ti consiglio di investire in dispositivi reali, soprattutto se sei uno sviluppatore web**, comprando magari anche quelli usati ai mercatini o per esempio su Amazon. Tanto che se ne frega se non sono dispositivi nuovi, hanno righe sullo schermo o se hanno segni di usura, ti servirà per usare solo il browser. Chiedi magari anche ai tuoi colleghi o famigliari che dispositivi mobile hanno e fai test anche sui loro dispostivi, facendoteli prestare.

Per renderti più conto della situazione, puoi sempre **vedere anche le statistiche attuali del tuo sito web**, per capire che dispositivi mobile usano i tuoi visitatori reali. In Google Analytics, la metrica si trova sotto Pubblico –> Mobile –> Dispositivi. Sono sicuro che ne vedrai di belle 🙃

Dovresti **tenere sempre in considerazione anche questi fattori lato hardware** e ti consiglio di consultare questo [grafico](https://www.scientiamobile.com/movr-visualization-tool/#/formfactor) di migliaia dei dispostivi più usati nel mondo (registrandoti gratuitamente a ScientiaMobile avrai accesso a più dati).

Come abbiamo visto, **si tratta per lo più di problemi relativi alla mobilità**. Diciamo che in condizioni statiche come casa o ufficio questi problemi sono più limitati, perché spesso si utilizza una connessione Wi-Fi veloce, anche se da mobile ma resta comunque la differenza di browser e questione geografica. Restano lo stesso tante persone che a casa non hanno un computer e quindi l’unico Internet che conoscono sarebbe quello visto dai loro amici smartphone o tablet… si chiamano utenti «[mobile-only](https://www.comscore.com/Insights/Blog/Number-of-Mobile-Only-Internet-Users-Now-Exceeds-Desktop-Only-in-the-U.S)». [Verifica](https://search.google.com/test/mobile-friendly) che il tuo sito web sia adatto per i risultati di ricerca di Google ottimizzati per i dispositivi mobili.

**Si tratta per lo più di cultura e di conoscere queste informazioni** quando si lavora nello sviluppo di siti web. I team di lavoro nelle agenzie web e i freelance dovrebbero essere responsabili di ciò che fanno e emettono la fuori sul web. Anche se questi fattori sono tutti fuori nostro controllo possiamo fare tantissimo come professionisti del web e misurare costantemente cosa facciamo e ottimizzare i siti web facendo la differenza per un web più leggero e veloce.

*Pensavi di avere tutto sotto controllo?* 😅
