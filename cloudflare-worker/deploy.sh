#!/bin/bash

# JAVault Cloudflare Worker Deployment Script

echo "🚀 Deploying JAVault Scraper to Cloudflare Workers..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Check if logged in
if ! wrangler whoami &> /dev/null; then
    echo "🔐 Please login to Cloudflare..."
    wrangler login
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Set secrets if not already set
echo "🔑 Setting up secrets..."
echo "Please enter your Internal API Key (same as JWT_SECRET from backend):"
read -s INTERNAL_API_KEY
echo $INTERNAL_API_KEY | wrangler secret put INTERNAL_API_KEY --env production

echo "Please enter your Backend URL (e.g., https://javault.onrender.com):"
read BACKEND_URL
echo $BACKEND_URL | wrangler secret put BACKEND_URL --env production

# Deploy to production
echo "🌐 Deploying to production..."
wrangler deploy --env production

echo "✅ Deployment complete!"
echo "🔗 Worker URL: https://javault.tuchiha675.workers.dev"
echo "🩺 Health Check: https://javault.tuchiha675.workers.dev/health"

# Test the deployment
echo "🧪 Testing deployment..."
curl -s https://javault.tuchiha675.workers.dev/health | jq .

echo "🎉 JAVault Cloudflare Worker is now live!"
