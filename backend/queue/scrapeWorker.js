// backend/queue/scrapeWorker.js
require('dotenv').config();
const { Worker } = require('bullmq');
const mongoose = require('mongoose');
const { redis } = require('../config/db'); 
const Video = require('../models/Video');
const axios = require('axios');
const scraper = require('../services/scraper');
const { getFC2Details, getFC2DetailsFrom123AV, normalizeCode, getNormalVideoDetailsFrom123AV } = require('../services/fc2Scraper');
const { resolveR18DetailEndpoint } = require('../services/r18EndpointSelector');
const { io } = require('socket.io-client');

// Helper to convert image_full URL to jp variant
function toJpImageUrl(url) {
  return url ? url.replace(/(\/digital\/video\/[^/]+\/)([^/]+)-(\d+\.jpg)/, '$1$2jp-$3') : '';
}

const SOCKET_SERVER_URL = process.env.SOCKET_SERVER_URL || 'http://localhost:5000';

let socket;
let isSocketConnected = false;

// Initialize socket connection with better error handling
function initializeSocket() {
  try {
    socket = io(SOCKET_SERVER_URL, {
      timeout: 5000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    console.log('Worker attempting to connect to Socket.IO server at:', SOCKET_SERVER_URL);

    socket.on('connect', () => {
      console.log('✅ Worker connected to Socket.IO server.');
      isSocketConnected = true;
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Worker disconnected from Socket.IO server. Reason:', reason);
      isSocketConnected = false;
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      isSocketConnected = false;
    });

    return socket;
  } catch (error) {
    console.error('Failed to initialize socket:', error.message);
    return null;
  }
}

// Safe socket emit function
function safeSocketEmit(event, data) {
  try {
    if (socket && isSocketConnected) {
      socket.emit(event, data);
      console.log(`📡 Emitted ${event} for ${data.video_code}`);
    } else {
      console.warn(`⚠️ Socket not connected, skipping ${event} emit for ${data.video_code}`);
    }
  } catch (error) {
    console.error(`Failed to emit ${event}:`, error.message);
  }
}

// Initialize socket
initializeSocket();

// Ensure MongoDB connection for worker with better error handling
async function connectToMongoDB() {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('✅ MongoDB connected for worker.');
    } else {
      console.log('✅ MongoDB already connected.');
    }
  } catch (err) {
    console.error('❌ MongoDB connection error for worker:', err.message);
    process.exit(1);
  }
}

// Connect to MongoDB
connectToMongoDB();

