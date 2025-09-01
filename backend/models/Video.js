// backend/models/Video.js
const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
  image_full: String,
  image_thumb: String,
});

const actressSchema = new mongoose.Schema({
  id: Number,
  name_romaji: String,
  image_url: String,
});

const videoSchema = new mongoose.Schema({
  video_code: { type: String, unique: true, required: true }, // From dvd_id
  title_en: String,
  poster_url: String, // From jacket_full_url
  thumbnail_url: String, // From jacket_thumb_url
  sample_video_url: String, // From sample_url
  video_url: String, // The .m3u8 stream link
  actresses: [actressSchema],
  categories: [{ id: Number, name_en: String }],
  directors: [{ id: Number, name_romaji: String }],
  galleries: [gallerySchema],
  maker_en: String,
  label_en: String,
  // --- IMPROVEMENT: Store the series as an object ---
  series: {
    id: Number,
    name_en: String,
  },
  release_date: String,
  runtime_mins: Number,
  status: {
    type: String,
    enum: ['queued', 'processing', 'completed', 'failed'],
    default: 'queued',
  },
  failure_reason: String, // To store error messages
  editor_choice: { type: Boolean, default: false },
});

module.exports = mongoose.model('Video', videoSchema);
