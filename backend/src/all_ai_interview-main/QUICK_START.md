# Quick Start - Deploy on Server 72.61.120.205

ดูคู่มือแบบละเอียดที่ `DEPLOY_IMAGES.md`

## ขั้นตอนสั้นๆ:

```bash
# 1. บนเครื่อง local: Build images
chmod +x build-and-save-images.sh
./build-and-save-images.sh http://72.61.120.205:8000

# 2. อัพโหลด images และไฟล์ที่จำเป็น
scp ai-interviewer-*.tar.gz root@72.61.120.205:/tmp/
scp docker-compose.images.yml root@72.61.120.205:/opt/ai-interviewer/
scp database_generate/interview_data.db root@72.61.120.205:/opt/ai-interviewer/database/

# 3. บน server: Load images และ run
ssh root@72.61.120.205
cd /opt/ai-interviewer
docker load < /tmp/ai-interviewer-backend.tar.gz
docker load < /tmp/ai-interviewer-frontend.tar.gz
mkdir -p database && mv interview_data.db database/

# 4. สร้างไฟล์ .env
cat > .env << EOF
OPENAI_API_KEY=sk-your-actual-openai-api-key
OPENAI_MODEL=gpt-4o
OPENAI_TEMPERATURE=0.1
EOF
nano .env  # แก้ไข API key

# 5. Run containers
docker-compose -f docker-compose.images.yml up -d

# 6. ตรวจสอบ
docker-compose -f docker-compose.images.yml ps
docker-compose -f docker-compose.images.yml logs -f
```

## เข้าถึง Application

- **Frontend**: http://72.61.120.205
- **Backend API**: http://72.61.120.205:8000
- **API Docs**: http://72.61.120.205:8000/docs

## คำสั่งที่ใช้บ่อย

```bash
# ดู logs
docker-compose -f docker-compose.images.yml logs -f

# Restart
docker-compose -f docker-compose.images.yml restart

# Stop
docker-compose -f docker-compose.images.yml down

# Start
docker-compose -f docker-compose.images.yml up -d
```

## ต้องการรายละเอียดเพิ่มเติม?

ดูไฟล์ `DEPLOY_IMAGES.md` สำหรับคำแนะนำแบบละเอียด

