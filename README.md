# 3D Model Zoekplatform

Een uitgebreide 3D-model zoekplatform met AI-ondersteuning, uitgebreide filters, favorieten, reviews en comments.

## Features

- 🔍 **Geavanceerd Zoeken**
  - Full-text search met PostgreSQL
  - AI-gestuurd zoeken met OpenAI
  - Externe API integratie (Sketchfab)
  - Uitgebreide filters (categorie, tags, scores, etc.)

- ⭐ **Reviews Systeem**
  - Drie aparte scores: Kwaliteit, Printbaarheid, Design
  - Tekstuele reviews
  - Gemiddelde scores per model

- 💬 **Comments**
  - Nested comments (replies)
  - Comment bewerken/verwijderen

- ❤️ **Favorieten**
  - Favorieten toevoegen/verwijderen
  - Favorieten lijst pagina

- 📤 **Model Upload**
  - Upload STL, OBJ, GLTF, GLB bestanden
  - Thumbnail upload
  - Metadata beheer

- 🔐 **Authenticatie**
  - Login/Register met Supabase Auth
  - Beveiligde routes

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **AI**: OpenAI API
- **External APIs**: Thingiverse API

## Setup

### 1. Installeer dependencies

```bash
npm install
```

### 2. Configureer environment variables

Maak een `.env.local` bestand:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Thingiverse API (optioneel, voor betere resultaten)
THINGIVERSE_API_TOKEN=your_thingiverse_token
```

### 3. Setup Supabase

1. Maak een Supabase project aan op [supabase.com](https://supabase.com)
2. Voer de migratie uit uit `supabase/migrations/001_initial_schema.sql`
3. Maak een Storage bucket aan genaamd `models` voor file uploads
4. Configureer Row Level Security policies (al in de migratie)

### 4. Sketchfab API Setup (optioneel)

De applicatie ondersteunt zoeken via de Sketchfab API:

1. Maak een account op [sketchfab.com](https://sketchfab.com)
2. Ga naar je account settings en genereer een API token
3. Voeg de token toe aan `.env.local` als `SKETCHFAB_API_TOKEN`

**Zonder token**: De API werkt nog steeds, maar met beperkte functionaliteit.

**Met token**: Volledige toegang tot Sketchfab's downloadbare modellen.

### 5. Run de development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in je browser.

## Database Schema

De applicatie gebruikt de volgende tabellen:

- `models` - 3D-modellen met metadata
- `categories` - Categorieën voor modellen
- `tags` - Tags voor modellen
- `model_tags` - Many-to-many relatie tussen models en tags
- `model_files` - Bestanden per model
- `favorites` - Favorieten relatie tussen users en models
- `reviews` - Reviews met scores voor kwaliteit, printbaarheid, design
- `comments` - Comments bij modellen (met nesting support)

## API Endpoints

### Search
- `GET /api/search` - Zoek modellen met filters
- `POST /api/ai-search` - AI-gestuurd zoeken

### External Models
- `GET /api/models/external` - Zoek in externe databases (Sketchfab)

### Favorites
- `GET /api/favorites` - Haal favorieten op
- `POST /api/favorites` - Voeg favoriet toe
- `DELETE /api/favorites?model_id=...` - Verwijder favoriet

### Reviews
- `GET /api/reviews?model_id=...` - Haal reviews op
- `POST /api/reviews` - Maak/update review
- `DELETE /api/reviews?review_id=...` - Verwijder review

### Comments
- `GET /api/comments?model_id=...` - Haal comments op
- `POST /api/comments` - Maak comment
- `DELETE /api/comments?comment_id=...` - Verwijder comment

### Upload
- `POST /api/models/upload` - Upload een nieuw model

## Project Structuur

```
atw360/
├── app/
│   ├── (auth)/          # Login/Register pagina's
│   ├── (main)/          # Hoofd pagina's
│   │   ├── page.tsx     # Homepage
│   │   ├── search/      # Zoek pagina
│   │   ├── models/      # Model detail & upload
│   │   └── favorites/   # Favorieten pagina
│   └── api/             # API routes
├── components/
│   ├── search/          # Zoek componenten
│   ├── models/          # Model componenten
│   ├── reviews/         # Review componenten
│   ├── comments/        # Comment componenten
│   └── favorites/       # Favorieten componenten
├── lib/
│   ├── supabase/        # Supabase clients
│   ├── api/             # External API integraties
│   ├── ai/              # AI integratie
│   ├── types/           # TypeScript types
│   └── utils/           # Utility functies
└── supabase/
    └── migrations/      # Database migrations
```

## Externe API Integratie

De applicatie ondersteunt zoeken via externe API's:

### Thingiverse API

De Thingiverse provider is geïmplementeerd in `lib/api/thingiverse.ts`. Deze zoekt naar 3D-printbare modellen van Thingiverse.

**BELANGRIJK:** Thingiverse API vereist authenticatie. Zonder een geldige token krijg je geen resultaten.

**Setup:**
1. Maak een account op [Thingiverse](https://www.thingiverse.com)
2. Ga naar [Apps Create](https://www.thingiverse.com/apps/create)
3. Maak een "Web App" aan en ontvang je App Token
4. Voeg de token toe aan `.env.local` als `THINGIVERSE_API_TOKEN`

**Test de API:**
Bezoek `/api/models/external/test` in je browser om te testen of de Thingiverse API correct werkt.

**Gebruik:**
- Schakel "Ook zoeken in externe databases" in op de zoekpagina
- Resultaten van Thingiverse worden gecombineerd met lokale modellen
- **Zonder token krijg je 0 resultaten**

**Toekomstige providers:**
De structuur is uitgebreidbaar voor andere providers (CGTrader, Sketchfab, etc.) via de `ModelProvider` interface.

## Licentie

Dit project is gemaakt voor educatieve doeleinden.
