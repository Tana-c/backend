@echo off
REM Build script for Docker image (Windows)
REM This script builds the frontend and copies dist folder to backend before building Docker image

echo 🔨 Building Frontend...
cd ..\frontend
call npm run build

echo 📦 Copying frontend dist to backend...
xcopy /E /I /Y dist ..\backend\dist

echo 🐳 Building Docker image...
cd ..\backend
docker build -t tanac/interview:0.9.17 --push .

echo ✅ Build complete!

