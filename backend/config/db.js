// backend/config/db.js
require('dotenv').config();
const mongoose = require('mongoose');
const Redis = require('ioredis');

// MongoDB Connection
const connectMongo = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

// Redis Connection for BullMQ (must set maxRetriesPerRequest: null)
const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});
redis.on('connect', () => console.log('Redis connected'));
redis.on('error', (err) => console.error('Redis error:', err));

module.exports = {
  connectMongo,
  redis,
};
