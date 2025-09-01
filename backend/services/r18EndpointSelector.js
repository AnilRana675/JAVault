// r18EndpointSelector.js
const axios = require('axios');

/**
 * Given a user input code, resolves the content_id using the /dvd_id endpoint,
 * then returns the correct detail endpoint for scraping.
 * @param {string} userInput - e.g., "START-393" or "PPPE-356"
 * @returns {Promise<string>} - The detail endpoint URL for the video
 */
async function resolveR18DetailEndpoint(userInput) {
  // 1. Use /dvd_id={code}/json to get the content_id
  const dvdIdUrl = `https://r18.dev/videos/vod/movies/detail/-/dvd_id=${encodeURIComponent(userInput)}/json`;
  const dvdIdRes = await axios.get(dvdIdUrl);
  if (!dvdIdRes.data || !dvdIdRes.data.content_id) {
    throw new Error('Not found on r18.dev (dvd_id lookup failed)');
  }
  const contentId = dvdIdRes.data.content_id;

  // 2. Use /id={content_id}/json to get the actual details
  const detailUrl = `https://r18.dev/videos/vod/movies/detail/-/combined=${contentId}/json`;
  return detailUrl;
}

module.exports = { resolveR18DetailEndpoint };
