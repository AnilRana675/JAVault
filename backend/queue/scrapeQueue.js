// backend/queue/scrapeQueue.js
const { Queue } = require('bullmq');
const { redis } = require('../config/db');

// Define the BullMQ queue
const scrapeQueue = new Queue('scrapeQueue', {
  connection: redis,
});

// Function to add a new scrape job
async function addScrapeJob(video_code) {
  console.log(`📋 Adding scrape job for video code: ${video_code}`);
  const job = await scrapeQueue.add('scrapeJob', { video_code }, {
    removeOnComplete: 5, // Keep 5 completed jobs
    removeOnFail: 10,    // Keep 10 failed jobs for debugging
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  });
  console.log(`✅ Job ${job.id} added to queue for ${video_code}`);
  return job;
}

module.exports = {
  scrapeQueue,
  addScrapeJob,
};
