// Cloudflare Worker for JAVault Scraper
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'JAVault Scraper Worker'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Main scraper endpoint
    if (url.pathname === '/scrape' && request.method === 'POST') {
      try {
        const { video_code } = await request.json();
        
        if (!video_code) {
          return new Response(JSON.stringify({ error: 'video_code is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Process the scraping job
        const result = await processScrapeJob(video_code, env);
        
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
        
      } catch (error) {
        console.error('Scrape error:', error);
        return new Response(JSON.stringify({ 
          error: error.message || 'Internal server error'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Job processing endpoint (for backend delegation)
    if (url.pathname === '/process-job' && request.method === 'POST') {
      try {
        const { video_code, backend_url } = await request.json();
        
        // Queue the job for processing
        ctx.waitUntil(processVideoJob(video_code, backend_url, env));
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Job queued for processing',
          video_code 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
        
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response('JAVault Scraper Worker', {
      headers: corsHeaders
    });
  },

  // Scheduled event for processing queued jobs
  async scheduled(event, env, ctx) {
    console.log('Scheduled worker running...');
    // Implementation for checking queue and processing jobs
  }
};

async function processScrapeJob(video_code, env) {
  console.log(`Processing scrape job for: ${video_code}`);
  
  try {
    // Normalize video code
    const normalizedCode = video_code.trim().toUpperCase();
    
    // Detect FC2 vs normal video
    const isFC2 = /^FC2-PPV-\d+$/i.test(normalizedCode);
    
    let result;
    if (isFC2) {
      result = await scrapeFC2Video(normalizedCode, env);
    } else {
      result = await scrapeNormalVideo(normalizedCode, env);
    }
    
    return {
      success: true,
      video_code: normalizedCode,
      data: result
    };
    
  } catch (error) {
    console.error(`Error processing ${video_code}:`, error);
    return {
      success: false,
      video_code: video_code,
      error: error.message
    };
  }
}

async function processVideoJob(video_code, backend_url, env) {
  try {
    console.log(`Processing background job for: ${video_code}`);
    
    // Update status to processing
    await updateVideoStatus(video_code, 'processing', backend_url, env);
    
    // Process the video
    const result = await processScrapeJob(video_code, env);
    
    if (result.success) {
      // Update with completed status
      await updateVideoStatus(video_code, 'completed', backend_url, env, result.data);
      console.log(`Job completed for ${video_code}`);
    } else {
      // Update with failed status
      await updateVideoStatus(video_code, 'failed', backend_url, env, null, result.error);
      console.error(`Job failed for ${video_code}: ${result.error}`);
    }
    
  } catch (error) {
    console.error(`Unexpected error processing ${video_code}:`, error);
    await updateVideoStatus(video_code, 'failed', backend_url, env, null, error.message);
  }
}

async function scrapeFC2Video(video_code, env) {
  console.log(`Scraping FC2 video: ${video_code}`);
  
  // Extract FC2 ID
  const fc2Id = video_code.replace(/^FC2-PPV-/i, '');
  
  // Try multiple URL patterns for 123av.com
  const urlPatterns = [
    `https://123av.com/en/dm4/v/fc2-ppv-${fc2Id}`,
    `https://123av.com/en/dm2/v/fc2-ppv-${fc2Id}`,
    `https://123av.com/en/v/fc2-ppv-${fc2Id}`,
    `https://123av.com/dm4/v/fc2-ppv-${fc2Id}`
  ];
  
  for (const url of urlPatterns) {
    try {
      console.log(`Trying FC2 URL: ${url}`);
      const result = await scrapeVideoFromUrl(url, env);
      if (result) {
        return {
          video_code: video_code,
          title_en: result.title,
          poster_url: result.poster,
          video_url: result.stream ? `${env.CF_PROXY_URL || ''}${encodeURIComponent(result.stream)}` : null,
          actresses: result.actresses || [],
          categories: result.categories || [],
          release_date: result.releaseDate,
          source_url: url
        };
      }
    } catch (error) {
      console.log(`Failed to scrape ${url}: ${error.message}`);
      continue;
    }
  }
  
  throw new Error('FC2 video not found on any source');
}

async function scrapeNormalVideo(video_code, env) {
  console.log(`Scraping normal video: ${video_code}`);
  
  // First try r18.dev for metadata
  try {
    const r18Url = `https://r18.dev/videos/vod/movies/detail/-/combined=${video_code}/json`;
    console.log(`Fetching metadata from r18.dev: ${r18Url}`);
    
    const r18Response = await fetch(r18Url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CloudflareWorker/1.0)'
      }
    });
    
    if (r18Response.ok) {
      const r18Data = await r18Response.json();
      console.log(`Found metadata for ${video_code} on r18.dev`);
      
      // Try to get stream from multiple sources
      let streamUrl = null;
      const streamSources = [
        `https://memojav.com/video/${video_code}`,
        `https://123av.com/en/dm4/v/${video_code.toLowerCase()}`,
        `https://123av.com/en/dm2/v/${video_code.toLowerCase()}`,
        `https://123av.com/en/v/${video_code.toLowerCase()}`
      ];
      
      for (const source of streamSources) {
        try {
          const stream = await getStreamFromSource(source, env);
          if (stream) {
            streamUrl = stream;
            break;
          }
        } catch (error) {
          console.log(`Failed to get stream from ${source}: ${error.message}`);
        }
      }
      
      return {
        video_code: r18Data.dvd_id || video_code,
        title_en: r18Data.title_en,
        poster_url: r18Data.jacket_full_url,
        thumbnail_url: r18Data.jacket_thumb_url,
        sample_video_url: r18Data.sample_url,
        video_url: streamUrl ? `${env.CF_PROXY_URL || ''}${encodeURIComponent(streamUrl)}` : null,
        actresses: r18Data.actresses || [],
        categories: r18Data.categories || [],
        directors: r18Data.directors || [],
        galleries: r18Data.gallery || [],
        maker_en: r18Data.maker_name_en,
        label_en: r18Data.label_name_en,
        series: r18Data.series,
        release_date: r18Data.release_date,
        runtime_mins: r18Data.runtime_mins
      };
    }
  } catch (error) {
    console.log(`r18.dev failed for ${video_code}: ${error.message}`);
  }
  
  // Fallback to 123av scraping
  console.log(`Falling back to 123av for ${video_code}`);
  const urlPatterns = [
    `https://123av.com/en/dm4/v/${video_code.toLowerCase()}`,
    `https://123av.com/en/dm2/v/${video_code.toLowerCase()}`,
    `https://123av.com/en/v/${video_code.toLowerCase()}`,
    `https://123av.com/dm4/v/${video_code.toLowerCase()}`
  ];
  
  for (const url of urlPatterns) {
    try {
      console.log(`Trying normal video URL: ${url}`);
      const result = await scrapeVideoFromUrl(url, env);
      if (result) {
        return {
          video_code: video_code,
          title_en: result.title,
          poster_url: result.poster,
          video_url: result.stream ? `${env.CF_PROXY_URL || ''}${encodeURIComponent(result.stream)}` : null,
          actresses: result.actresses || [],
          categories: result.categories || [],
          release_date: result.releaseDate,
          source_url: url
        };
      }
    } catch (error) {
      console.log(`Failed to scrape ${url}: ${error.message}`);
      continue;
    }
  }
  
  throw new Error('Video not found on any source');
}

async function scrapeVideoFromUrl(url, env) {
  // Since Cloudflare Workers don't support Puppeteer, we'll use fetch-based scraping
  // This is a simplified version - you might need to use Cloudflare Browser Rendering API
  // for more complex scraping that requires JavaScript execution
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    
    // Basic HTML parsing (you might need more sophisticated parsing)
    const title = extractFromHtml(html, /<title[^>]*>([^<]+)<\/title>/i);
    const poster = extractFromHtml(html, /(?:poster|thumbnail|image)[^>]*src=["']([^"']+)["']/i);
    
    // Look for m3u8 links in the HTML
    const m3u8Match = html.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/i);
    const stream = m3u8Match ? m3u8Match[0] : null;
    
    if (!title && !poster && !stream) {
      return null; // No useful data found
    }
    
    return {
      title: title ? title.trim() : null,
      poster: poster,
      stream: stream,
      actresses: [],
      categories: [],
      releaseDate: null
    };
    
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    throw error;
  }
}

async function getStreamFromSource(sourceUrl, env) {
  // This would need to be implemented with Browser Rendering API
  // for full JavaScript execution like Puppeteer
  console.log(`Getting stream from: ${sourceUrl}`);
  
  try {
    const response = await fetch(sourceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    
    // Look for m3u8 URLs in the page source
    const m3u8Matches = html.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/gi);
    
    if (m3u8Matches && m3u8Matches.length > 0) {
      // Return the first m3u8 URL found
      return m3u8Matches[0];
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting stream from ${sourceUrl}:`, error);
    return null;
  }
}

async function updateVideoStatus(video_code, status, backend_url, env, data = null, failure_reason = null) {
  try {
    const updatePayload = {
      video_code,
      status,
      ...(data && { data }),
      ...(failure_reason && { failure_reason })
    };

    const response = await fetch(`${backend_url}/api/internal/update-status`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.INTERNAL_API_KEY || 'fallback-key'}`
      },
      body: JSON.stringify(updatePayload)
    });
    
    if (!response.ok) {
      console.error(`Failed to update status for ${video_code}: ${response.status}`);
    } else {
      console.log(`Status updated for ${video_code}: ${status}`);
    }
  } catch (error) {
    console.error(`Error updating video status for ${video_code}:`, error);
  }
}

function extractFromHtml(html, regex) {
  const match = html.match(regex);
  return match ? match[1] : null;
}
