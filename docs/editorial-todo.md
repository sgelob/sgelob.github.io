# Editorial to-do

Backlog of content to add after the migration. Not part of the migration plan.

## New galleries for Photos › World Places

Added by Oleg on 2026-10-22. One gallery per line; the dates are the trip dates where noted.

### Spain and Portugal
- Lisbon
- Madrid
- Tarifa
- Valencia
- Seville
- Porto 03-2014

### Switzerland
- Basel
- Bern
- Geneva
- Lausanne
- Zurich
- Luzern 01-2014
- Solothurn 02-2014

### Italy
- Bologna 06-2013
- Desenzano del Garda 02-2013
- Milano 12-2013
- Orta San Giulio 11-2013
- Parma 06-2013
- Rimini 06-2013
- San Marino 06-2013
- Verona 02-2013
- Ciaspolata, Planpincieux 01-2014
- Cinque Terre 07-2014
- Forte di Fenestrelle 06-04-2014
- Gradara 06-2014
- Pesaro e Urbino 06-2014
- Matera
- Puglia 2015
- Sicilia 2016
- Dolomiti 2018
- Sardegna 2019
- Livigno 2021
- Dolomiti 2022

### Rest of Europe
- Budapest 04-2013
- Copenhagen 04-2013
- [x] Ljubljana 04-2013 (published 2026-10-23)
- Frankfurt am Main 01-2014
- Istanbul 02-2014
- Latvia 06-2014
- Luxembourg 01-2014
- Russia 04-2014
- Antwerpen 2016
- Rotterdam 2016
- Utrecht 2016
- Cologne 2017
- Dusseldorf 2017
- Bonn 2017
- Annecy 2017
- Lyon 2017
- Athenes 2017
- Crete 2017
- Corsica 2023
- Maiorca 2024
- London 2024/2025

### USA
- Antelope Canyon, Page
- Arches National Park, Moab
- Bodie, Ghost Town
- Bryce Canyon National Park
- Chicago
- Death Valley National Park
- Grand Canyon National Park
- Hoover Dam
- Las Vegas
- Los Angeles
- Moki Dugway, Natural Bridges
- Mono Lake
- Monument Valley
- New York City (+ 2015)
- Niagara Falls
- Page, Horseshoe Bend, Powell Lake
- Route 66: Chicago, Springfield, Amarillo, Williams
- San Francisco
- Sequoia National Park
- Yosemite National Park
- Boston
- Miami Beach

### Indonesia and Malaysia
- Danau Batur
- Jakarta
- Kuta
- Lovina
- Ubud
- Uluwatu
- Kuala Lumpur

### Vietnam
- Cu Chi
- Da Lat
- Da Nang
- Ha Long Bay, Cat Ba Island
- Hanoi
- Ho Chi Minh
- Hoi An
- Hue
- Marble Mountains
- Mekong
- My Son
- Nha Trang
- Tay Ninh

## MTB rides and hikes

Added by Oleg on 2026-10-23. Publish the mountain-bike rides and hikes recorded in [Komoot](https://www.komoot.com/user/1355917992478). Still to decide: blog posts, galleries, or a section of their own; and how to show the route (Komoot embed, self-hosted GPX on a map, or a static map rendered at build time). Options and open questions in [#4](https://github.com/sgelob/sgelob.github.io/issues/4).

## How to add one (after the migration lands)

`npm run photos -- --new <slug> <folder-with-jpegs>` creates `src/content/galleries/<slug>.md` with the photos uploaded to R2; then fill title, genre `world-places`, country, cover and date, and push.
