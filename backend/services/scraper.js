// backend/services/scraper.js
const puppeteer = require('puppeteer');
const axios = require('axios');
const url = require('url');

/**
 * Downloads and parses a master m3u8 playlist to find the highest quality stream.
 * @param {string} masterPlaylistUrl The URL of the master playlist.
 * @returns {Promise<string>} The URL of the highest quality stream.
 */
async function getHighestQualityStream(masterPlaylistUrl) {
  try {
    console.log(`Parsing master playlist: ${masterPlaylistUrl}`);
    const response = await axios.get(masterPlaylistUrl);
    const playlistContent = response.data;

    const streams = [];
    const lines = playlistContent.trim().split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('#EXT-X-STREAM-INF')) {
        let bandwidth = 0;
        const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/);
        if (bandwidthMatch) {
          bandwidth = parseInt(bandwidthMatch[1], 10);
        }

        let streamUrl = '';
        if (i + 1 < lines.length && !lines[i + 1].startsWith('#')) {
          streamUrl = lines[i + 1];
        }
        
        if (streamUrl) {
          streams.push({ url: streamUrl, bandwidth });
        }
      }
    }

    if (streams.length === 0) {
      return masterPlaylistUrl;
    }

    const bestStream = streams.reduce((prev, current) => (prev.bandwidth > current.bandwidth) ? prev : current);
    const highestQualityUrl = new url.URL(bestStream.url, masterPlaylistUrl).href;
    console.log(`Found best quality stream with bandwidth ${bestStream.bandwidth} at: ${highestQualityUrl}`);
    return highestQualityUrl;

  } catch (err) {
    console.error(`Could not parse master playlist: ${err.message}`);
    return masterPlaylistUrl;
  }
}

/**
 * A helper function that launches a browser and intercepts .m3u8 links from a given URL.
 * @param {string} targetUrl The URL to scrape.
 * @returns {Promise<string|null>} The found master playlist URL or null.
 */
async function interceptM3U8(targetUrl) {
  let browser;
  try {
    console.log(`Launching browser to intercept: ${targetUrl}`);
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    const capturedRequests = new Set();

    page.on('request', (request) => {
      if (request.url().includes('.m3u8')) {
        capturedRequests.add(request.url());
      }
    });

    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 10000 });

    console.log('Waiting for stream to load...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    console.log(`Done waiting. Found ${capturedRequests.size} m3u8 requests.`);

    if (capturedRequests.size === 0) {
      throw new Error('No .m3u8 links were intercepted.');
    }

    let masterPlaylistUrl = [...capturedRequests].find(req => 
        !req.includes('_240p') && !req.includes('_360p') && !req.includes('_480p') && !req.includes('_720p') && !req.includes('_1080p')
    );

    if (!masterPlaylistUrl) {
      console.log('Could not identify a clear master playlist. Using first captured URL as a fallback.');
      masterPlaylistUrl = capturedRequests.values().next().value;
    }
    
    return masterPlaylistUrl;

  } catch (err) {
    console.error(`Failed to intercept from ${targetUrl}:`, err.message);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Gets the highest quality .m3u8 stream link by trying a primary source and falling back to a secondary one.
 * @param {string} video_code The video code (e.g., 'PPPE-356').
 * @param {string} priorityPattern The URL pattern that worked for metadata (e.g., 'en/dm4/v').
 * @returns {Promise<string|null>} The highest quality .m3u8 URL or null if not found.
 */
async function getM3U8From123AV(video_code, priorityPattern = null) {
  const lower = String(video_code || '').toLowerCase();
  const variants = [
    lower,
    lower.replace(/_/g, '-'),
  ];

  // Based on the HTML analysis, 123av.com uses these URL patterns for FC2-PPV videos
  let prefixes = ['en/dm2/v', 'en/dm4/v', 'en/dm3/v', 'en/v', 'dm4/v', 'en/dm1/v', 'en/dm9/v'];
  
  // If we have a successful pattern from metadata extraction, prioritize it
  if (priorityPattern && !prefixes.includes(priorityPattern)) {
    prefixes = [priorityPattern, ...prefixes];
  } else if (priorityPattern) {
    // Move the successful pattern to the front
    prefixes = [priorityPattern, ...prefixes.filter(p => p !== priorityPattern)];
  }
  
  const urls = [];
  for (const v of variants) {
    for (const p of prefixes) {
      urls.push(`https://123av.com/${p}/${v}`);
    }
  }

  console.log(`Trying 123av.com URLs for ${video_code}:`, urls);

  let masterPlaylist = null;
  for (const u of urls) {
    console.log(`Attempting to intercept M3U8 from: ${u}`);
    masterPlaylist = await interceptM3U8(u);
    if (masterPlaylist) {
      console.log(`Successfully found M3U8 stream from: ${u}`);
      break;
    }
  }

  if (!masterPlaylist) {
    console.log(`No M3U8 stream found for ${video_code} on 123av.com`);
    return null;
  }
  
  return await getHighestQualityStream(masterPlaylist);
}

async function getM3U8(video_code) {
  // Prefer 123av-only if requested upstream; default keeps memojav first
  const priorityUrl = `https://memojav.com/video/${video_code}`;
  let masterPlaylist = await interceptM3U8(priorityUrl);

  if (!masterPlaylist) {
    console.log('Priority source failed. Trying 123av variants...');
    return await getM3U8From123AV(video_code);
  }

  return await getHighestQualityStream(masterPlaylist);
}

module.exports = {
  getM3U8,
  getM3U8From123AV,
  // also export helpers for reuse if needed
  interceptM3U8,
  getHighestQualityStream,
};
