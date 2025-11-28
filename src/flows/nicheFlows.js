// src/flows/nicheFlows.js
import { query } from "../db.js";
import { buildYoutubeQueries } from "../agents/queryBuilderAgent.js";
import { searchYoutube } from "../tools/youtubeSearch.js";
import { runResearchAgent } from "../agents/researchAgent.js";
import { runPersonaTargetingAgent } from "../agents/personaTargetingAgent.js";
import { runCreativeAgent } from "../agents/creativeAgent.js";

/**
 * Flow A: Search YouTube + run research + store in Neon
 *
 * input: { niche, language, country, platform, perQuery? }
 */
export async function ingestYoutubeForNiche({
  niche,
  language,
  country,
  platform,
  perQuery = 3,
}) {
  const { queries } = await buildYoutubeQueries({
    niche,
    language,
    country,
  });

  const videos = await searchYoutube(queries, {
    perQuery,
    regionCode: country,
    relevanceLanguage: language.toLowerCase(),
  });

  const research = await runResearchAgent({
    niche,
    language,
    videos,
  });

  const insertSql = `
    INSERT INTO niche_runs (
      niche,
      language,
      country,
      platform,
      videos_json,
      research_json,
      personas_json,
      creatives_json
    )
    VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, NULL, NULL)
    RETURNING *;
  `;

  const params = [
    niche,
    language,
    country,
    platform,
    JSON.stringify(videos),
    JSON.stringify(research),
  ];

  const result = await query(insertSql, params);
  const row = result.rows[0];

  return {
    row,
    queries,
    videosCount: videos.length,
  };
}

/**
 * Flow B: Use latest niche_run from Neon.
 *
 * - If personas_json + creatives_json already exist → just return them (NO agent calls).
 * - If they are missing → run Persona & Creative agents, update row, return result.
 *
 * input: { niche, productDescription, language?, country?, platform? }
 */
export async function analyzeNiche({
  niche,
  productDescription,
  language,
  country,
  platform,
}) {
  // 1) Fetch latest run for this niche
  const selectSql = `
    SELECT *
    FROM niche_runs
    WHERE niche = $1
    ORDER BY created_at DESC
    LIMIT 1;
  `;

  const result = await query(selectSql, [niche]);

  if (result.rows.length === 0) {
    throw new Error(`No niche_runs found for niche "${niche}"`);
  }

  const run = result.rows[0];

  const lang = language || run.language;
  const ctry = country || run.country;
  const plat = platform || run.platform;
  const research = run.research_json;

  // 2) If personas + creatives already exist → reuse them
  if (run.personas_json && run.creatives_json) {
    console.log(
      "✅ Using cached personas + creatives from DB for niche:",
      niche
    );

    const personasData = run.personas_json;
    const creativesData = run.creatives_json;

    return {
      runId: run.id,
      cached: true,
      research,
      personas: personasData.personas || [],
      targeting: personasData.targeting || [],
      tones: personasData.tones || [],
      creatives: creativesData,
    };
  }

  console.log(
    "⚙️ No personas/creatives in DB yet, running agents for niche:",
    niche
  );

  // 3) Persona & targeting agent
  const personaOutput = await runPersonaTargetingAgent({
    niche,
    productDescription,
    language: lang,
    country: ctry,
    platform: plat,
    research,
  });

  // 4) Creative agent
  const creativeOutput = await runCreativeAgent({
    niche,
    productDescription,
    language: lang,
    platform: plat,
    personas: personaOutput.personas,
    winningHooks: research.winning_hooks,
    tones: personaOutput.tones,
  });

  // 5) Update row with personas_json + creatives_json
  const updateSql = `
    UPDATE niche_runs
    SET personas_json = $1::jsonb,
        creatives_json = $2::jsonb
    WHERE id = $3
    RETURNING *;
  `;

  const updateParams = [
    JSON.stringify(personaOutput),
    JSON.stringify(creativeOutput),
    run.id,
  ];

  await query(updateSql, updateParams);

  return {
    runId: run.id,
    cached: false,
    research,
    personas: personaOutput.personas,
    targeting: personaOutput.targeting,
    tones: personaOutput.tones,
    creatives: creativeOutput,
  };
}
