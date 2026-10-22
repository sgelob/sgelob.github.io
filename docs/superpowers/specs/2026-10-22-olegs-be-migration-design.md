# olegs.be: da WordPress a sito statico Astro

Data: 2026-10-22. Stato: bozza da approvare.

## 1. Intento

olegs.be è il sito personale di Oleg Belousovs: portfolio fotografico (85 gallerie, circa 3.800 foto), blog (39 post, quasi tutti in italiano, su web performance e meetup), pagina di presentazione con eventi e libri, raccolta di citazioni. Oggi gira su WordPress su hosting condiviso OVH, con un tema custom (sgelob/wp-olegs-theme) e una manciata di plugin.

Obiettivo: lo stesso sito, con gli stessi contenuti e gli stessi URL, come sito statico generato con Astro, versionato su GitHub e pubblicato su GitHub Pages, aggiornabile da GitHub o con Claude Code. Il dominio olegs.be resta. Insieme alla migrazione si rifà il design in stile "fotografico", con le foto al centro e un'interfaccia che sparisce.

Perché ora: via WordPress, PHP, database, plugin da aggiornare e hosting da pagare; un sito che si aggiorna con un commit.

## 2. Obiettivi, non obiettivi, anti obiettivi

Obiettivi:

- Tutti i contenuti pubblicati oggi arrivano nel nuovo sito: post, pagine, gallerie con tutte le foto nell'ordine attuale, citazioni, tassonomie.
- Ogni URL pubblico di oggi risponde ancora, con lo stesso contenuto o con un redirect.
- Nuovo design scuro, minimale, foto prima, secondo le scelte della sezione 5.
- Aggiungere una galleria o un post è: mettere file in una cartella, lanciare uno script per le foto, commit, push.
- Zero servizi a pagamento: GitHub, Cloudflare free, OVH solo per la registrazione del dominio.

Non obiettivi:

- Nessun CMS, nessun pannello di amministrazione, nessun editor online.
- Nessun commento, nessuna newsletter, nessun form.
- Nessuna ricerca interna.
- Non si rifanno i testi: i contenuti migrano come sono.

Anti obiettivi (il lavoro è fallito anche se "funziona"):

- Foto mancanti, in ordine diverso o di qualità inferiore rispetto a oggi.
- Link esterni e risultati Google che finiscono in 404.
- Un sito che Oleg non sa più aggiornare da solo.
- Pagine pesanti: una pagina galleria deve caricare meno byte di oggi.

## 3. Vincoli

- GitHub Pages pubblica al massimo 1 GB per sito e serve solo file statici: nessun redirect server side, nessun header custom. Le foto (1,13 GB di originali, più le versioni ridimensionate) non possono stare lì.
- Cloudflare R2 free: 10 GB di storage, uscita gratuita. Il dominio custom su R2 richiede che la zona DNS di olegs.be sia su Cloudflare.
- Il dump MySQL (prefisso `yo_`, 17 MB) e la cartella `wp-content/uploads` su OVH (via FTP) sono le fonti. Le miniature generate da WordPress (file con suffisso `-WxH`) si ignorano.
- Dove sono le fonti: il dump è in `~/Downloads/d919081c-b883-4c21-8468-e50babe9151d-mysql509.olegsbh680.2026-10-22-08h51`; una copia SQLite delle tabelle utili (`yo_posts`, `yo_postmeta`, `yo_terms`, `yo_term_taxonomy`, `yo_term_relationships`, `yo_options`, `yo_yoast_indexable`) esiste già ma fuori dal repo, il builder la rigenera dal dump con un parser delle `INSERT` (niente MySQL in locale). Il tema live si scarica da OVH via FTP (`/www/wp-content/themes/olegs`); le credenziali FTP le ha Oleg. Account Cloudflare e GitHub sono di Oleg: i passi nelle loro console (sezione 7, passi 6 e 7) li fa lui con il builder accanto, oppure il builder con token che Oleg crea apposta.
- I file su OVH sono già ridimensionati: 3.782 file con metadati, lato lungo massimo 5.936 px ma 2.478 file tra 1.500 e 1.999 px e 1.247 tra 1.000 e 1.499 px. Quindi in pratica il lato lungo è circa 1.620 px. Oleg ha i RAW in locale con altri nomi, ma la migrazione usa solo i file OVH (sua scelta, 2026-10-22). Vedi 4.2.
- Il tema di riferimento per i contenuti è quello live in `/www/wp-content/themes/olegs` su OVH, non il repo GitHub (fermo alla 1.0.0).
- Il sito è bilingue di fatto: foto e About in inglese, blog in italiano. Resta così, `lang` per pagina.

