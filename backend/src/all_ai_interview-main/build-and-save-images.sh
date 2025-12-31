#!/bin/bash

# Script to build Docker images and save them as tar files
# Usage: ./build-and-save-images.sh [VITE_API_URL]
# Example: ./build-and-save-images.sh http://72.61.120.205:8000

set -e

VITE_API_URL=${1:-"http://72.61.120.205:8000"}

echo "🔨 Building Docker images..."
echo "VITE_API_URL: $VITE_API_URL"
echo ""

# Build backend image
echo "📦 Building backend image..."
docker build -f database_generate/Dockerfile.prod -t ai-interviewer-backend:latest database_generate/
echo "✅ Backend image built"
echo ""

# Build frontend image
echo "📦 Building frontend image..."
docker build \
    --build-arg VITE_API_URL="$VITE_API_URL" \
    -f dashboard/frontend/Dockerfile.prod \
    -t ai-interviewer-frontend:latest \
    dashboard/frontend/
echo "✅ Frontend image built"
echo ""

# Save images as tar files
echo "💾 Saving images to tar files..."
docker save ai-interviewer-backend:latest | gzip > ai-interviewer-backend.tar.gz
docker save ai-interviewer-frontend:latest | gzip > ai-interviewer-frontend.tar.gz

echo ""
echo "✅ Images saved successfully!"
echo ""
echo "Files created:"
echo "  - ai-interviewer-backend.tar.gz"
echo "  - ai-interviewer-frontend.tar.gz"
echo ""
echo "Next steps:"
echo "  1. Upload these files to your server:"
echo "     scp ai-interviewer-*.tar.gz root@72.61.120.205:/tmp/"
echo ""
echo "  2. On server, load images:"
echo "     docker load < /tmp/ai-interviewer-backend.tar.gz"
echo "     docker load < /tmp/ai-interviewer-frontend.tar.gz"
echo ""
echo "  3. Copy docker-compose.images.yml and .env to server"
echo "  4. Copy database file: database_generate/interview_data.db"
echo "  5. Run: docker-compose -f docker-compose.images.yml up -d"

