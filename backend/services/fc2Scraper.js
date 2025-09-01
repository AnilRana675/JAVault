const axios = require('axios');
const cheerio = require('cheerio');
const yaml = require('js-yaml');

function normalizeCode(code) {
  if (!code) return null;
  const m = String(code).toUpperCase().replace(/\s+/g, '').match(/(?:FC2-?PPV-?)?(\d{5,})/);
  return m ? { id: m[1], display: `FC2-PPV-${m[1]}` } : null;
}

async function fetchHtml(url) {
  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    timeout: 30000,
    validateStatus: s => s >= 200 && s < 400,
  });
  return res.data;
}

function text($, sel) {
  const t = $(sel).first().text().trim();
  return t || undefined;
}

function attr($, sel, name) {
  const v = $(sel).first().attr(name);
  return v || undefined;
}

function unique(arr) {
  return Array.from(new Set(arr.filter(Boolean)));
}

const yamlCache = new Map();
async function loadYamlSchema(url) {
  const u = url || process.env.FC2_YAML_URL;
  if (!u) return null;
  if (yamlCache.has(u)) return yamlCache.get(u);
  try {
    const raw = await fetchHtml(u);
    const parsed = yaml.load(raw);
    yamlCache.set(u, parsed);
    return parsed;
  } catch (e) {
    console.warn('Failed to load YAML schema from', u);
    return null;
  }
}

function extractWithSchema($, schema) {
  if (!schema) return {};
  const out = {};
  const get = sel => sel ? text($, sel) : undefined;
  const geta = (sel, name) => sel ? attr($, sel, name || 'src') : undefined;
  try {
    out.title_en = get(schema.title) || out.title_en;
    out.poster_url = geta(schema.poster, schema.posterAttr || 'src') || out.poster_url;
    out.thumbnail_url = out.poster_url || out.thumbnail_url;
    if (schema.description) out.description = get(schema.description);
    if (schema.tags) {
      const tags = unique($(schema.tags).map((_, a) => $(a).text().trim()).get());
      out.categories = tags.map(name => ({ id: undefined, name_en: name }));
    }
    if (schema.gallery) {
      const imgs = unique($(schema.gallery).map((_, img) => $(img).attr(schema.galleryAttr || 'src')).get());
      out.galleries = imgs.map(src => ({ image_full: src, image_thumb: src })).slice(0, 12);
    }
  } catch (_) { /* ignore schema errors */ }
  return out;
}


