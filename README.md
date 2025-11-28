# AI Ad Research & Persona System

Multi-agent AI system for performance marketing teams.

The app:
- researches a **niche** on YouTube  
- analyses winning ads & hooks  
- generates **buyer personas** and **ad hooks**  
- stores everything in **Postgres (Neon)** for reuse  

Single-page web UI, runs locally and can be shown via screenshots / PDF.

---

## Flows

### 1. YouTube Research

Triggered by **“Search YouTube & Save”** → `POST /api/ingest-youtube`:

1. User enters niche, language, country.
2. Query Builder Agent creates multiple YouTube search queries.
3. YouTube Search Tool calls the YouTube Data API and fetches top videos.
4. Research Agent (LLM) extracts:
   - competitors  
   - example ads  
   - recurring hooks  
   - main angles  
5. Results are stored in `niche_runs.videos_json` and `research_json`.

### 2. Personas & Hooks

Triggered by **“Run analysis from DB”** → `POST /api/analyze`:

1. `GET /api/niches` returns distinct `niche` values from `niche_runs`.
2. User selects a niche from the dropdown.
3. Backend loads the latest row for that niche:
   - if `personas_json` and `creatives_json` exist → returns them (cached)
   - otherwise:
     - Persona & Targeting Agent: 3–5 personas (pains, desires, tones)
     - Creative Agent: hooks per persona
     - saves into `personas_json` and `creatives_json`
4. UI renders persona cards and hooks list.

---

## Architecture

### Frontend

- `public/index.html`  
- HTML + CSS + vanilla JS (`fetch`)  
- Sections:
  - Global inputs (niche for YouTube search, language, country)
  - Step 1: YouTube ingest (button)
  - Step 2: Generate output from DB (dropdown + button)
  - Result card: personas & hooks

### Backend

- Node.js (ESM) + Express – `src/server.js`  
- Endpoints:
  - `GET /api/health`
  - `GET /api/niches`
  - `POST /api/ingest-youtube`
  - `POST /api/analyze`

### Agents & Tools

- `agents/queryBuilderAgent.js` – builds YouTube queries from niche  
- `tools/youtubeSearch.js` – wraps YouTube Data API  
- `agents/researchAgent.js` – LLM analysis of videos  
- `agents/personaTargetingAgent.js` – personas, targeting ideas, tones  
- `agents/creativeAgent.js` – hooks per persona  
- `flows/nicheFlows.js` – orchestrates flows + DB read/write  

---

## Tech Stack

- Node.js (ES modules)  
- Express  
- Postgres / Neon (`pg`)  
- OpenAI Chat Completions (LLM agents)  
- YouTube Data API v3  
- HTML, CSS, vanilla JavaScript 
