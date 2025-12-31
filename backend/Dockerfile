# ใช้ Node LTS แบบเบา ๆ
FROM node:20-alpine

# ติดตั้ง Python, pip, และ wget สำหรับรัน Python scripts และ health check
RUN apk add --no-cache python3 py3-pip wget

# ตั้ง working directory ใน container
WORKDIR /usr/src/app

# ก็อปไฟล์ package ก่อน (เพื่อ cache layer install dependencies)
COPY package*.json ./

# ติดตั้ง dependencies แบบ production (ตัด devDependencies ทิ้ง)
# ใช้ npm install แทน npm ci เพื่อรองรับกรณีที่ package-lock.json ไม่ sync
RUN npm install --omit=dev --prefer-offline --no-audit

# ก็อป source code ทั้งหมดเข้าไป
COPY . .

# ตรวจสอบว่า dist folder มีอยู่ (frontend build)
# ถ้าไม่มี dist folder จะแสดง warning และสร้าง empty directory
RUN if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then \
      echo "⚠️  WARNING: dist folder not found or empty. Frontend must be built before Docker build."; \
      echo "   Please run: cd ../frontend && npm run build && cp -r dist ../backend/"; \
      echo "   Creating empty dist directory as fallback..."; \
      mkdir -p dist; \
      echo "<!DOCTYPE html><html><head><title>Frontend Not Built</title></head><body><h1>Frontend not built. Please build frontend and copy dist folder to backend.</h1></body></html>" > dist/index.html; \
    else \
      echo "✅ Found dist folder with content"; \
      ls -la dist/ | head -5; \
    fi

# สร้าง directory สำหรับ ai-keys.json ถ้ายังไม่มี (ถ้าไม่มีจะสร้างอัตโนมัติ)
RUN mkdir -p /usr/src/app/src

# Environment variables
ENV NODE_ENV=production
ENV PORT=7183
ENV HOST=0.0.0.0

# Environment variables สำหรับ database (ควรตั้งค่าผ่าน docker-compose.yml หรือ .env)
# ไม่ใส่ sensitive data (เช่น password) ใน Dockerfile เพื่อความปลอดภัย
ENV DB_HOST=localhost
ENV DB_PORT=5432
ENV DB_USER=postgres
# DB_PASSWORD และ DB_NAME ควรตั้งค่าผ่าน docker-compose.yml หรือ environment variables
ENV DB_NAME=interview_db

# Environment variable สำหรับ demo API (FastAPI service - รันแยก container)
ENV DEMO_API_URL=http://localhost:8000

# Port ที่แอปเราฟังอยู่
EXPOSE 7183

# Health check - ตรวจสอบว่า server ยังทำงานอยู่
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/api/ai-keys || exit 1

# คำสั่งรันแอป
CMD ["node", "./src/server.js"]

