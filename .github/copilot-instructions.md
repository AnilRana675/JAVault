# Building JAVault: A Full-Stack MERN Scraper Application Guide

This guide will walk you through building "JAVault," a complete MERN stack application. The user will be able to search for a video code, and the backend will fetch the video's metadata from the `r18.dev` API and its protected stream link from `memojav.com`. We will then use a Cloudflare Worker to proxy the video stream, allowing it to be played directly in the browser.

## Core Architecture (Professional & Asynchronous)

Our application will consist of six main parts:

1.  **React Frontend:** A user interface where you can enter a video code to search. It will use a library like **HLS.js** to play the proxied video stream and **Socket.IO** to receive real-time updates from the backend.

2.  **Node.js/Express Backend (API Server):** An API server that handles user requests. Its main job is to add new tasks to the job queue and communicate with the database. It **does not** perform the slow scraping work itself.

3.  **Background Job Queue (BullMQ with Redis):** A robust and high-performance job queue system built on Redis. When a user requests a new video, a "scrape job" is added to this queue, preventing API timeouts and ensuring reliability.

4.  **Node.js Worker:** A separate process that constantly watches the Redis queue. When a new job appears, the worker executes the slow scraping logic (launching Puppeteer, etc.).

5.  **MongoDB Database:** A database to permanently store the scraped video metadata, the `.m3u8` stream link, and the current status of each video (`queued`, `processing`, `completed`, `failed`).

6.  **Cloudflare Worker Proxy:** A small, serverless script that acts as a middleman to bypass the video host's CORS restrictions, making the stream playable on our website.

## Data Sources

* **Metadata Source:** `https://r18.dev/` - A public API for video details. This is fast and reliable. The endpoint format is `https://r18.dev/videos/vod/movies/detail/-/combined={video_code}/json`.

* **Video Stream Source:** `https://memojav.com/` - A website we will scrape using Puppeteer to find the `.m3u8` link.

## Complete Project Structure

Here is a recommended file and directory structure for your project. This monorepo setup keeps the frontend and backend code separate but within the same parent directory.

```
JAVault/
├── backend/
│   ├── config/
│   │   └── db.js             # Handles MongoDB & Redis connections
│   ├── models/
│   │   └── Video.js          # Mongoose schema for video data
│   ├── queue/
│   │   ├── scrapeQueue.js    # BullMQ queue definition and job adding logic
│   │   └── scrapeWorker.js   # The background worker process logic
│   ├── routes/
│   │   └── api.js            # Express routes for /videos and /scrape
│   ├── services/
│   │   └── scraper.js        # The core Puppeteer scraping functions
│   ├── .env                  # Environment variables (DB strings, secrets)
│   ├── package.json
│   └── server.js             # Main Express server file, sets up Socket.IO
│
└── frontend/
    ├── public/
    ├── src/
    │   ├── components/
    │   │   ├── SearchBar.jsx
    │   │   ├── VideoGallery.jsx
    │   │   ├── VideoCard.jsx
    │   │   └── VideoPlayer.jsx
    │   ├── hooks/
    │   │   └── useSocket.js      # Custom hook for managing Socket.IO connection
    │   ├── services/
    │   │   └── api.js            # Functions for making axios calls to the backend
    │   ├── App.jsx
    │   ├── index.css
    │   └── main.jsx
    ├── .env
    ├── index.html
    └── package.json
```

## Step-by-Step Implementation Plan

#### 1. Backend Setup (Node.js, Express, MongoDB, Redis)

