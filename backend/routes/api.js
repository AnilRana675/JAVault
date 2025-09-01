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

// POST /api/scrape - Add a new scrape job
router.post('/scrape', async (req, res) => {
  const { video_code } = req.body;
  if (!video_code) return res.status(400).json({ error: 'video_code is required' });

  try {
    // Check if a job for this code is already queued or processing
    let video = await Video.findOne({ video_code });
    if (video && ['queued', 'processing'].includes(video.status)) {
      return res.status(200).json({ message: 'Job already queued or processing', video });
    }
    // If not, add a new job to the queue
    if (!video) {
      video = await Video.create({ video_code });
    } else {
      video.status = 'queued';
      video.failure_reason = undefined;
      await video.save();
    }
    await addScrapeJob(video_code);
    res.status(202).json({ message: 'Job queued', video });
  } catch (err) {
    res.status(500).json({ error: 'Failed to queue job' });
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

module.exports = router;
