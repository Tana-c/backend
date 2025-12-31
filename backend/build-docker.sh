#!/bin/bash
# Build script for Docker image
# This script builds the frontend and copies dist folder to backend before building Docker image

set -e

echo "🔨 Building Frontend..."
cd ../frontend
npm run build

echo "📦 Copying frontend dist to backend..."
cp -r dist ../backend/

echo "🐳 Building Docker image..."
cd ../backend
docker build -t tanac/interview:0.9.17 --push .

echo "✅ Build complete!"

