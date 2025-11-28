import "dotenv/config";
import { ingestYoutubeForNiche, analyzeNiche } from "./flows/nicheFlows.js";

async function main() {
  const niche = "postpartum fitness for moms";
  const productDescription =
    "Online fitness program for postpartum moms with 20-minute home workouts and no equipment.";
  const language = "EN";
  const country = "US";
  const platform = "Meta Ads";

  const REFRESH_YOUTUBE = process.env.REFRESH_YOUTUBE === "true";

  if (REFRESH_YOUTUBE) {
    console.log(
      "🔄 REFRESH MODE: Searching YouTube, running research and saving to Neon..."
    );

    const ingestResult = await ingestYoutubeForNiche({
      niche,
      language,
      country,
      platform,
      perQuery: 3,
    });

    console.log("YouTube ingest done:", {
      rowId: ingestResult.row.id,
      videosCount: ingestResult.videosCount,
    });
  } else {
    console.log(
      "📦 ANALYSIS ONLY MODE: Using existing data from Neon (no YouTube calls)."
    );
  }

  console.log(
    "🧠 Running analysis (research → personas → creatives) based on latest niche_run..."
  );

  const analysis = await analyzeNiche({
    niche,
    productDescription,
    language,
    country,
    platform,
  });

  console.log("=== ANALYSIS RESULT ===");
  console.log(JSON.stringify(analysis, null, 2));
}

main().catch(console.error);
