# Players Club mājaslapa

Patstāvīgi palaižama Players Club mājaslapa ar LV/EN saturu, lokāciju un spēļu lapām, pasākumiem, ēdienkartēm un administratora redaktoru.

Publiskās lapas atveras bez paroles. `/admin` un `/admin/preview` (Editing mode), kā arī satura rediģēšanas un failu augšupielādes API ir aizsargāti ar administratora pieslēgšanos.

## Kas ir šajā projektā

- Mājaslapas avota kods, sākotnējie attēli un video, daļa no augšupielādētajiem attēliem un publicētā satura kopija.
- Satura sākotnējā kopija: `lib/initial-content.json`. Jaunā D1 datubāzē tā tiek izmantota līdz pirmajai saglabāšanai administratorā.
- No vecās lapas pārnestie faili: `public/assets/imported/`.
- Turpmākās administratora izmaiņas glabājas **tavā** Cloudflare D1 datubāzē; jaunie faili — **tavā** R2 glabātavā.
- GitHub Actions pārbaudes un atsevišķa manuāli palaižama publicēšana.
- Projektā nav īsto administratora paroļu, sesiju atslēgu, Cloudflare vai GitHub piekļuves tokenu.

Šī ir servera lietotne (React + Vinext + Cloudflare Workers). GitHub glabā kodu; GitHub Pages viens pats nevar palaist šo administrāciju un datubāzi.

## Attēlu pārnešana — vēl jāpabeidz

Šajā sākotnējā pakotnē vēl trūkst 22 augšupielādētu failu. Skaties `docs/MIGRATION-STATUS.md`. Pirms publicēšanas izpildi `pnpm media:fetch` un `pnpm check:assets` vai pievieno failus manuāli. Publicēšanas komanda atsakās publicēt, ja faili nav pārnesti.

## 1. Augšupielāde GitHub

Vienkāršākais ceļš ir GitHub Desktop:

1. Izpako ZIP. Atver mapi `playersclub-github`.
2. GitHub Desktop izvēlies **File → Add Local Repository** un šo mapi. Ja programma piedāvā izveidot repozitoriju, izvēlies **Create a Repository Here**.
3. Izveido pirmo commit un spied **Publish repository**. Vari izvēlēties privātu vai publisku repozitoriju.
4. Augšupielādē projekta saturu, nevis ZIP failu. Nepievieno `.dev.vars`, `.env`, `node_modules`, `dist` vai `.wrangler`.

Ja izmanto termināli:

```sh
git init -b main
git add .
git commit -m "Initial Players Club website"
git remote add origin https://github.com/YOUR_USERNAME/playersclub-website.git
git push -u origin main
```

Pirms pēdējām divām komandām izveido tukšu repozitoriju savā GitHub kontā un aizvieto `YOUR_USERNAME` ar savu lietotājvārdu.

## 2. Palaist datorā

Nepieciešams Node.js 22.13+ un pnpm 11.25.0.

```sh
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
cp .dev.vars.example .dev.vars
```

Failā `.dev.vars` iestati SAVU administratora lietotājvārdu, paroli un nejaušu sesijas atslēgu. Sesijas atslēgu vari ģenerēt ar:

```sh
openssl rand -hex 32
```

Nelieto paraugā esošos vietturus kā īstās paroles un nepublicē `.dev.vars` GitHub.

```sh
pnpm db:local
pnpm dev
```

Atver terminālī norādīto vietējo adresi. Publiskā lapa neprasa paroli. Administratora ieeja ir `/entry/admin`, administrācija — `/admin`.

## 3. Sagatavot savu Cloudflare kontu

```sh
pnpm exec wrangler login
pnpm exec wrangler d1 create playersclub-content
pnpm exec wrangler r2 bucket create playersclub-uploads
```

D1 izveidošanas komanda parādīs tavas datubāzes ID. Ievieto to failā `wrangler.jsonc` laukā `d1_databases[0].database_id`, aizvietojot nullīšu vietturi. Saglabā piesaistes nosaukumu `DB`. R2 piesaistes nosaukumam jāpaliek `BUCKET`.

