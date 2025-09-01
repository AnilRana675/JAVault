const { resolveR18DetailEndpoint } = require('../services/r18EndpointSelector');
// Helper to convert image_full URL to jp variant
function toJpImageUrl(url) {
  return url ? url.replace(/(\/digital\/video\/[^/]+\/)([^/]+)-(\d+\.jpg)/, '$1$2jp-$3') : '';
}
// backend/queue/scrapeWorker.js
require('dotenv').config();
const { Worker } = require('bullmq');
const mongoose = require('mongoose');
const { redis } = require('../config/db'); 
const Video = require('../models/Video');
const axios = require('axios');
const scraper = require('../services/scraper');
const { getFC2Details, getFC2DetailsFrom123AV, normalizeCode, getNormalVideoDetailsFrom123AV } = require('../services/fc2Scraper');
const { io } = require('socket.io-client');

const SOCKET_SERVER_URL = process.env.SOCKET_SERVER_URL || 'http://localhost:5000';
const socket = io(SOCKET_SERVER_URL);

console.log('Worker connecting to Socket.IO server at:', SOCKET_SERVER_URL);

socket.on('connect', () => {
  console.log('Worker connected to Socket.IO server.');
});

socket.on('disconnect', () => {
  console.log('Worker disconnected from Socket.IO server.');
});

// Ensure MongoDB connection for worker
if (mongoose.connection.readyState === 0) {
  mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }).then(() => console.log('MongoDB connected for worker.'))
    .catch(err => console.error('MongoDB connection error for worker:', err));
}

const worker = new Worker(
  'scrapeQueue',
  async (job) => {
    const { video_code } = job.data;

    // --- Standardize Code Formats ---
    const dashedCode = String(video_code || '').toUpperCase();

    console.log(`Processing job for video code: ${dashedCode}`);
    let video = await Video.findOne({ video_code: dashedCode });
    if (!video) {
        console.error(`Video with code ${dashedCode} not found in database for job ${job.id}`);
        return;
    }

    try {
      video.status = 'processing';
      video.failure_reason = undefined;
      await video.save();
      socket.emit('status-update', { video_code: dashedCode, status: 'processing' });

            // Branch: FC2 (123AV) vs standard r18 flow
      const fc2 = normalizeCode(dashedCode);
      if (fc2) {
        // FC2 via 123AV for rich metadata and stream
        console.log(`Detected FC2 code. Fetching from 123AV for ${fc2.display}...`);
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
        } else {
          video.status = 'failed';
          video.failure_reason = details.failure_reason || 'Stream not found';
        }
      } else {
        // Standard r18.dev + memojav flow with 123av fallback
        let metaUrl;
        let meta;
        let useR18Data = true;
        
        try {
          metaUrl = await resolveR18DetailEndpoint(video_code);
          console.log(`Fetching metadata from: ${metaUrl}`);
          const metaRes = await axios.get(metaUrl);
          if (!metaRes.data || metaRes.data.result === 'not found') {
            throw new Error('Invalid Code: Metadata not found on r18.dev');
          }
          meta = metaRes.data;
        } catch (err) {
          console.log(`r18.dev failed for ${dashedCode}: ${err.message}. Trying 123av fallback...`);
          useR18Data = false;
          
          try {
            // Fallback to 123av for metadata and stream
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
            } else {
              video.status = 'failed';
              video.failure_reason = details.failure_reason || 'Stream not found';
            }
          } catch (fallbackErr) {
            console.error(`123av fallback also failed for ${dashedCode}: ${fallbackErr.message}`);
            video.status = 'failed';
            video.failure_reason = `Both r18.dev and 123av failed: ${err.message}`;
            await video.save();
            socket.emit('job-failed', { video_code: dashedCode, reason: video.failure_reason });
            throw fallbackErr;
          }
        }

        // If r18.dev succeeded, process normally
        if (useR18Data) {
          console.log(`Scraping stream link for ${dashedCode}...`);
          const m3u8 = await scraper.getM3U8(dashedCode);
          if (!m3u8) {
            throw new Error('Stream not found on any provider.');
          }

          console.log(`Mapping data and finalizing for ${dashedCode}...`);
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
        }
      }
      
      await video.save();
      console.log(`Job completed for ${dashedCode}.`);
      socket.emit('job-completed', { video_code: dashedCode, video });

    } catch (err) {
      console.error(`Error processing job for ${dashedCode}:`, err.message);
      video.status = 'failed';
      video.failure_reason = err.message || 'Unknown error';
      await video.save();
      socket.emit('job-failed', { video_code: dashedCode, reason: video.failure_reason });
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
  console.error(`Job ${job.id} for ${job.data.video_code} has failed after all retries:`, err.message);
});

console.log('Scrape worker is running and waiting for jobs...');
