Functies:
- Realtime voertuiggegevens: accuniveau, laadstatus, laadvermogen, resterende laadtijd, geschat bereik
- Voertuigstatus: vergrendeld/ontgrendeld, deuren, ramen, kofferbak, motorkap
- Klimaatregeling: start/stop airconditioning met doeltemperatuur
- Voertuigdashboard-widget met live overzicht en snelle acties
- Locatie tracking: GPS-coördinaten en parkeeradres
- Verbindingsstatus: online/offline monitoring
- Buitentemperatuur en kilometerstand
- Geofence-triggers: voertuig thuisgekomen / van huis vertrokken
- Op afstand vergrendelen/ontgrendelen via de apparaatschakelaar of flow-kaarten (vereist MyŠkoda S-PIN)
- Parkeeradres: automatisch bepaald vanuit GPS-coördinaten via OpenStreetMap reverse geocoding
- Inzichten: historische grafieken voor accuniveau, temperatuur, kilometerstand, bereik, laadvermogen en resterende laadtijd
- Apparaatstatusindicatoren: kilometerstand, bereik, resterende laadtijd, laadvermogen en accuniveau kunnen op de apparaattegel worden weergegeven
- Volledig gelokaliseerd in het Engels en Nederlands

Ondersteunde voertuigen:
- Škoda Elroq, Enyaq, Enyaq Coupé (volledige EV-ondersteuning)
- Škoda Superb iV, Octavia iV (PHEV — laad- en klimaatfuncties)
- Andere MyŠkoda-verbonden voertuigen (basisstatus kan werken)

Vereisten:
- Homey Pro of Homey Cloud met firmware 12.3.0 of nieuwer
- Een gekoppeld MyŠkoda-voertuigapparaat om in de dashboardwidget te gebruiken

Installatie:
1. Installeer de app op je Homey
2. Voeg een nieuw apparaat toe: MyŠkoda > Auto
3. Voer je MyŠkoda-e-mailadres en wachtwoord in
4. Selecteer je voertuig(en) uit de lijst
5. Het apparaat begint automatisch met het ophalen van gegevens
6. Pas het poll-interval en de thuislocatie aan in de apparaatinstellingen
7. Voor vergrendelen/ontgrendelen: voer je MyŠkoda S-PIN in via Geavanceerde instellingen > Beveiliging

MyŠkoda S-PIN:
De S-PIN is een 4-cijferige beveiligingscode die is aangemaakt tijdens de installatie van de Škoda Connect-app. Deze is vereist voor vergrendelen/ontgrendelen op afstand. Configureer deze in de geavanceerde instellingen van het apparaat onder Beveiliging. Zonder S-PIN krijg je een duidelijke foutmelding.

Probleemoplossing:
- App niet zichtbaar bij toevoegen apparaat: als MyŠkoda niet verschijnt in de apparatenlijst, ga naar Meer > Apps > MyŠkoda > ⋮ > Herstart. Probeer na het herstarten opnieuw het apparaat toe te voegen.
- Inloggen mislukt: als je inloggegevens correct zijn, toont de foutmelding nu de onderliggende reden. Veelvoorkomende oorzaken zijn openstaande voorwaarden/marketingtoestemming (accepteer deze eerst in de officiële MyŠkoda-app), tijdelijke problemen met de VW-identiteitsserver, of accountvergrendeling na te veel pogingen.

Vergrendeld vs. Deuren:
De Vergrendeld-functie en de Deuren open-functie zijn onafhankelijk van elkaar. Vergrendeld geeft de status van het centrale vergrendelingssysteem weer (vergrendeld/ontgrendeld). Deuren open geeft aan of er een fysieke deur open staat (open/dicht). Een auto kan ontgrendeld zijn met alle deuren dicht. Dit zijn geen tegengestelden — ze vertegenwoordigen verschillende voertuigstatussen.

Bekende beperkingen:
- De MyŠkoda-API is cloudgebaseerd — het voertuig moet een actieve internetverbinding hebben
- Het poll-interval is beperkt tot minimaal 5 minuten om rate limiting te voorkomen
- Voertuigacties (laden, klimaatregeling, vergrendelen/ontgrendelen) kunnen 30 seconden tot enkele minuten duren voordat ze effect hebben
- Sommige functies zijn mogelijk niet beschikbaar voor alle voertuigmodellen
- Na app-updates moet je mogelijk het apparaat verwijderen en opnieuw toevoegen voor nieuwe functies
