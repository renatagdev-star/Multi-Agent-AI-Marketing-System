// src/tools/youtubeSearch.js
import "dotenv/config";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

if (!YOUTUBE_API_KEY) {
  throw new Error("Missing YOUTUBE_API_KEY in environment variables");
}

/**
 * Search YouTube for a list of queries and return flattened video results.
 *
 * @param {string[]} queries - list of search strings
 * @param {object} options
 * @param {number} options.perQuery - how many videos per query (default 5)
 * @param {string} options.regionCode - optional region code, e.g. "US", "DE"
 * @param {string} options.relevanceLanguage - optional language code, e.g. "en", "de"
 * @returns {Promise<Array>} videos
 */
export async function searchYoutube(
  queries,
  { perQuery = 5, regionCode, relevanceLanguage } = {}
) {
  const allVideosMap = new Map(); // key: videoId, value: video object

  for (const query of queries) {
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.set("key", YOUTUBE_API_KEY);
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("maxResults", String(perQuery));
    searchUrl.searchParams.set("q", query);

    if (regionCode) searchUrl.searchParams.set("regionCode", regionCode);
    if (relevanceLanguage)
      searchUrl.searchParams.set("relevanceLanguage", relevanceLanguage);

    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      const text = await searchRes.text();
      console.error("YouTube search error:", searchRes.status, text);
      continue;
    }

    const searchData = await searchRes.json();

    const videoIds = searchData.items
      .map((item) => item.id?.videoId)
      .filter(Boolean);

    if (videoIds.length === 0) continue;

    // Fetch details + statistics (views) for these video IDs
    const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    videosUrl.searchParams.set("key", YOUTUBE_API_KEY);
    videosUrl.searchParams.set("part", "snippet,statistics");
    videosUrl.searchParams.set("id", videoIds.join(","));

    const videosRes = await fetch(videosUrl);
    if (!videosRes.ok) {
      const text = await videosRes.text();
      console.error("YouTube videos error:", videosRes.status, text);
      continue;
    }

    const videosData = await videosRes.json();

    for (const item of videosData.items ?? []) {
      const videoId = item.id;
      const snippet = item.snippet ?? {};
      const stats = item.statistics ?? {};

      const videoObj = {
        query, // which search term found this video
        videoId,
        title: snippet.title ?? "",
        channel: snippet.channelTitle ?? "",
        views: stats.viewCount ? Number(stats.viewCount) : null,
        description: snippet.description ?? "",
        publishedAt: snippet.publishedAt ?? null,
        url: `https://www.youtube.com/watch?v=${videoId}`,
      };

      // Avoid duplicates if same video appears in multiple queries
      if (!allVideosMap.has(videoId)) {
        allVideosMap.set(videoId, videoObj);
      }
    }
  }

  return Array.from(allVideosMap.values());
}