## 4. Architettura

### 4.1 Infrastruttura

- Repo GitHub `sgelob/olegs.be` (nome a scelta di Oleg), pubblico. Motivo: GitHub Pages su repo privato richiede un piano a pagamento, e i contenuti sono comunque pubblici.
- Build con GitHub Actions su push su `main`, deploy su GitHub Pages con l'action ufficiale. Node LTS, pnpm o npm (scelta del builder).
- DNS di olegs.be spostato su Cloudflare (nameserver), registrazione resta su OVH. Record: `olegs.be` A/AAAA verso GitHub Pages, `www` CNAME, `img` collegato al bucket R2. Proxy Cloudflare attivo su `olegs.be` con SSL "Full": serve per le Redirect Rules e per la cache.
- Foto su un bucket R2 servito da `img.olegs.be`. Nel repo ci sono solo codice, testi e metadati.
- Redirect fatti con Cloudflare Redirect Rules (gratis): `www` verso apex, `http` verso `https`, vecchi slug, feed. Elenco in 6.4.
- Analytics: Cloudflare Web Analytics, senza cookie. Niente banner cookie.

### 4.2 Pipeline foto

Script in repo (Node o Python, scelta del builder), eseguito in locale, mai in CI:

1. Legge gli originali da una cartella locale (scaricata una volta da OVH via FTP; 3.784 file).
2. Per ogni foto genera varianti in larghezze fisse 480, 960 e 1600 px (mai oltre l'originale: con file a circa 1.620 px la variante 1600 è di fatto l'originale ricompresso), in WebP più JPEG di fallback, qualità attorno a 80. Nome file: `<slug-galleria>/<nome-sul-sito>-<larghezza>.<ext>`, dove il nome sul sito è quello del file WordPress (per esempio `venezia-italy-01`), che resta la chiave di ogni foto.
   La sorgente è una sola: i file scaricati da OVH. Oleg ha i RAW originali in locale, ma con nomi diversi e senza un abbinamento semplice; ha deciso di non usarli (2026-10-22). Lo script accetta comunque una larghezza in più come parametro, così se un giorno Oleg esporta JPEG a piena risoluzione con i nomi del sito, basta rilanciarlo con 2400.
   Copertina di galleria: a tutta larghezza su schermi oltre 1.600 px, o ad alta densità, risulta leggermente morbida. Accettato; la copertina è scurita e porta testo sopra, non è una foto da guardare da vicino. In alternativa il builder può limitare la copertina a 1.600 px di larghezza centrata su schermi più grandi: scelta sua.
3. Carica su R2 con `rclone` o `wrangler`, saltando ciò che esiste già (idempotente).
4. Scrive o aggiorna il file della galleria con l'elenco delle foto e larghezza/altezza originali (servono alla griglia giustificata e al lightbox).

Le dimensioni originali per le foto migrate vengono dal dump (`_wp_attachment_metadata`), per le nuove dallo script.

### 4.3 Contenuti

Astro content collections, tutto in Markdown con frontmatter:

