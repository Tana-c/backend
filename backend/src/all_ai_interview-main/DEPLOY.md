# คู่มือการ Deploy บน Server

## Prerequisites

- Server ที่มี Docker และ Docker Compose ติดตั้งแล้ว
- IP Address: 72.61.120.205 (หรือ IP ของ server คุณ)
- Port 8000 และ 80 เปิดใช้งานแล้ว

## วิธีการ Deploy

ใช้ Docker Images (ไม่ต้อง Clone Git)

สำหรับรายละเอียดแบบละเอียด ดูไฟล์ `DEPLOY_IMAGES.md`

## ขั้นตอนการ Deploy

### 1. บนเครื่อง Local: Build Docker Images

```bash
# Build images และ save เป็น tar files
chmod +x build-and-save-images.sh
./build-and-save-images.sh http://72.61.120.205:8000
```

### 2. อัพโหลดไฟล์ไปยัง Server

```bash
# อัพโหลด images
scp ai-interviewer-*.tar.gz root@72.61.120.205:/tmp/

# อัพโหลด docker-compose file และ database
scp docker-compose.images.yml root@72.61.120.205:/opt/ai-interviewer/
scp database_generate/interview_data.db root@72.61.120.205:/opt/ai-interviewer/database/
```

### 3. บน Server: Setup และ Run

#### SSH เข้า Server

```bash
ssh root@72.61.120.205
```

#### Load Docker Images

```bash
# Load backend image
docker load < /tmp/ai-interviewer-backend.tar.gz

# Load frontend image
docker load < /tmp/ai-interviewer-frontend.tar.gz

# ตรวจสอบว่า images โหลดสำเร็จ
docker images | grep ai-interviewer
```

#### Setup Project Directory

```bash
cd /opt/ai-interviewer

# สร้าง directory สำหรับ database
mkdir -p database

# ย้าย database file (ถ้ายังไม่ได้อยู่ที่ถูกต้อง)
# ตรวจสอบว่า database/interview_data.db มีอยู่
ls -lh database/interview_data.db

# สร้างไฟล์ .env
cat > .env << EOF
OPENAI_API_KEY=sk-your-actual-openai-api-key
OPENAI_MODEL=gpt-4o
OPENAI_TEMPERATURE=0.1
EOF

# แก้ไข API key
nano .env
```

#### Run Containers

```bash
# Run containers
docker-compose -f docker-compose.images.yml up -d

# ตรวจสอบ status
docker-compose -f docker-compose.images.yml ps

# ดู logs
docker-compose -f docker-compose.images.yml logs -f
```

### 4. เปิด Firewall Ports

```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 8000/tcp
sudo ufw allow 80/tcp
sudo ufw reload

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --reload
```

### 5. ตรวจสอบ

```bash
# ตรวจสอบ backend
curl http://localhost:8000/health
curl http://72.61.120.205:8000/health

# ตรวจสอบ frontend
curl http://localhost:80
curl http://72.61.120.205:80
```

## เข้าถึง Application

- **Frontend**: http://72.61.120.205 (port 80)
- **Backend API**: http://72.61.120.205:8000
- **API Docs**: http://72.61.120.205:8000/docs

## การจัดการ Services

### ดู Logs
```bash
# ทั้งหมด
docker-compose -f docker-compose.images.yml logs -f

# เฉพาะ backend
docker-compose -f docker-compose.images.yml logs -f backend

# เฉพาะ frontend
docker-compose -f docker-compose.images.yml logs -f frontend
```

### Restart Services
```bash
# Restart ทั้งหมด
docker-compose -f docker-compose.images.yml restart

# Restart เฉพาะ backend
docker-compose -f docker-compose.images.yml restart backend
```

### Stop Services
```bash
docker-compose -f docker-compose.images.yml down
```

### Start Services
```bash
docker-compose -f docker-compose.images.yml up -d
```

## การอัพเดท

### อัพเดท Images

```bash
# บนเครื่อง local: Build images ใหม่
./build-and-save-images.sh http://72.61.120.205:8000

# อัพโหลด images ใหม่ไปยัง server
scp ai-interviewer-*.tar.gz root@72.61.120.205:/tmp/

# บน server: Stop containers
docker-compose -f docker-compose.images.yml down

# Load images ใหม่
docker load < /tmp/ai-interviewer-backend.tar.gz
docker load < /tmp/ai-interviewer-frontend.tar.gz

# Remove old images (optional)
docker image prune -f

# Start containers ใหม่
docker-compose -f docker-compose.images.yml up -d
```

### อัพเดท Database

```bash
# บนเครื่อง local: Backup database ใหม่
scp database_generate/interview_data.db root@72.61.120.205:/opt/ai-interviewer/database/

# บน server: Restart backend
docker-compose -f docker-compose.images.yml restart backend
```

### อัพเดท Config (.env)

```bash
# แก้ไข .env บน server
nano /opt/ai-interviewer/.env

# Restart containers
docker-compose -f docker-compose.images.yml restart
```

## โครงสร้างไฟล์บน Server

```
/opt/ai-interviewer/
├── docker-compose.images.yml    # Docker compose file
├── .env                         # Environment variables
└── database/
    └── interview_data.db        # Database file
```

**ไม่มี source code บน server!**

## Troubleshooting

### Images ไม่พบ
```bash
# ตรวจสอบว่ามี images
docker images | grep ai-interviewer

# ถ้าไม่มี ต้อง load ก่อน
docker load < /tmp/ai-interviewer-backend.tar.gz
docker load < /tmp/ai-interviewer-frontend.tar.gz
```

### Database ไม่พบ
```bash
# ตรวจสอบ database file
ls -lh database/interview_data.db

# ถ้าไม่มี ให้อัพโหลดจาก local
# บน local:
scp database_generate/interview_data.db root@72.61.120.205:/opt/ai-interviewer/database/
```

### Container ไม่ start
```bash
# ดู logs เพื่อดู error
docker-compose -f docker-compose.images.yml logs backend
docker-compose -f docker-compose.images.yml logs frontend

# ตรวจสอบ .env file
cat .env
```

### Port ถูกใช้งานแล้ว
```bash
# ตรวจสอบ port
sudo netstat -tulpn | grep :8000
sudo netstat -tulpn | grep :80

# แก้ไข port ใน docker-compose.images.yml
nano docker-compose.images.yml
# เปลี่ยน "8000:8000" เป็น "8001:8000"
```

## การ Backup Database

```bash
# Backup database
docker cp ai-interviewer-backend:/app/interview_data.db ./backup_$(date +%Y%m%d).db

# หรือ copy จาก volume
cp database/interview_data.db ./backup_$(date +%Y%m%d).db
```

## ต้องการรายละเอียดเพิ่มเติม?

ดูไฟล์ `DEPLOY_IMAGES.md` สำหรับคำแนะนำแบบละเอียด