function extractM3U8FromHtml($, html) {
  // 1) JSON-LD contentUrl
  try {
    const jsonLd = $('script[type="application/ld+json"]').map((_, s) => $(s).contents().text()).get();
    for (const raw of jsonLd) {
      try {
        const obj = JSON.parse(raw);
        const candidates = Array.isArray(obj) ? obj : [obj];
        for (const o of candidates) {
          const url = o?.contentUrl || o?.embedUrl || o?.url;
          if (typeof url === 'string' && /\.m3u8(\?|$)/i.test(url)) return url;
        }
      } catch {}
    }
  } catch {}
  // 2) <source> tags
  const source = $('source[type*="mpegURL" i], source[src*=".m3u8" i]').attr('src');
  if (source && /\.m3u8/i.test(source)) return source;
  // 3) Any .m3u8 in HTML text
  const m = String(html || '').match(/https?:[^'"\s<>]+\.m3u8[^'"\s<>]*/i);
  return m ? m[0] : undefined;
}

async function scrapeFromMissAV(id) {
  // Try English path first, then fallback
  const candidates = [
    `https://missav.com/en/fc2-ppv-${id}`,
    `https://missav.com/fc2-ppv-${id}`,
  ];
  let html = null, finalUrl = null;
  for (const url of candidates) {
    try {
      html = await fetchHtml(url);
      finalUrl = url;
      break;
    } catch (_) {}
  }
  // Fallback: search page to resolve canonical slug
  if (!html) {
    try {
      const searchUrl = `https://missav.com/en/search/${id}?type=fc2`;
      const searchHtml = await fetchHtml(searchUrl);
      const $$ = cheerio.load(searchHtml);
      const first = $$('a[href*="/fc2-ppv-"]').map((_, a) => $$(a).attr('href')).get()
        .find(href => href && href.includes(`fc2-ppv-${id}`));
      if (first) {
        const absolute = first.startsWith('http') ? first : `https://missav.com${first}`;
        html = await fetchHtml(absolute);
        finalUrl = absolute;
      }
    } catch (_) {}
  }
  if (!html) throw new Error('MissAV: video not found (404)');
  const $ = cheerio.load(html);

  const title = text($, 'meta[property="og:title"]') || text($, 'h1, h2, .title');
  const poster = attr($, 'meta[property="og:image"]', 'content') || attr($, 'img[alt*="poster"], .cover img, .poster img, img', 'src');
  const description = attr($, 'meta[name="description"]', 'content') || text($, '.description, .summary');
  const tags = unique($('a[href*="/genre"], a[href*="/tag"], a[href*="/category"], .tags a')
    .map((_, a) => $(a).text().trim()).get()).map(name => ({ id: undefined, name_en: name }));
  const gallery = unique(
    $('img').map((_, img) => $(img).attr('src')).get()
      .filter(src => /\.(jpg|jpeg|png|webp)(\?|$)/i.test(src) && !/logo|icon|sprite/i.test(src))
  ).slice(0, 12);

  // Optional YAML overlay for MissAV if provided
  let overlay = {};
  try {
    const missavYaml = await loadYamlSchema(process.env.MISSAV_YAML_URL);
    if (missavYaml) overlay = extractWithSchema($, missavYaml) || {};
  } catch (_) {}

  // Attempt to extract HLS stream from page
  const missavStream = extractM3U8FromHtml($, html);

  return {
    source_url: finalUrl,
    title_en: overlay.title_en || title,
    poster_url: overlay.poster_url || poster,
    thumbnail_url: overlay.thumbnail_url || poster,
    description: overlay.description || description,
    categories: overlay.categories || tags,
    galleries: overlay.galleries || gallery.map(src => ({ image_full: src, image_thumb: src })),
    _missav_stream: missavStream,
  };
}


const { getM3U8From123AV } = require('./scraper');

async function scrapeNormalVideoFrom123AV(video_code) {
  // Try multiple URL patterns for normal videos, prioritizing patterns with complete details
  const urlPatterns = [
    `https://123av.com/en/dm2/v/${video_code.toLowerCase()}`,
    `https://123av.com/en/dm4/v/${video_code.toLowerCase()}`,
    `https://123av.com/en/dm3/v/${video_code.toLowerCase()}`,
    `https://123av.com/en/v/${video_code.toLowerCase()}`,
    `https://123av.com/en/dm1/v/${video_code.toLowerCase()}`,
    `https://123av.com/en/dm9/v/${video_code.toLowerCase()}`
  ];
  
  let html, finalUrl, validData = null;
  
  for (const url of urlPatterns) {
    try {
      console.log(`Trying to scrape normal video details from: ${url}`);
      html = await fetchHtml(url);
      
      // Validate if this URL has actual details
      const $ = cheerio.load(html);
      const hasDetailsSection = $('.detail-item > div').length > 0;
      const hasValidPoster = attr($, '#player', 'data-poster') || 
                            attr($, 'meta[property="og:image"]', 'content');
      const hasValidTitle = text($, 'h1') || attr($, 'meta[property="og:title"]', 'content');
      
      // Check if poster is not a placeholder/logo
      const isValidPoster = hasValidPoster && 
                           !hasValidPoster.includes('logo') && 
                           !hasValidPoster.includes('favicon') &&
                           !hasValidPoster.includes('default');
      
      console.log(`URL validation for ${url}:`);
      console.log(`- Has details section: ${hasDetailsSection}`);
      console.log(`- Has valid poster: ${isValidPoster}`);
      console.log(`- Has valid title: ${!!hasValidTitle}`);
      
      // Only accept URLs that have complete metadata
      if (hasDetailsSection && isValidPoster && hasValidTitle) {
        finalUrl = url;
        console.log(`✅ Successfully validated and loaded from: ${url}`);
        break;
      } else {
        console.log(`⚠️ URL ${url} lacks complete details, trying next...`);
        continue;
      }
    } catch (error) {
      console.log(`❌ Failed to load ${url}: ${error.message}`);
      continue;
    }
  }
  
  if (!html || !finalUrl) {
    throw new Error(`Failed to load ${video_code} with complete details from any 123av URL pattern`);
  }
  
  console.log(`Scraping normal video details from: ${finalUrl}`);
  const $ = cheerio.load(html);

  // Extract title from h1 element or page title
  const h1Title = text($, 'h1');
  const pageTitle = text($, 'title');
  const title = h1Title || (pageTitle ? pageTitle.replace(/ - 123AV$/, '').replace(/^[A-Z0-9-]+\s*/, '') : undefined);
  
  // Extract poster image from player data-poster attribute or meta tags
  const poster = attr($, '#player', 'data-poster') || 
                attr($, 'meta[property="og:image"]', 'content') || 
                attr($, '.cover img, .poster img', 'src');
  
  // Extract description from meta tag
  const description = attr($, 'meta[name="description"]', 'content');
  
  // Extract details from the detail-item section
  const details = {};
  $('.detail-item > div').each((_, div) => {
    const label = $(div).find('span').first().text().trim();
    const value = $(div).find('span').last().text().trim();
    
    if (label.includes('Release date') || label.includes('release')) {
      details.release_date = value;
    } else if (label.includes('Runtime') || label.includes('runtime') || label.includes('Duration')) {
      // Parse runtime from "HH:MM:SS" or "MM:SS" format to minutes
      const timeParts = value.split(':');
      if (timeParts.length === 3) {
        // HH:MM:SS format
        const hours = parseInt(timeParts[0], 10) || 0;
        const minutes = parseInt(timeParts[1], 10) || 0;
        const seconds = parseInt(timeParts[2], 10) || 0;
        details.runtime_mins = hours * 60 + minutes + Math.round(seconds / 60);
      } else if (timeParts.length === 2) {
        // MM:SS format
        const minutes = parseInt(timeParts[0], 10) || 0;
        const seconds = parseInt(timeParts[1], 10) || 0;
        details.runtime_mins = minutes + Math.round(seconds / 60);
      } else {
        // Try to extract just numbers as minutes
        details.runtime_mins = parseInt(value.replace(/[^0-9]/g, ''), 10) || undefined;
      }
    } else if (label.includes('Maker') || label.includes('maker')) {
      details.maker_en = $(div).find('a').text().trim() || value;
    } else if (label.includes('Label') || label.includes('label')) {
      details.label_en = $(div).find('a').text().trim() || value;
    } else if (label.includes('Series') || label.includes('series')) {
      details.series_en = $(div).find('a').text().trim() || value;
    }
  });
  
  // Extract actresses from specific actress section
  const actresses = [];
  $('.detail-item .actress a, a[href*="/actresses/"], a[href*="/actress/"]').each((_, a) => {
    const name = $(a).text().trim();
    if (name && name.length > 0) {
      actresses.push({ id: undefined, name_romaji: name });
    }
  });
  
  // Extract genres/categories from the specific Genres field
  const genresText = $('.detail-item > div').filter((_, div) => {
    const label = $(div).find('span').first().text().trim();
    return label.includes('Genres') || label.includes('genres');
  }).find('span').last().text().trim();
  
  const genres = genresText ? genresText.split(',').map(g => g.trim()).filter(g => g.length > 0) : [];
  
  // Extract tags from the specific Tags field
  const tagsText = $('.detail-item > div').filter((_, div) => {
    const label = $(div).find('span').first().text().trim();
    return label.includes('Tags') || label.includes('tags');
  }).find('span').last().text().trim();
  
  const tags = tagsText ? tagsText.split(',').map(t => t.trim()).filter(t => t.length > 0) : [];
  
  // Combine only the actual genres and tags from the detail section
  const allCategories = unique([...genres, ...tags])
    .map(name => ({ id: undefined, name_en: name }));
  
  // Extract gallery images
  const gallery = unique(
    $('img').map((_, img) => $(img).attr('src')).get()
      .filter(src => /\.(jpg|jpeg|png|webp)(\?|$)/i.test(src) && 
                    !/logo|icon|sprite|avatar/i.test(src) &&
                    src.includes('/images/') || src.includes('/gallery/'))
  ).slice(0, 12);
  
  // Extract the successful URL pattern for video extraction optimization
  const urlPattern = finalUrl.match(/123av\.com\/([^/]+\/[^/]+\/[^/]+)\//)?.[1] || 'en/dm4/v';
  
  const result = {
    source_url: finalUrl,
    successful_pattern: urlPattern, // Track which pattern worked for optimization
    // Map fields to match MongoDB schema
    video_code: video_code.toUpperCase(), // dvd_id -> video_code
    title_en: title,
    poster_url: poster, // jacket_full_url -> poster_url
    thumbnail_url: poster, // jacket_thumb_url -> thumbnail_url  
    description,
    release_date: details.release_date,
    runtime_mins: details.runtime_mins,
    maker_en: details.maker_en, // maker_name_en -> maker_en
    label_en: details.label_en, // label_name_en -> label_en
    // Fix series to match MongoDB schema - convert string to object
    series: details.series_en ? { id: undefined, name_en: details.series_en } : undefined,
    actresses,
    categories: allCategories,
    galleries: gallery.map(src => ({ image_full: src, image_thumb: src })), // gallery -> galleries
  };

  console.log(`123av normal video scraping completed: title="${result.title_en?.substring(0, 50)}...", runtime=${result.runtime_mins}min, actresses=${result.actresses.length}, genres/tags=${result.categories.length}`);

  return result;
}

async function getNormalVideoDetailsFrom123AV(video_code) {
  console.log(`Getting normal video details from 123AV for: ${video_code}`);
  
  // Get detailed metadata from 123av.com
  const data = await scrapeNormalVideoFrom123AV(video_code);
  
  // Get video stream using the successful pattern from metadata extraction
  const proxyPrefix = process.env.CF_PROXY_URL || 'https://your-cf-worker.example.com/v2?url=';
  let stream;
  try { 
    // Use the pattern that worked for metadata extraction first
    stream = await getM3U8From123AV(video_code.toLowerCase(), data.successful_pattern); 
  } catch (error) { 
    console.log(`Failed to get stream for ${video_code}:`, error.message);
    stream = undefined; 
  }
  
  const video_url = stream ? `${proxyPrefix}${encodeURIComponent(stream)}` : undefined;
  
  return {
    ...data,
    successful_pattern: undefined, // Remove internal tracking from final result
    video_url,
    status: video_url ? 'completed' : 'failed',
    failure_reason: video_url ? undefined : 'Stream not found',
  };
}

async function getFC2Details(code) {
  const norm = normalizeCode(code);
  if (!norm) throw new Error('Invalid FC2 code');
  const { id, display } = norm;

  // MissAV-first metadata
  const data = await scrapeFromMissAV(id);

  const proxyPrefix = process.env.CF_PROXY_URL || 'https://your-cf-worker.example.com/v2?url=';
  let stream = data?._missav_stream;
  if (!stream) {
    // Fallback to generic 123AV variants
    const fc2Slug = `fc2-ppv-${id}`.toLowerCase();
    try { stream = await getM3U8From123AV(fc2Slug); } catch (_) {}
  }
  const video_url = stream ? `${proxyPrefix}${encodeURIComponent(stream)}` : undefined;

  return {
    video_code: display,
    status: video_url ? 'completed' : 'failed',
    failure_reason: video_url ? undefined : 'Stream not found',
    ...data,
    video_url,
  };
}

async function scrapeFrom123AVDetails(id) {
  // Try multiple URL patterns for FC2 videos, prioritizing dm2 and dm4 patterns
  const urlPatterns = [
    `https://123av.com/en/dm2/v/fc2-ppv-${id}`,
    `https://123av.com/en/dm4/v/fc2-ppv-${id}`,
    `https://123av.com/en/dm3/v/fc2-ppv-${id}`,
    `https://123av.com/en/v/fc2-ppv-${id}`,
    `https://123av.com/en/dm1/v/fc2-ppv-${id}`,
    `https://123av.com/en/dm9/v/fc2-ppv-${id}`
  ];
  
  let html, finalUrl, validData = null;
  
  for (const url of urlPatterns) {
    try {
      console.log(`Trying to scrape 123av details from: ${url}`);
      html = await fetchHtml(url);
      
      // Validate if this URL has actual details
      const $ = cheerio.load(html);
      const hasDetailsSection = $('.detail-item > div').length > 0;
      const hasValidPoster = attr($, '#player', 'data-poster') || 
                            attr($, 'meta[property="og:image"]', 'content');
      const hasValidTitle = text($, 'h1') || attr($, 'meta[property="og:title"]', 'content');
      
      // Check if poster is not a placeholder/logo
      const isValidPoster = hasValidPoster && 
                           !hasValidPoster.includes('logo') && 
                           !hasValidPoster.includes('favicon') &&
                           !hasValidPoster.includes('default');
      
      console.log(`URL validation for ${url}:`);
      console.log(`- Has details section: ${hasDetailsSection}`);
      console.log(`- Has valid poster: ${isValidPoster}`);
      console.log(`- Has valid title: ${!!hasValidTitle}`);
      
      // Only accept URLs that have complete metadata
      if (hasDetailsSection && isValidPoster && hasValidTitle) {
        finalUrl = url;
        console.log(`✅ Successfully validated and loaded from: ${url}`);
        break;
      } else {
        console.log(`⚠️ URL ${url} lacks complete details, trying next...`);
        continue;
      }
    } catch (error) {
      console.log(`❌ Failed to load ${url}: ${error.message}`);
      continue;
    }
  }
  
  if (!html || !finalUrl) {
    throw new Error(`Failed to load FC2-PPV-${id} with complete details from any 123av URL pattern`);
  }
  
  const $ = cheerio.load(html);

  // Extract title from h1 element or page title
  const h1Title = text($, 'h1');
  const ogTitle = attr($, 'meta[property="og:title"]', 'content');
  const pageTitle = text($, 'title');
  
  // Clean up the title by removing site branding and code prefix
  let title = h1Title || ogTitle || pageTitle;
  if (title) {
    title = title.replace(/ - 123AV$/, '')
                 .replace(/^FC2-PPV-\d+\s*/, '')
                 .replace(/^FC2-PPV-\d+\s*Watch Online,\s*,\s*/, '')
                 .trim();
  }
  
  // Extract poster image from multiple sources
  const poster = attr($, '#player', 'data-poster') || 
                attr($, 'meta[property="og:image"]', 'content') || 
                attr($, '.cover img, .poster img', 'src');
  
  // Extract description from meta tag
  const description = attr($, 'meta[name="description"]', 'content');
  
  // Extract details from the detail-item section
  const details = {};
  $('.detail-item > div').each((_, div) => {
    const label = $(div).find('span').first().text().trim();
    const value = $(div).find('span').last().text().trim();
    
    if (label.includes('Release date') || label.includes('release')) {
      details.release_date = value;
    } else if (label.includes('Runtime') || label.includes('runtime') || label.includes('Duration')) {
      // Parse runtime from "HH:MM:SS" or "MM:SS" format to minutes
      const timeParts = value.split(':');
      if (timeParts.length === 3) {
        // HH:MM:SS format
        const hours = parseInt(timeParts[0], 10) || 0;
        const minutes = parseInt(timeParts[1], 10) || 0;
        const seconds = parseInt(timeParts[2], 10) || 0;
        details.runtime_mins = hours * 60 + minutes + Math.round(seconds / 60);
      } else if (timeParts.length === 2) {
        // MM:SS format
        const minutes = parseInt(timeParts[0], 10) || 0;
        const seconds = parseInt(timeParts[1], 10) || 0;
        details.runtime_mins = minutes + Math.round(seconds / 60);
      } else {
        // Try to extract just numbers as minutes
        details.runtime_mins = parseInt(value.replace(/[^0-9]/g, ''), 10) || undefined;
      }
    } else if (label.includes('Maker') || label.includes('maker')) {
      details.maker_en = $(div).find('a').text().trim() || value;
    }
  });
  
  // Extract genres/categories from the specific Genres field
  const genresText = $('.detail-item > div').filter((_, div) => {
    const label = $(div).find('span').first().text().trim();
    return label.includes('Genres') || label.includes('genres');
  }).find('span').last().text().trim();
  
  const genres = genresText ? genresText.split(',').map(g => g.trim()).filter(g => g.length > 0) : [];
  
  // Extract tags from the specific Tags field
  const tagsText = $('.detail-item > div').filter((_, div) => {
    const label = $(div).find('span').first().text().trim();
    return label.includes('Tags') || label.includes('tags');
  }).find('span').last().text().trim();
  
  const tags = tagsText ? tagsText.split(',').map(t => t.trim()).filter(t => t.length > 0) : [];
  
  // Combine only the actual genres and tags from the detail section
  const allCategories = unique([...genres, ...tags])
    .map(name => ({ id: undefined, name_en: name }));
  
  // Extract the successful URL pattern for video extraction optimization
  const urlPattern = finalUrl.match(/123av\.com\/([^/]+\/[^/]+\/[^/]+)\//)?.[1] || 'en/dm4/v';
  
  const result = {
    source_url: finalUrl,
    successful_pattern: urlPattern, // Track which pattern worked for optimization
    title_en: title,
    poster_url: poster,
    thumbnail_url: poster,
    description,
    release_date: details.release_date,
    runtime_mins: details.runtime_mins,
    maker_en: details.maker_en,
    categories: allCategories,
    galleries: [], // Empty galleries for FC2 videos
  };

  // Final validation to ensure we have meaningful data
  const hasMinimumData = result.title_en && 
                         result.poster_url && 
                         !result.poster_url.includes('logo') && 
                         (result.release_date || result.runtime_mins || result.categories.length > 0);

  if (!hasMinimumData) {
    console.warn(`⚠️ Warning: Extracted data seems incomplete for FC2-PPV-${id}`);
    console.warn(`Title: ${!!result.title_en}, Poster: ${!!result.poster_url}, Details: ${!!(result.release_date || result.runtime_mins)}`);
  }

  console.log(`123av scraping completed: title="${result.title_en?.substring(0, 50)}...", runtime=${result.runtime_mins}min, genres/tags=${result.categories.length}`);

  return result;
}

async function getFC2DetailsFrom123AV(code) {
  const norm = normalizeCode(code);
  if (!norm) throw new Error('Invalid FC2 code');
  const { id, display } = norm;
  
  // Get detailed metadata from 123av.com
  const data = await scrapeFrom123AVDetails(id);
  
  // Get video stream using the successful pattern from metadata extraction
  const proxyPrefix = process.env.CF_PROXY_URL || 'https://your-cf-worker.example.com/v2?url=';
  let stream;
  try { 
    // Use the pattern that worked for metadata extraction first
    stream = await getM3U8From123AV(`fc2-ppv-${id}`, data.successful_pattern); 
  } catch (error) { 
    console.log(`Failed to get stream for ${id}:`, error.message);
    stream = undefined; 
  }
  
  const video_url = stream ? `${proxyPrefix}${encodeURIComponent(stream)}` : undefined;
  
  return {
    video_code: display,
    status: video_url ? 'completed' : 'failed',
    failure_reason: video_url ? undefined : 'Stream not found',
    // Spread all the detailed metadata from 123av.com (excluding internal tracking)
    ...data,
    successful_pattern: undefined, // Remove internal tracking from final result
    video_url,
  };
}

module.exports = { getFC2Details, normalizeCode, getFC2DetailsFrom123AV, getNormalVideoDetailsFrom123AV, scrapeFrom123AVDetails, scrapeNormalVideoFrom123AV };