- `posts/` — 39 post pubblicati. Le 78 bozze di post e le 4 bozze di gallerie non entrano nel repo (è pubblico): lo script di migrazione le esporta in Markdown in una cartella fuori dal repo, consegnata a Oleg, che potrà portarne una nel repo quando vorrà pubblicarla. Frontmatter: titolo, data, categorie, slug, titolo e descrizione SEO da Yoast se presenti, immagine di copertina se presente. Il corpo è l'HTML del Classic Editor convertito in Markdown; dove la conversione perde qualcosa (embed, tabelle), resta HTML inline. Le 63 immagini allegate ai post vanno anch'esse su R2 con la stessa pipeline.
- `galleries/` — 85 gallerie pubblicate. Frontmatter: titolo, titolo breve (`home_short_title`), data (la `post_date` di WordPress: le gallerie sono state retrodatate a mano all'anno dello scatto, dal 2005 al 2016, anche quando le foto sono state ricaricate anni dopo; è la data giusta da mostrare), genere, paese, copertina (`_thumbnail_id`), testo descrittivo se presente (11 gallerie hanno un testo, per esempio le schede delle macchine fotografiche), elenco ordinato delle foto con larghezza e altezza. L'ordine delle foto è quello in cui compaiono nell'HTML del post, non il `menu_order`.
- `pages/` — About (oggi la home), Photos, Blog, Quotes, Privacy Policy, Cookie Policy. Le pagine draft (services e simili) non si migrano.
- `quotes/` — 188 citazioni con autore (tassonomia `quote-author`). Oppure un singolo file YAML; scelta del builder.
- Eventi e libri: oggi sono due liste dentro la pagina About (342 voci). Diventano due file di dati (YAML o Markdown) e due pagine proprie, `/events/` e `/books/`.
- Tassonomie: genre (6) e country (13) per le gallerie, categorie (9) per i post. I nomi e gli slug restano quelli di oggi.

Lo script di migrazione legge il dump (già convertito in SQLite durante l'analisi; il builder può rifare la conversione o leggere il dump direttamente) e genera tutti i file una volta. Dopo la migrazione il dump non serve più: la fonte di verità è il repo.

## 5. Design

Direzione scelta tra tre mockup: griglia, su sfondo scuro, con tipografia grotesque. Riferimenti: nite-riot.com, tinywins.com, aino.agency, edwardburtynsky.com. Principio: le foto comandano, l'interfaccia è etichette piccole e aria.

### 5.1 Sistema

- Sfondo nero quasi pieno (circa #0c0c0c), testo chiaro, grigi per i secondari. Un solo tema, nessuna versione chiara.
- Due famiglie: un sans grotesque neutro per testi e titoli (Inter o equivalente, self hosted, mai da Google Fonts), un monospazio per etichette, didascalie, date e navigazione secondaria, sempre in maiuscolo con spaziatura larga.
- Niente card, ombre, bordi arrotondati, icone decorative. Separatori: una riga sottile.
- Immagini sempre con `srcset` dalle varianti su R2, `loading="lazy"` sotto la piega, `width` e `height` dichiarati.
- Layout a larghezza piena con margine laterale fisso (circa 48 px desktop, 16 px mobile). Griglie a 4 colonne desktop, 2 tablet, 1 o 2 mobile.
- Navigazione: logo/nome a sinistra, Photos, Blog, About a destra, in monospazio. Nessun menu hamburger: su mobile le tre voci stanno in una riga.

### 5.2 Pagine

Home (`/`), "biglietto da visita":

- Due righe su Oleg in grande (il paragrafo iniziale dell'About attuale), poi i link in monospazio a Events, Books, Quotes, Email.
- Sezione Photos: una riga di 4 gallerie in evidenza con didascalia (titolo breve, paese, anno) e link "All 85 galleries". Le 4 in evidenza sono elencate in un file di configurazione; se vuoto, le 4 più recenti.
- Sezione Blog: i 3 post più recenti (data e categoria in monospazio, titolo) e link "All posts".

Photos (`/photos/`):

- Una frase di apertura (da scrivere, Oleg può lasciare quella del mockup come segnaposto: "Fifteen years of places, abandoned factories and Soviet cameras, shot between Turin and the rest of Europe").
- Filtri per genere in testa, come link alle pagine genere, con "All" attivo.
- Griglia di copertine 4 colonne, proporzione 4:3, didascalia sotto: titolo breve a sinistra, paese e anno a destra. Ordine per data decrescente.

Genere (`/photos/genre/<slug>/`) e paese (`/photos/country/<slug>/`): stessa griglia, filtrata, con il nome in testa e il testo descrittivo del genere se esiste (oggi i generi hanno una descrizione, per esempio Abandoned).

Galleria (`/gallery/<slug>/`):

- Copertina a tutta larghezza (circa 640 px di altezza su desktop), leggermente scurita, con navigazione sopra e, in basso, titolo e dati in monospazio: paese, genere, mese e anno, numero di foto.
- Testo descrittivo sotto la copertina, se esiste.
- Griglia giustificata: righe ad altezza fissa (circa 300 px desktop) che rispettano le proporzioni originali, gap piccolo, ordine delle foto quello originale. Niente ritagli.
- Click su una foto: lightbox a schermo intero con frecce, tastiera, swipe, chiusura con Esc; libreria a scelta del builder (PhotoSwipe o simile), l'unico JavaScript non banale del sito.
- In fondo: link alla galleria precedente e successiva per data.

Blog (`/blog/`): elenco dei post per data decrescente, data e categoria in monospazio, titolo, estratto breve. Categorie (`/category/<slug>/`) con lo stesso elenco filtrato.

Post (`/YYYY/MM/<slug>/`): colonna di lettura di circa 680 px, titolo, data e categoria, corpo. Immagini del post a larghezza colonna.

About (`/agile-scrum-product-owner-manager-turin-italy/`, lo slug resta): il testo completo dell'About attuale senza le liste, più i link a Events e Books.

Events (`/events/`) e Books (`/books/`): liste in monospazio per anno (eventi) e per sezione "favourite" e "mixed" (libri), con i link che hanno oggi.

Quotes (`/my-favourite-inspirational-quotes-life-design/`): le 188 citazioni raggruppate per autore, autore in monospazio, citazione in sans. Ogni autore ha anche la sua pagina `/quote-author/<slug>/` (141 pagine, stesso layout filtrato): oggi esistono e rispondono 200, costano un template. Le singole citazioni non hanno URL pubblico oggi e non lo avranno.

Privacy Policy e Cookie Policy: testo di oggi, colonna di lettura. La Cookie Policy resta anche se non ci sono più cookie: costa zero e i link esterni non si rompono.

Amended 2026-10-22: the site sets no cookies, so both pages were dropped; their URLs redirect to the home.

404: pagina scura con una riga e i tre link principali.

### 5.3 Fuori

Non si portano: commenti (non ce ne sono), form di contatto e newsletter Jetpack, banner cookie, service worker, share buttons, Disqus, Jetpack Stats, il custom post type `services`, i `grid_template`.

## 6. Dettagli che contano

### 6.1 URL da conservare

| Oggi | Nuovo sito |
|---|---|
| `/` | home |
| `/photos/`, `/blog/` | come oggi |
| `/gallery/<slug>/` | come oggi |
| `/photos/genre/<slug>/`, `/photos/country/<slug>/` | come oggi |
| `/YYYY/MM/<slug>/` | come oggi |
| `/category/<slug>/` | come oggi |
| `/agile-scrum-product-owner-manager-turin-italy/` | About, come oggi |
| `/my-favourite-inspirational-quotes-life-design/` | Quotes, come oggi |
| `/privacy-policy/`, `/cookie-policy/` | come oggi |
| `/YYYY/` e `/YYYY/MM/` | archivio per anno/mese dei soli post (come oggi), elenco semplice |
| `/quote-author/<slug>/` | pagina autore, come oggi |
| `/feed/` | redirect 301 a `/feed.xml` (RSS dei post) |
| `/sitemap.xml` | sitemap generata da Astro |

Tutti gli URL con slash finale, come oggi. GitHub Pages serve `/<path>/index.html`.

Regola per tutto il resto. Si conserva ciò che sta nella sitemap di oggi (post, pagine, gallerie, generi) più categorie, paesi e autori delle citazioni, che non sono in sitemap ma rispondono 200. Possono dare 404: la paginazione (`/blog/page/N/`, oggi inutile perché la pagina mostra tutti i post), i feed per categoria e per genere, la ricerca, le pagine allegato (`/gallery/<slug>/<foto>/`, che oggi rimandano già al file e Google indicizza il file, non la pagina). La verifica del passo 5 in sezione 7 usa la sitemap attuale più le liste di categorie, paesi e autori.

### 6.2 Redirect

Cloudflare free consente circa 10 Single Redirects e pochi Bulk Redirects per zona, quindi su Cloudflare vanno solo le regole con wildcard:

- `www.olegs.be/*` → `olegs.be/*` (301).
- `http://` → `https://` (impostazione "Always use HTTPS").
- `/feed/` → `/feed.xml`.
- `/wp-content/uploads/<anno>/<mese>/<file>` → `img.olegs.be/uploads/<anno>/<mese>/<file>`: la pipeline carica su R2 anche gli originali in quel percorso, così i link esterni alle foto (altri siti, Google Immagini) continuano a funzionare. Le miniature `-WxH` linkate da fuori daranno 404, accettato.

I 21 vecchi slug registrati in `_wp_old_slug` (gallerie, post, citazioni) diventano pagine statiche generate da Astro con `<meta http-equiv="refresh">` e `<link rel="canonical">` verso lo slug attuale: nessun limite e nessuna console da toccare. Lo script di migrazione produce la lista.

### 6.3 SEO

- `<title>` e `<meta name="description">` dai valori Yoast quando esistono, altrimenti titolo del contenuto e primo paragrafo.
- Open Graph con copertina per gallerie e post.
- `sitemap.xml` e `robots.txt`.
- RSS dei post a `/feed.xml`.
- Nessun cambio di slug: zero rischio di perdita di posizionamento oltre a quello dovuto al redesign.

### 6.4 Performance

- Pagina galleria: HTML più CSS sotto i 50 KB, lightbox caricato solo al primo click. Foto in griglia servite alla larghezza giusta via `srcset`.
- Nessun JavaScript nelle pagine di testo, con una sola eccezione accettata: il beacon di Cloudflare Web Analytics, un tag `defer` di pochi KB in ogni pagina. Se Oleg un giorno vorrà toglierlo, è una riga nel layout.
- Font self hosted con `font-display: swap`, due pesi al massimo per famiglia.

### 6.5 Come si aggiorna il sito dopo

Nuova galleria: una cartella con le foto in locale, `npm run photos -- <slug>` che ridimensiona, carica su R2 e crea il file della galleria con le foto in ordine di nome file; Oleg apre il file, compila titolo, genere, paese, copertina, riordina se vuole; commit e push. Nuovo post: un file Markdown in `posts/`. Il README del repo spiega entrambe le cose in dieci righe.

## 7. Piano di migrazione, in ordine

1. Scaricare in locale i file da OVH (solo quelli senza suffisso `-WxH`) e verificare il conteggio: 3.784.
2. Script di migrazione dal dump: genera gallerie, post, pagine, citazioni, eventi, libri, tassonomie. Verifica: 85 gallerie, 3.709 foto collegate alle gallerie, 39 post, 188 citazioni.
3. Pipeline foto e upload su R2 (prima in un bucket di prova).
4. Sito Astro con tutte le pagine della sezione 5.2, prima con le foto lette da `img.olegs.be`, poi con il design finale.
5. Controllo di tutti gli URL della sitemap attuale contro il nuovo sito (script che chiede ogni URL e si aspetta 200 o redirect).
6. Cloudflare: zona DNS, R2 con dominio custom, Redirect Rules, Web Analytics. Prova del sito nuovo su un sottodominio prima dello switch.
7. Switch DNS. WordPress su OVH resta acceso ma non raggiungibile per due settimane, poi si spegne. Cambiare la password FTP di OVH al termine.

Posta: olegs.be ha record MX verso la posta OVH, ma Oleg non usa nessuna casella @olegs.be (confermato il 2026-10-22). Nella zona Cloudflare non si ricreano MX e SPF; si può aggiungere un record TXT `v=spf1 -all` per dichiarare che il dominio non manda posta.

## 8. Decisioni lasciate al builder

- Gestore pacchetti, versione Node, struttura delle cartelle Astro.
- Libreria del lightbox e algoritmo della griglia giustificata (CSS puro con flex e proporzioni, oppure un piccolo script).
- Linguaggio dello script di migrazione e della pipeline foto.
- Larghezze esatte delle varianti e qualità di compressione, purché la foto a schermo intero non sia visibilmente peggiore dell'originale a 1620 px.
- Conversione HTML → Markdown dei post: tool a scelta, con revisione manuale dei casi strani.
- Quali font esatti, purché nella famiglia indicata e self hosted.

## 9. Scelte fatte da Claude, da confermare leggendo

- Repo pubblico (motivo in 4.1).
- Le 78 bozze di post e le 4 di gallerie non entrano nel repo pubblico: esportate in Markdown in una cartella fuori dal repo.
- Date delle gallerie: la `post_date` di WordPress, retrodatata a mano all'anno dello scatto.
- Vecchi slug come pagine meta refresh generate da Astro, non come regole Cloudflare.
- Pagine autore delle citazioni conservate; paginazione, feed per categoria e pagine allegato lasciate al 404.
- Il beacon di Cloudflare Web Analytics è l'unico JavaScript nelle pagine di testo.
- Varianti foto a 480, 960 e 1600 px dai soli file OVH; i RAW non si usano (scelta di Oleg).
- Eventi e libri escono dall'About e diventano `/events/` e `/books/`.
- Tutte le immagini, anche quelle dei post, vanno su R2 con la stessa pipeline; nel repo non c'è nessuna foto.
- Gli originali vengono caricati su R2 anche nel percorso `uploads/<anno>/<mese>/` per non rompere i link esterni alle foto.
- Cookie Policy e Privacy Policy restano pubblicate.
- Il feed si sposta a `/feed.xml` con redirect da `/feed/`.
- La frase di apertura di Photos e la selezione delle 4 gallerie in home sono segnaposto che Oleg cambia nel repo quando vuole.
- La Newsletter Jetpack sparisce senza sostituto; gli iscritti, se ce ne sono, vanno esportati da WordPress.com prima dello spegnimento.
