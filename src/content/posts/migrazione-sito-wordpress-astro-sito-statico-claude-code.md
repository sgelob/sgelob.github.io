---
title: Perché ho lasciato WordPress per un sito statico con Astro – e come l’ho fatto con Claude Code
date: "2026-10-29T09:41:00"
categories:
  - wordpress
  - web-performance
  - product-management
  - ai
lang: it
seoTitle: Da WordPress ad Astro, un sito statico fatto con Claude Code
seoDescription: Dopo 17 anni con WordPress ho migrato il mio sito ad Astro, un sito statico. Perché l’ho fatto, come, con Claude Code, e lo stack di oggi.
oldSlugs: []
excerpt: Ti racconto perché, dopo tanti anni con WordPress, ho trasformato il mio sito in un sito statico con Astro, come l’ho migrato in poco più di una settimana insieme a Claude Code e cosa c’è adesso dietro olegs.be.
---

Il 20 ottobre il team di sicurezza di PHP ha mandato un avviso che non si vede tutti i giorni: [un rilascio di sicurezza in arrivo](https://news-web.php.net/php.announce/509) per il giorno dopo, mercoledì 21 ottobre alle 14:00 UTC, per **due vulnerabilità critiche, entrambe con un punteggio CVSS v4 di 9.2**. L’invito era chiaro: prepararsi ad aggiornare. Ne parlavano [Drupal](https://www.drupal.org/psa-2026-10-20), [Laravel News](https://laravel-news.com/php-critical-security-release) e [mezzo r/webdev](https://www.reddit.com/r/webdev/comments/1xb72td/psa_upcoming_critical_php_security_release/).

Il 22 ottobre ho fatto il primo commit del nuovo olegs.be. Senza PHP.

## WordPress va bene, e gli devo molto

Prima di andare avanti voglio essere chiaro: **questo non è un addio polemico a WordPress**. Non ho niente contro WordPress, anzi.

Lo uso dal 2009. Dal 2015 sono stato un [membro attivo della comunità](https://profiles.wordpress.org/xtraboy/): ho contribuito nei team Polyglots, Community e soprattutto [WordPress TV](https://make.wordpress.org/tv/), di cui ero anche moderatore (te ne avevo parlato [qui](https://olegs.be/2016/04/risorsa-visiva-wordpress-tv-come-contribuire-progetto/)). Al WordCamp Europe 2016 di Vienna ho fatto da [team lead di WordPress TV al Contributor Day](https://olegs.be/2016/07/resoconto-team-wordpress-tv-contributor-day-wordcamp-europe-2016/). Ho co-organizzato il WordCamp Torino [2016](https://olegs.be/2016/04/video-slide-del-wordcamp-torino-2016/) e [2017](https://olegs.be/2017/04/video-slide-wordpress-wordcamp-torino-2017/), occupandomi di audio e video, e il WordPress Meetup di Torino, dove abbiamo provato anche a fare [un meetup con le domande sui Post-it](https://olegs.be/2016/01/come-organizzare-meetup-informale-domande-postit/) 🙂

Grazie a WordPress ho conosciuto tantissime persone, imparato un mestiere e girato mezza Europa tra un WordCamp e l’altro. **WordPress resta uno strumento ottimo**, per moltissimi siti. Semplicemente, per questo sito, non era più quello giusto.

## Un’idea che avevo da tempo

L’idea di passare a un sito statico ce l’avevo in testa da anni. Il mio è un sito personale: un blog, le foto dei viaggi, qualche pagina. **Cambia poco, e non ha bisogno di un database, di PHP che gira a ogni visita, di plugin e di aggiornamenti continui.**

Già nel 2016, [spiegando la differenza tra WordPress.org e WordPress.com](https://olegs.be/2016/03/spiegazione-differenza-wordpress-org-com/), scrivevo che non bisogna mai sottovalutare la sicurezza e che bisogna eseguire continuamente gli aggiornamenti. È vero ancora oggi, con un dettaglio che molti dimenticano: **gli aggiornamenti automatici di WordPress non aggiornano PHP**. Quello dipende dall’hosting, o da chi gestisce il server.

L’annuncio di ottobre è stato solo la spinta finale. Con un sito statico, sul server non resta niente da attaccare: **niente login, niente database, niente codice che gira a ogni visita**. Solo file HTML, CSS e immagini.

## Come l’ho fatto: poco più di una settimana con Claude Code

Un’idea rimandata da anni è diventata un sito completo in poco più di una settimana. Il merito è in buona parte di [Claude Code](https://claude.com/claude-code), con cui ho lavorato su tutto: dalla migrazione dei contenuti agli script, dai test al deploy. Spesso anche dal telefono, con le sessioni nel cloud.

Non è che ho scritto «rifammi il sito» e ho aspettato. **Le decisioni sono rimaste mie**: cosa tenere, cosa togliere, come chiamare le cose, cosa mostrare e cosa no. Claude Code ha fatto il lavoro lungo e ripetitivo, quello che per anni mi aveva fatto rimandare.

La migrazione in pratica:

- articoli, gallerie e pagine da WordPress a file Markdown;
- i percorsi delle immagini di `/wp-content/uploads/` mappati sui nuovi, e i redirect dai vecchi indirizzi, per non rompere nessun link;
- un controllo di tutti gli indirizzi del vecchio sito, per essere sicuro di non perdere niente;
- i testi alternativi delle foto, le introduzioni delle gallerie e la tipografia sistemati (apostrofi curvi, virgolette, trattini).

## Cosa c’è adesso dietro olegs.be

- **[Astro](https://astro.build/)** genera il sito statico, che viene pubblicato su **GitHub Pages** da una GitHub Action a ogni modifica, con **Cloudflare** davanti;
- le foto stanno su **Cloudflare R2** e vengono servite già ridimensionate a 480, 960 e 1600 px, così ogni dispositivo scarica solo quello che serve;
- la ricerca è fatta con **[Pagefind](https://pagefind.app/)**, che funziona senza nessun server;
- a ogni build girano i test e un controllo di accessibilità con **[axe-core](https://github.com/dequelabs/axe-core)** sulle linee guida WCAG 2.2 AA.

E visto che aggiungere qualcosa adesso è facile, sono nate anche sezioni nuove:

- **[Outdoors](https://olegs.be/outdoors/)**: i miei giri in bici e le escursioni, importati da Komoot, con le tracce e le curve di livello del terreno;
- **[Records](https://olegs.be/records/)**: la mia collezione di dischi, dall’esportazione dei miei dati da Discogs;
- **[Books](https://olegs.be/books/)**: i libri, dall’esportazione dei miei dati da Goodreads, con le copertine.

**I miei dati tornano a me**: invece di restare solo dentro Goodreads e Discogs, adesso stanno anche sul mio sito, in file che posso leggere, modificare e portarmi dietro.

## Pubblicare come una conversazione

La cosa che mi piace di più è come pubblico adesso. Ho scritto con Claude Code delle *skill*, istruzioni che descrivono passo per passo come si pubblica un giro, una galleria di foto o un articolo. Gli mando il link di un giro su Komoot e **la pubblicazione diventa una conversazione**: mi fa solo le domande che contano (quale foto in copertina, chi c’è nelle foto, cosa raccontare) e al resto pensa da solo.

Anche la privacy è stata pensata da subito: per ogni giro decido cosa mostrare e cosa no, e le skill me lo chiedono ogni volta.

## Qualche numero

- 8 giorni, dal primo commit del 22 ottobre a oggi;
- quasi 300 commit;
- 39 articoli e 86 gallerie migrati da WordPress;
- 78 giri e escursioni pubblicati nella nuova sezione Outdoors.

Non ho dovuto aggiornare nessun plugin, e non ho nessun server da tenere d’occhio.

Un grazie speciale a Matteo Breda, mio collega di Carol, che mi ha suggerito Astro 🙂

*E tu, hai un sito che cambia poco ma che continui ad aggiornare?…*