* **Initialize a Node.js project:**

    ```bash
    mkdir mern-scraper-backend
    cd mern-scraper-backend
    npm init -y
    # Install libraries for the API, database, job queue, and scraping
    npm install express mongoose puppeteer cors axios socket.io bullmq ioredis dotenv
    ```

    *(Note: We've added `dotenv` for environment variable management).*

* **Use Environment Variables:** Create a `.env` file in your backend's root directory to store all your secret keys and configuration. **Do not** commit this file to Git.

    ```
    # .env file
    MONGO_URI="your_mongodb_connection_string"
    REDIS_URL="your_redis_connection_string"
    R18_API_ENDPOINT="[https://r18.dev/videos/vod/movies/detail/-/combined=](https://r18.dev/videos/vod/movies/detail/-/combined=)"
    ```

* **Connect to MongoDB and Redis.**

* **Create an Enhanced Video Schema:** The schema is now tailored to fully utilize the `r18.dev` JSON structure.

    ```javascript
    // models/Video.js
    const mongoose = require('mongoose');
    
    const gallerySchema = new mongoose.Schema({
        image_full: String,
        image_thumb: String,
    });
    
    const videoSchema = new mongoose.Schema({
        video_code: { type: String, unique: true, required: true }, // From dvd_id
        title_en: String,
        poster_url: String, // From jacket_full_url
        thumbnail_url: String, // From jacket_thumb_url
        sample_video_url: String, // From sample_url
        video_url: String, // The .m3u8 stream link
        actresses: [{ id: Number, name_romaji: String }],
        categories: [{ id: Number, name_en: String }], // Renamed from genres
        directors: [{ id: Number, name_romaji: String }],
        galleries: [gallerySchema],
        maker_en: String,
        label_en: String,
        series_en: String,
        release_date: String,
        runtime_mins: Number,
        status: { 
            type: String, 
            enum: ['queued', 'processing', 'completed', 'failed'], 
            default: 'queued' 
        },
        failure_reason: String, // To store error messages
    });
    
    module.exports = mongoose.model('Video', videoSchema);
    ```

* **Create the API Endpoints:**

    * `GET /api/videos`: Fetches all saved videos from the database.

    * `POST /api/scrape`: **This endpoint is now very fast and includes concurrency control.** It receives a video code, checks if a job for this code is already `queued` or `processing`, and if not, it adds a new job to the BullMQ queue.

#### 2. The Background Worker Logic

This is a separate Node.js script (`queue/scrapeWorker.js`) that you will run alongside your API server.

1.  **Configure the Queue for Retries:** When setting up your BullMQ worker, configure it to automatically retry failed jobs. This handles temporary network errors or site outages.

    ```javascript
    // Example worker setup
    const worker = new Worker('scrapeQueue', async job => {
      // ... scraping logic ...
    }, { 
        connection: redisConnection,
        attempts: 3, // Try the job up to 3 times
        backoff: { // Wait longer between each attempt
            type: 'exponential',
            delay: 5000, // 5 seconds delay for the first retry
        }
    });
    ```

2.  **Process a Job:** When a job is received from the queue, it will:

    * Update the video's status in MongoDB to `"processing"` and notify the frontend via WebSocket.

    * **Validation Step & Metadata Fetch:** The worker's **first action** is to call the `r18.dev` API (e.g., `.../combined=pppe356/json`). If it returns a "not found" error, the worker will immediately update the job status to `"failed"` with a reason of "Invalid Code" and stop. Otherwise, it will parse the rich JSON response.

    * If valid, it proceeds to launch Puppeteer to get the video stream from `memojav.com`.

    * **Optimization:** For better performance, the worker can maintain a pool of running Puppeteer browser instances to avoid the slow startup time on every job.

3.  **Finalize the Job:**

    * If successful, it combines the data (mapping fields like `dvd_id` to `video_code`, `categories` to `genres`, `jacket_full_url` to `poster_url`, etc.), updates the MongoDB record with the details and a status of `"completed"`.

    * If it fails after all retries, it updates the status to `"failed"` with a specific error message.

    * Finally, it uses **Socket.IO** to push a real-time notification (`job-completed` or `job-failed`) to the frontend with the final data.

#### 3. Frontend Setup (React, HLS.js, Socket.IO)

The frontend is now built to be interactive and responsive to real-time events.

* **Initialize a React project** and install `axios`, `hls.js`, and `socket.io-client`.

* **Connect to WebSocket:** When the app loads, it establishes a connection to the backend's Socket.IO server.

* **Create Components:**

    * `SearchBar`: When a user searches, it calls `POST /api/scrape`.

    * `VideoGallery`: It fetches the initial list of videos. It also **listens for WebSocket events**. When it receives a `job-completed` or `status-update` event, it updates the state of the specific video in the gallery without needing a page refresh.

    * `VideoCard`: This component will now display different UI based on the video's `status`. It can show a "Queued..." message, a "Processing..." spinner, an error icon with a message for "Failed," or the video poster for "Completed."

    * `VideoPlayer`: This component remains the same, using the Cloudflare proxy to play the `.m3u8` stream.
    
    * **New `VideoDetailView` Component:** When a user clicks on a video card, they will be taken to a new view that displays all the rich data: the main video player, the sample video clip, the gallery of sample images, and all the detailed metadata like actresses, directors, and series.

### Updated Example Workflow (Asynchronous & Robust)

1.  You search for a new code, `NEW-456`.

2.  The frontend sends a `POST` request to `/api/scrape`.

3.  The Node.js backend checks MongoDB. It sees no job is currently `queued` or `processing` for this code. It adds a job to the Redis queue, creates a new record in MongoDB with `{ video_code: "NEW-4S6", status: "queued" }`, and **immediately** responds to the frontend.

4.  The frontend receives the response and adds a new card to the gallery in a "Queued" state.

5.  The background worker picks up the job from the queue and updates the status in MongoDB to `"processing"`. It then emits a WebSocket event.

6.  The frontend receives the `status-update` event and changes the card for `NEW-456` to show a "Processing..." spinner.

7.  The worker finishes scraping, gets all the data, and updates the MongoDB record to `{ status: "completed", video_url: "...", title_en: "..." }`.

8.  The worker emits a `job-completed` event with the full data.

9.  The frontend receives the final data, updates the card for `NEW-456` to show the poster image, and the video is now ready to be played.
