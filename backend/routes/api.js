// backend/routes/api.js
const express = require('express');
const router = express.Router();
const Video = require('../models/Video');
const { addScrapeJob } = require('../queue/scrapeQueue');

// GET /api/videos - Fetch all saved videos
router.get('/videos', async (req, res) => {
  try {
    const videos = await Video.find().sort({ release_date: -1 });
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// PATCH /api/videos/:code - Update video data (for Cloudflare Worker)
router.patch('/videos/:code', async (req, res) => {
  const { code } = req.params;
  const updateData = req.body;
  
  try {
    const video = await Video.findOneAndUpdate(
      { video_code: code }, 
      updateData, 
      { new: true, upsert: true }
    );
    res.json({ success: true, video });
  } catch (err) {
    console.error('Error updating video:', err);
    res.status(500).json({ error: 'Failed to update video' });
  }
});

// POST /api/scrape - Queue video for processing
router.post('/scrape', async (req, res) => {
  try {
    const { video_code } = req.body;
    
    if (!video_code) {
      return res.status(400).json({ error: 'Video code is required' });
    }

    const normalizedCode = video_code.trim().toUpperCase();

    // Check if video already exists or is being processed
    let video = await Video.findOne({ video_code: normalizedCode });
    
    if (video) {
      if (video.status === 'queued' || video.status === 'processing') {
        return res.json({ 
          message: 'Video is already being processed',
          video_code: normalizedCode,
          status: video.status
        });
      }
      
      if (video.status === 'completed') {
        return res.json({
          message: 'Video already exists',
          video_code: normalizedCode,
          status: video.status,
          video: video
        });
      }
    }

    // Create or update video record with queued status
    video = await Video.findOneAndUpdate(
      { video_code: normalizedCode },
      { 
        video_code: normalizedCode,
        status: 'queued',
        failure_reason: undefined,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    // Try to delegate to Cloudflare Worker first
    let workerSuccess = false;
    const cloudflareWorkerUrl = process.env.WORKER_URL || 'https://javault.tuchiha675.workers.dev';
    
    try {
      console.log(`Delegating ${normalizedCode} to Cloudflare Worker: ${cloudflareWorkerUrl}`);
      
      const workerResponse = await fetch(`${cloudflareWorkerUrl}/process-job`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          video_code: normalizedCode,
          backend_url: process.env.NODE_ENV === 'production' 
            ? 'https://javault.onrender.com' 
            : 'http://localhost:5000'
        })
      });
      
      if (workerResponse.ok) {
        workerSuccess = true;
        console.log(`✅ Job delegated to Cloudflare Worker for ${normalizedCode}`);
      } else {
        const errorText = await workerResponse.text();
        console.error(`❌ Cloudflare Worker failed: ${workerResponse.status} - ${errorText}`);
      }
    } catch (workerError) {
      console.error('❌ Failed to delegate to Cloudflare Worker:', workerError.message);
    }

    // Fallback to local BullMQ queue if worker fails
    if (!workerSuccess) {
      try {
        const { addScrapeJob } = require('../queue/scrapeQueue');
        await addScrapeJob(normalizedCode);
        console.log(`📝 Job added to local BullMQ queue for ${normalizedCode}`);
      } catch (queueError) {
        console.error('❌ Failed to add job to local queue:', queueError);
        // Update video status to failed if both worker and queue fail
        video.status = 'failed';
        video.failure_reason = 'Failed to queue job for processing';
        await video.save();
        return res.status(500).json({ error: 'Failed to queue job for processing' });
      }
    }

    // Emit real-time update
    if (req.io) {
      req.io.emit('video-queued', { 
        video_code: normalizedCode,
        status: 'queued'
      });
    }

    res.json({
      message: 'Video queued for processing',
      video_code: normalizedCode,
      status: 'queued',
      processor: workerSuccess ? 'cloudflare-worker' : 'local-queue'
    });

  } catch (error) {
    console.error('Scrape endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const { authAdmin } = require('../middleware/auth');

// PATCH /api/videos/:code/editor-choice - toggle editor choice (admin only)
router.patch('/videos/:code/editor-choice', authAdmin, async (req, res) => {
  const { code } = req.params;
  const { value } = req.body || {};
  if (typeof value !== 'boolean') return res.status(400).json({ error: 'value must be boolean' });
  try {
    const video = await Video.findOneAndUpdate({ video_code: code }, { editor_choice: value }, { new: true });
    if (!video) return res.status(404).json({ error: 'Video not found' });
    res.json({ success: true, video });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update editor choice' });
  }
});

const { getFC2Details, getFC2DetailsFrom123AV } = require('../services/fc2Scraper');

// GET /api/fc2/:code - scrape FC2PPV details from 123AV (no DB write)
router.get('/fc2/:code', async (req, res) => {
  try {
    const details = await getFC2DetailsFrom123AV(req.params.code);
    res.json(details);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to fetch FC2 details' });
  }
});

// GET /api/fc2-123av/:code - scrape FC2PPV details from 123AV (no DB write)
router.get('/fc2-123av/:code', async (req, res) => {
  try {
    const details = await getFC2DetailsFrom123AV(req.params.code);
    res.json(details);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to fetch FC2 details from 123AV' });
  }
});

// DELETE /api/videos/:code - Delete a video (admin only)
router.delete('/videos/:code', authAdmin, async (req, res) => {
  const { code } = req.params;
  try {
    const video = await Video.findOneAndDelete({ video_code: code });
    if (!video) return res.status(404).json({ error: 'Video not found' });
    res.json({ success: true, deleted: { video_code: video.video_code, id: video._id } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

// Internal API endpoints for Cloudflare Worker communication

// Middleware to authenticate internal requests
const authenticateInternal = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  const apiKey = req.headers['x-api-key'];
  
  // Accept either Bearer token or X-API-Key header
  if (token === process.env.JWT_SECRET || apiKey === process.env.JWT_SECRET) {
    next();
  } else {
    console.warn('Unauthorized internal request attempt');
    res.status(401).json({ error: 'Unauthorized internal request' });
  }
};

// POST /api/internal/update-status - Update video status from Cloudflare Worker
router.post('/internal/update-status', authenticateInternal, async (req, res) => {
  try {
    const { video_code, status, data, failure_reason } = req.body;
    
    console.log(`🔄 Internal status update for ${video_code}: ${status}`);
    
    const updateData = { 
      status,
      updatedAt: new Date()
    };
    
    // If data is provided, merge it with the update
    if (data && typeof data === 'object') {
      Object.assign(updateData, data);
    }
    
    if (failure_reason) {
      updateData.failure_reason = failure_reason;
    }
    
    const video = await Video.findOneAndUpdate(
      { video_code },
      updateData,
      { new: true, upsert: true }
    );
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    // Emit real-time update via Socket.IO
    if (req.io) {
      req.io.emit('video-updated', {
        video_code,
        status,
        video: status === 'completed' ? video : undefined,
        failure_reason
      });
    }
    
    console.log(`✅ Status updated for ${video_code}: ${status}`);
    res.json({ success: true, video });
    
  } catch (error) {
    console.error('❌ Update status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/internal/scrape-fc2 - Scrape FC2 video details (for worker fallback)
router.post('/internal/scrape-fc2', authenticateInternal, async (req, res) => {
  try {
    const { fc2_id, video_code } = req.body;
    
    console.log(`🔍 Internal FC2 scraping for: ${video_code || fc2_id}`);
    
    // Import FC2 scraper
    const { getFC2DetailsFrom123AV } = require('../services/fc2Scraper');
    const result = await getFC2DetailsFrom123AV(video_code || `FC2-PPV-${fc2_id}`);
    
    res.json(result);
  } catch (error) {
    console.error(`❌ Internal FC2 scraping error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/internal/scrape-stream - Get video stream URL (for worker fallback)
router.post('/internal/scrape-stream', authenticateInternal, async (req, res) => {
  try {
    const { video_code } = req.body;
    
    console.log(`🎥 Internal stream scraping for: ${video_code}`);
    
    // Import scraper dynamically to avoid loading Puppeteer if not needed
    const { getM3U8 } = require('../services/scraper');
    const stream = await getM3U8(video_code);
    
    const proxyPrefix = process.env.CF_PROXY_URL || 'https://javault.tuchiha675.workers.dev/v2?url=';
    const video_url = stream ? `${proxyPrefix}${encodeURIComponent(stream)}` : null;
    
    res.json({ 
      video_url, 
      raw_stream: stream,
      proxy_prefix: proxyPrefix
    });
  } catch (error) {
    console.error(`❌ Internal stream scraping error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/internal/scrape-123av - Scrape video from 123av (for worker fallback)
router.post('/internal/scrape-123av', authenticateInternal, async (req, res) => {
  try {
    const { video_code } = req.body;
    
    console.log(`🔍 Internal 123av scraping for: ${video_code}`);
    
    const { getNormalVideoDetailsFrom123AV } = require('../services/fc2Scraper');
    const result = await getNormalVideoDetailsFrom123AV(video_code);
    
    res.json(result);
  } catch (error) {
    console.error(`❌ Internal 123av scraping error:`, error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
