// backend/queue/scrapeQueue.js
const { Queue } = require('bullmq');
const { redis } = require('../config/db');

// Define the BullMQ queue
const scrapeQueue = new Queue('scrapeQueue', {
  connection: redis,
});

// Function to add a new scrape job
async function addScrapeJob(video_code) {
  await scrapeQueue.add('scrape', { video_code }, {
    removeOnComplete: true,
    removeOnFail: false,
  });
}

module.exports = {
  scrapeQueue,
  addScrapeJob,
};