```sh
pnpm db:remote
pnpm build
pnpm exec wrangler deploy --config dist/server/wrangler.json
```

Pirmais deploy izveido Worker. Kamēr nav ievadīti nākamajā solī minētie noslēpumi, publiskā lapa darbojas, bet administratora ieeja droši atsakās atvērties.

## 4. Administratora parole produkcijā

Katru vērtību ievadi interaktīvi; nesaglabā tās GitHub kodā:

```sh
pnpm exec wrangler secret put ADMIN_USERNAME
pnpm exec wrangler secret put ADMIN_PASSWORD
pnpm exec wrangler secret put SESSION_SECRET
```

`SESSION_SECRET` izmanto jaunu nejaušu 64 heksadecimālo simbolu vērtību (piemēram, `openssl rand -hex 32`). `SITE_PASSWORD` nav vajadzīga. Paroles maiņa atsauc iepriekšējās administratora sesijas.

Atver Worker HTTPS adresi un pārbaudi `/entry/admin`. Visas administratora izmaiņas jāsaglabā ar “Saglabāt un publicēt”.

## 5. Pievienot savu domēnu

1. Pievieno savu domēnu savam Cloudflare kontam un pabeidz DNS iestatīšanu.
2. Atver **Workers & Pages → playersclub-website → Settings → Domains & Routes → Add → Custom Domain**.
3. Ievadi savu domēnu vai apakšdomēnu un apstiprini Cloudflare piedāvāto konfigurāciju.
4. Pārbaudi sākumlapu, valodas, biļešu saites un administratora ieeju jaunajā domēnā.

Domēns šajā pakotnē nav rezervēts vai pieslēgts. Cloudflare pakalpojumu un domēna izmaksas nosaka tavs konts un izvēlētais plāns.

## 6. Publicēšana no GitHub

Pārbaudes darbojas pēc katra push. Publikācija apzināti ir manuāla.

GitHub repozitorijā pievieno **Settings → Secrets and variables → Actions**:

- `CLOUDFLARE_API_TOKEN` — ar Worker publicēšanai un D1 migrācijām nepieciešamajām tiesībām tavā kontā.
- `CLOUDFLARE_ACCOUNT_ID` — tava Cloudflare konta ID.

Izveido GitHub environment `production`. Administratora trīs noslēpumus turi Cloudflare Worker iestatījumos (nevis publiskos failos).

Kad resursi un noslēpumi ir sagatavoti, GitHub atver **Actions → Deploy to Cloudflare → Run workflow**. Tas izpilda pārbaudes, D1 migrācijas, būvē projektu un publicē tavu Worker.

## Ikdienas rediģēšana un rezerves kopijas

- Teksti, cenas, spēles, pasākumi, lokācijas, galerijas un izvēlnes: `/admin`.
- Fonti, izmēri, krāsas, attēli un priekšskatījums: `/admin?tab=design`.
- Publicētas izmaiņas glabājas D1, nevis automātiski GitHub. Turpmāks koda deploy tās nepārraksta.
- Šī pakotne ietver publicēto saturu eksporta brīdī (2026-11-07). Melnraksti nav iekļauti.
- Atjauninot tikai `lib/initial-content.json`, jau aizpildīta D1 datubāze nemainīsies; rediģē administratorā vai veic apzinātu datu migrāciju.
- Veido D1 datu un R2 augšupielāžu rezerves kopijas savā Cloudflare kontā.
- Saziņas forma sagatavo e-pastu lietotāja e-pasta lietotnē; tā pati nesūta e-pastu no servera.

## Pārbaudes

```sh
pnpm check
pnpm test
pnpm build
```

Izmantotās pakotņu versijas ir fiksētas lock failā. Nav vajadzīgs ChatGPT konts, Sites piekļuves tokens vai iepriekšējais hostings.

## Dokumentācija

- [Cloudflare Workers konfigurācija](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Cloudflare domēna pieslēgšana](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Cloudflare D1 migrācijas](https://developers.cloudflare.com/d1/reference/migrations/)
- [Cloudflare Worker noslēpumi](https://developers.cloudflare.com/workers/configuration/secrets/)
