# Agents

This folder contains the core AI agents used by the system.

The actual implementation is kept private, but the structure is:

- `queryBuilderAgent.js`  
  - Input: `{ niche, language, country }`  
  - Output: `{ queries: string[] }` – list of YouTube search queries for the niche.

- `researchAgent.js`  
  - Input: `{ niche, language, videos }`  
  - Output:  
    ```jsonc
    {
      "competitors": [...],
      "example_ads": [...],
      "winning_hooks": [...],
      "angles": [...]
    }
    ```

- `personaTargetingAgent.js`  
  - Input: `{ niche, productDescription, language, country, platform, research }`  
  - Output:  
    ```jsonc
    {
      "personas": [...],
      "targeting": [...],
      "tones": [...]
    }
    ```

- `creativeAgent.js`  
  - Input: `{ niche, productDescription, language, platform, personas, winningHooks, tones }`  
  - Output:  
    ```jsonc
    {
      "hooks": [...]
    }
    ```

Each agent is implemented as a pure async function that calls an LLM (OpenAI) with a structured prompt and returns JSON-safe data that is saved to Postgres (Neon) via `flows/nicheFlows.js`
