#!/bin/bash

# Script to prepare files for deployment (without git clone on server)
# Usage: ./prepare-deploy.sh [VITE_API_URL]
# Example: ./prepare-deploy.sh http://72.61.120.205:8000

set -e

VITE_API_URL=${1:-"http://72.61.120.205:8000"}

echo "📦 Preparing deployment package..."
echo "VITE_API_URL: $VITE_API_URL"
echo ""

# Create deploy directory
DEPLOY_DIR="deploy-package"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR/database"
mkdir -p "$DEPLOY_DIR/config"

echo "🔨 Building Docker images..."
# Build images
./build-and-save-images.sh "$VITE_API_URL"

echo ""
echo "📋 Copying files..."

# Copy docker-compose file
cp docker-compose.images.yml "$DEPLOY_DIR/"

# Copy database
if [ -f "database_generate/interview_data.db" ]; then
    cp database_generate/interview_data.db "$DEPLOY_DIR/database/"
    echo "✅ Database copied"
else
    echo "⚠️  Warning: database_generate/interview_data.db not found!"
fi

# Copy images
cp ai-interviewer-*.tar.gz "$DEPLOY_DIR/" 2>/dev/null || {
    echo "⚠️  Warning: Image tar files not found. Run build-and-save-images.sh first"
}

# Create .env template
cat > "$DEPLOY_DIR/config/.env.example" << EOF
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o
OPENAI_TEMPERATURE=0.1
EOF

# Create README for deployment
cat > "$DEPLOY_DIR/README.md" << 'EOF'
# Deployment Package

## Files included:
- ai-interviewer-backend.tar.gz - Backend Docker image
- ai-interviewer-frontend.tar.gz - Frontend Docker image
- docker-compose.images.yml - Docker Compose configuration
- database/interview_data.db - Database file
- config/.env.example - Environment variables template

## Deployment Steps:

### 1. Upload files to server

```bash
scp -r deploy-package/* root@72.61.120.205:/opt/ai-interviewer/
```

### 2. On server:

```bash
cd /opt/ai-interviewer

# Load Docker images
docker load < ai-interviewer-backend.tar.gz
docker load < ai-interviewer-frontend.tar.gz

# Setup database directory
mkdir -p database
mv database/interview_data.db database/  # if needed

# Create .env file
cp config/.env.example .env
nano .env  # Edit with your OPENAI_API_KEY

# Run containers
docker-compose -f docker-compose.images.yml up -d

# Check status
docker-compose -f docker-compose.images.yml ps
docker-compose -f docker-compose.images.yml logs -f
```

### 3. Access application:

- Frontend: http://72.61.120.205
- Backend API: http://72.61.120.205:8000
- API Docs: http://72.61.120.205:8000/docs
EOF

echo ""
echo "✅ Deployment package prepared in: $DEPLOY_DIR/"
echo ""
echo "Package contents:"
ls -lh "$DEPLOY_DIR/"
echo ""
echo "Next step:"
echo "  scp -r $DEPLOY_DIR/* root@72.61.120.205:/opt/ai-interviewer/"