const worker = new Worker(
  'scrapeQueue',
  async (job) => {
    const { video_code } = job.data;

    // --- Standardize Code Formats ---
    const dashedCode = String(video_code || '').toUpperCase();

    console.log(`🔄 Processing job ${job.id} for video code: ${dashedCode}`);
    
    let video = await Video.findOne({ video_code: dashedCode });
    if (!video) {
        const error = `Video with code ${dashedCode} not found in database for job ${job.id}`;
        console.error(`❌ ${error}`);
        throw new Error(error);
    }

    try {
      console.log(`📝 Updating status to 'processing' for ${dashedCode}`);
      video.status = 'processing';
      video.failure_reason = undefined;
      await video.save();
      safeSocketEmit('status-update', { video_code: dashedCode, status: 'processing' });

      // Branch: FC2 (123AV) vs standard r18 flow
      const fc2 = normalizeCode(dashedCode);
      if (fc2) {
        console.log(`🎯 Detected FC2 code. Fetching from 123AV for ${fc2.display}...`);
        const details = await getFC2DetailsFrom123AV(fc2.display);

        // Map details to Video document
        video.video_code = details.video_code || fc2.display;
        video.title_en = details.title_en;
        video.poster_url = details.poster_url;
        video.thumbnail_url = details.thumbnail_url || details.poster_url;
        video.sample_video_url = details.sample_video_url;
        video.video_url = details.video_url; // already proxied in service
        video.actresses = Array.isArray(details.actresses) ? details.actresses : [];
        video.categories = Array.isArray(details.categories) ? details.categories : [];
        video.directors = Array.isArray(details.directors) ? details.directors : [];
        video.galleries = Array.isArray(details.galleries) ? details.galleries : [];
        video.maker_en = details.maker_en;
        video.label_en = details.label_en;
        video.series = details.series || null;
        video.release_date = details.release_date;
        video.runtime_mins = details.runtime_mins;
        
        if (details.video_url) {
          video.status = 'completed';
          video.failure_reason = undefined;
          console.log(`✅ FC2 processing completed for ${dashedCode}`);
        } else {
          video.status = 'failed';
          video.failure_reason = details.failure_reason || 'Stream not found';
          console.log(`❌ FC2 processing failed for ${dashedCode}: ${video.failure_reason}`);
        }
      } else {
        // Standard r18.dev + memojav flow with 123av fallback
        let metaUrl;
        let meta;
        let useR18Data = true;
        
        try {
          console.log(`🔍 Resolving r18.dev endpoint for ${video_code}...`);
          metaUrl = await resolveR18DetailEndpoint(video_code);
          console.log(`📡 Fetching metadata from: ${metaUrl}`);
          const metaRes = await axios.get(metaUrl, { timeout: 15000 });
          if (!metaRes.data || metaRes.data.result === 'not found') {
            throw new Error('Invalid Code: Metadata not found on r18.dev');
          }
          meta = metaRes.data;
          console.log(`✅ Successfully fetched metadata from r18.dev for ${dashedCode}`);
        } catch (err) {
          console.log(`⚠️ r18.dev failed for ${dashedCode}: ${err.message}. Trying 123av fallback...`);
          useR18Data = false;
          
          try {
            // Fallback to 123av for metadata and stream
            console.log(`🔄 Attempting 123av fallback for ${dashedCode}...`);
            const details = await getNormalVideoDetailsFrom123AV(dashedCode);
            
            // Map details to Video document (123av format)
            video.video_code = details.dvd_id || dashedCode;
            video.title_en = details.title_en;
            video.poster_url = details.jacket_full_url;
            video.thumbnail_url = details.jacket_thumb_url || details.jacket_full_url;
            video.sample_video_url = details.sample_video_url;
            video.video_url = details.video_url; // already proxied in service
            video.actresses = Array.isArray(details.actresses) ? details.actresses : [];
            video.categories = Array.isArray(details.categories) ? details.categories : [];
            video.directors = Array.isArray(details.directors) ? details.directors : [];
            video.galleries = Array.isArray(details.gallery) ? details.gallery : [];
            video.maker_en = details.maker_name_en;
            video.label_en = details.label_name_en;
            video.series = details.series || null;
            video.release_date = details.release_date;
            video.runtime_mins = details.runtime_mins;
            
            if (details.video_url) {
              video.status = 'completed';
              video.failure_reason = undefined;
              console.log(`✅ 123av fallback completed for ${dashedCode}`);
            } else {
              video.status = 'failed';
              video.failure_reason = details.failure_reason || 'Stream not found';
              console.log(`❌ 123av fallback failed for ${dashedCode}: ${video.failure_reason}`);
            }
          } catch (fallbackErr) {
            console.error(`❌ 123av fallback also failed for ${dashedCode}: ${fallbackErr.message}`);
            video.status = 'failed';
            video.failure_reason = `Both r18.dev and 123av failed: ${err.message}`;
            await video.save();
            safeSocketEmit('job-failed', { video_code: dashedCode, reason: video.failure_reason });
            throw fallbackErr;
          }
        }

        // If r18.dev succeeded, process normally
        if (useR18Data) {
          console.log(`🎬 Scraping stream link for ${dashedCode}...`);
          const m3u8 = await scraper.getM3U8(dashedCode);
          if (!m3u8) {
            throw new Error('Stream not found on any provider.');
          }
          console.log(`✅ Found stream for ${dashedCode}`);

          console.log(`📋 Mapping data and finalizing for ${dashedCode}...`);
          video.video_code = meta.dvd_id;
          video.title_en = meta.title_en;
          video.poster_url = meta.jacket_full_url;
          video.thumbnail_url = meta.jacket_thumb_url;
          video.sample_video_url = meta.sample_url;
          const proxyPrefix = process.env.CF_PROXY_URL || 'https://your-cf-worker.example.com/v2?url=';
          video.video_url = `${proxyPrefix}${encodeURIComponent(m3u8)}`;
          
          if (meta.actresses && Array.isArray(meta.actresses)) {
            video.actresses = meta.actresses.map(a => ({
              id: a.id,
              name_romaji: a.name_romaji,
              image_url: a.image_url
                ? (a.image_url.startsWith('http') ? a.image_url : `https://awsimgsrc.dmm.com/dig/mono/actjpgs/${a.image_url}`)
                : ''
            }));
          } else {
            video.actresses = [];
          }
          
          video.categories = meta.categories || [];
          video.directors = meta.directors || [];
          
          if (meta.gallery && Array.isArray(meta.gallery)) {
            video.galleries = meta.gallery.map(g => ({
              image_full: g.image_full ? toJpImageUrl(g.image_full) : '',
              image_thumb: g.image_thumb || g.thumb || ''
            }));
          } else {
            video.galleries = [];
          }
          
          video.maker_en = meta.maker_name_en;
          video.label_en = meta.label_name_en;
          video.series = meta.series || null;
          video.release_date = meta.release_date;
          video.runtime_mins = meta.runtime_mins;
          video.status = 'completed';
          video.failure_reason = undefined;
          console.log(`✅ r18.dev processing completed for ${dashedCode}`);
        }
      }
      
      await video.save();
      console.log(`🎉 Job completed successfully for ${dashedCode}`);
      safeSocketEmit('job-completed', { video_code: dashedCode, video });

    } catch (err) {
      console.error(`💥 Error processing job for ${dashedCode}:`, err.message);
      console.error('Stack trace:', err.stack);
      
      video.status = 'failed';
      video.failure_reason = err.message || 'Unknown error';
      await video.save();
      safeSocketEmit('job-failed', { video_code: dashedCode, reason: video.failure_reason });
      throw err;
    }
  },
  {
    connection: redis,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  }
);

worker.on('failed', (job, err) => {
  console.error(`💥 Job ${job.id} for ${job.data.video_code} has failed after all retries:`);
  console.error(`Error: ${err.message}`);
  console.error(`Stack: ${err.stack}`);
});

worker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} for ${job.data.video_code} completed successfully`);
});

worker.on('active', (job) => {
  console.log(`🔄 Job ${job.id} for ${job.data.video_code} started processing`);
});

worker.on('stalled', (jobId) => {
  console.warn(`⚠️ Job ${jobId} stalled and will be retried`);
});

worker.on('error', (err) => {
  console.error('Worker error:', err);
});

console.log('🚀 Scrape worker is running and waiting for jobs...');
console.log(`📊 Worker configuration:
- Max attempts: 3
- Backoff delay: 5000ms (exponential)
- MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Not connected'}
- Redis: Connected
- Socket.IO: ${isSocketConnected ? '✅ Connected' : '⚠️ Connecting...'}
`);
