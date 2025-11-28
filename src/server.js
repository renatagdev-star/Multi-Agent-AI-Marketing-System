// src/server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import { ingestYoutubeForNiche, analyzeNiche } from "./flows/nicheFlows.js";
import { query } from "./db.js";

// ESM helpers for __dirname / __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend from /public (index.html on /)
app.use(express.static(path.join(__dirname, "../public")));

// Simple health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Return list of distinct niches from DB for the dropdown
app.get("/api/niches", async (req, res) => {
  try {
    const result = await query(
      `
      SELECT DISTINCT niche
      FROM niche_runs
      ORDER BY niche ASC;
      `,
      []
    );

    const niches = result.rows.map((r) => r.niche);
    res.json({ niches });
  } catch (err) {
    console.error("Error in /api/niches:", err);
    res.status(500).json({
      error: "Internal server error",
      details: err.message,
    });
  }
});

/**
 * 1) Search YouTube + Research + Save to Neon
 *
 * POST /api/ingest-youtube
 * Body:
 * {
 *   "niche": string,
 *   "language": "EN",
 *   "country": "US",
 *   "perQuery": 3   // optional
 * }
 */
app.post("/api/ingest-youtube", async (req, res) => {
  try {
    const { niche, language = "EN", country = "US", perQuery = 3 } = req.body;

    if (!niche) {
      return res.status(400).json({
        error: "niche is required",
      });
    }

    console.log("🔄 Ingest YouTube for niche:", niche);

    // Internal default platform – not required from user
    const platform = "Meta Ads";

    const result = await ingestYoutubeForNiche({
      niche,
      language,
      country,
      platform,
      perQuery,
    });

    res.json({
      status: "ok",
      message: "YouTube search + research completed and saved to Neon.",
      rowId: result.row.id,
      videosCount: result.videosCount,
      queries: result.queries,
    });
  } catch (err) {
    console.error("Error in /api/ingest-youtube:", err);
    res.status(500).json({
      error: "Internal server error",
      details: err.message,
    });
  }
});

/**
 * 2) Generate output from DB (research → personas → creatives)
 *
 * POST /api/analyze
 * Body:
 * {
 *   "niche": string,
 *   "language": "EN",     // optional, fallback = from DB
 *   "country": "US",      // optional, fallback = from DB
 *   "platform": "Meta Ads"// optional, fallback = from DB
 * }
 */
app.post("/api/analyze", async (req, res) => {
  try {
    const {
      niche,
      productDescription, // optional
      language,
      country,
      platform,
    } = req.body;

    if (!niche) {
      return res.status(400).json({
        error: "niche is required",
      });
    }

    // If no explicit product description is provided,
    // build a generic one from the niche
    const effectiveProductDescription =
      productDescription && productDescription.trim().length > 0
        ? productDescription
        : `Offer in the niche: ${niche}.`;

    console.log("🧠 Analyze niche from Neon:", niche);

    const analysis = await analyzeNiche({
      niche,
      productDescription: effectiveProductDescription,
      language,
      country,
      platform,
    });

    res.json({
      status: "ok",
      niche,
      analysis,
    });
  } catch (err) {
    console.error("Error in /api/analyze:", err);
    res.status(500).json({
      error: "Internal server error",
      details: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
