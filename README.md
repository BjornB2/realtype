# RealType

[![Live site](https://img.shields.io/badge/live-bjornb2.github.io-2c725f)](https://bjornb2.github.io/realtype/)

Een typing test die is ontstaan uit onvrede over bestaande tests. RealType probeert typen te meten zoals het in de praktijk gebeurt: in samenhangende tekst, zonder geluid, zonder blokkades en zonder dat één fout de rest van een woord onleesbaar maakt.

**[Open de live typing test](https://bjornb2.github.io/realtype/)**

![RealType in de live browserweergave](docs/realtype-overview.png)

## Waarom RealType?

Er zijn veel goede typing tests, maar tijdens het vergelijken kwamen steeds dezelfde beperkingen terug:

- Willekeurige woorden meten geen natuurlijk schrijfritme.
- Een gemiste of extra letter laat de markering soms voor de rest van het woord uit de pas lopen.
- Sommige tests blokkeren invoer bij een fout, terwijl je in het dagelijks leven gewoon verder typt.
- Een woord wordt vaak al bij de spatie definitief afgekeurd. Daardoor kun je de laatste letter niet meer met Backspace corrigeren.
- Bold tekst, veranderende breedtes of extra letters laten woorden en regels verspringen.
- Interface, teksttaal en systeemvoorkeuren sluiten niet altijd op elkaar aan.
- Geluid, accounts en andere afleiding zitten de eigenlijke test in de weg.

RealType is gebouwd als antwoord op die punten. Het gebruikt willekeurig gekozen maar samenhangende passages en houdt ieder voorbeeldwoord op een vaste positie. Binnen een woord worden fouten opnieuw uitgelijnd, zodat correct getypte letters na een ontbrekend of extra teken weer worden herkend. Je kunt altijd doortypen en fouten met Backspace herstellen.

Een spatie zet het huidige woord alleen voorlopig klaar. Pas wanneer je de eerste letter van het volgende woord typt, wordt het vorige woord definitief beoordeeld. Zo blijft ook de laatste letter nog corrigeerbaar.

## Uitgangspunten

- Samenhangende, willekeurig gekozen Nederlandse en Engelse teksten
- Iedere test begint aan het begin van een zin
- Tekst- en interfacetaal volgen standaard de browser
- Teksttaal kan afzonderlijk worden overschreven
- Testduur van 15, 30, 60 of 120 seconden
- Woordtests van 10 tot en met 500 woorden, inclusief een eigen lengte
- Live WPM, aanslagen per minuut en nauwkeurigheid
- Automatische light en dark mode met handmatige override
- Geen account, tracking of geluid

## Hoe woordinvoer werkt

Correcte letters worden direct herkend. Bij een fout zoekt de invoer binnen hetzelfde woord opnieuw aansluiting bij de voorbeeldtekst. Woorden en regels behouden daarbij altijd hun oorspronkelijke plaats. De getypte invoer blijft afzonderlijk zichtbaar, zodat fouten nooit worden verborgen.

## Lokaal ontwikkelen

```bash
npm install
npm run dev
```

Controles uitvoeren:

```bash
npm run lint
npm test
npm run build
```

Elke push naar `main` wordt met GitHub Actions automatisch getest, gebouwd en gepubliceerd naar GitHub Pages.

## Licentie

De broncode is publiek beschikbaar onder de [PolyForm Noncommercial License 1.0.0](LICENSE.md). Niet-commercieel gebruik, aanpassen en delen is toegestaan volgens die voorwaarden. Voor commercieel gebruik is afzonderlijke schriftelijke toestemming nodig.
