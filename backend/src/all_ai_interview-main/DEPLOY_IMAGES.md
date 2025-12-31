# คู่มือการ Deploy ด้วย Docker Images (ไม่ต้อง Clone Git)

คู่มือนี้จะอธิบายวิธีการ deploy โดยใช้ Docker images โดยไม่ต้อง clone source code ไปยัง server

## ขั้นตอนการ Deploy

### 1. บนเครื่อง Local: Build Docker Images

```bash
# ให้ execute permission
chmod +x build-and-save-images.sh

# Build images และ save เป็น tar files
./build-and-save-images.sh http://72.61.120.205:8000
```

คำสั่งนี้จะสร้างไฟล์:
- `ai-interviewer-backend.tar.gz`
- `ai-interviewer-frontend.tar.gz`

### 2. เตรียมไฟล์สำหรับ Server

สร้างโฟลเดอร์สำหรับไฟล์ที่จะส่งไป server:

```bash
mkdir -p deploy-files/database
mkdir -p deploy-files/config
```

#### คัดลอก Database

```bash
# คัดลอก database file
cp database_generate/interview_data.db deploy-files/database/
```

#### สร้างไฟล์ .env

```bash
# สร้างไฟล์ .env
cat > deploy-files/config/.env << EOF
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
OPENAI_MODEL=gpt-4o
OPENAI_TEMPERATURE=0.1
EOF

# แก้ไข API key
nano deploy-files/config/.env
```

#### คัดลอก docker-compose file

```bash
cp docker-compose.images.yml deploy-files/
```

### 3. อัพโหลดไฟล์ไปยัง Server

```bash
# อัพโหลด images
scp ai-interviewer-*.tar.gz root@72.61.120.205:/tmp/

# อัพโหลด config และ database
scp -r deploy-files/* root@72.61.120.205:/opt/ai-interviewer/
```

หรือใช้ rsync:

```bash
rsync -avz ai-interviewer-*.tar.gz root@72.61.120.205:/tmp/
rsync -avz deploy-files/ root@72.61.120.205:/opt/ai-interviewer/
```

### 4. บน Server: Setup และ Run

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

ควรเห็น:
```
ai-interviewer-backend     latest    ...
ai-interviewer-frontend    latest    ...
```

#### Setup Project Directory

```bash
cd /opt/ai-interviewer

# สร้าง directory สำหรับ database
mkdir -p database

# ย้าย database file (ถ้ายังไม่ได้อยู่ที่ถูกต้อง)
# ตรวจสอบว่า database/interview_data.db มีอยู่
ls -lh database/interview_data.db

# ตรวจสอบว่า .env มีอยู่
ls -lh .env
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

### 5. เปิด Firewall Ports

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

### 6. ตรวจสอบ

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
cp database_generate/interview_data.db deploy-files/database/

# อัพโหลดไปยัง server
scp deploy-files/database/interview_data.db root@72.61.120.205:/opt/ai-interviewer/database/

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

## คำสั่งที่ใช้บ่อย

```bash
cd /opt/ai-interviewer

# ดู status
docker-compose -f docker-compose.images.yml ps

# ดู logs
docker-compose -f docker-compose.images.yml logs -f
docker-compose -f docker-compose.images.yml logs -f backend
docker-compose -f docker-compose.images.yml logs -f frontend

# Restart
docker-compose -f docker-compose.images.yml restart
docker-compose -f docker-compose.images.yml restart backend

# Stop
docker-compose -f docker-compose.images.yml down

# Start
docker-compose -f docker-compose.images.yml up -d

# ตรวจสอบ images
docker images | grep ai-interviewer

# ตรวจสอบ containers
docker ps | grep ai-interviewer
```

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

## ข้อดีของการใช้ Images

✅ **ไม่ต้องมี source code บน server** - ลดความเสี่ยงและทำให้ server สะอาด
✅ **Deploy เร็ว** - ไม่ต้อง build บน server
✅ **สม่ำเสมอ** - ใช้ images เดียวกันทุก environment
✅ **ง่ายต่อการ rollback** - แค่ load image เก่า
✅ **ใช้พื้นที่น้อย** - ไม่มี node_modules หรือ source code

## สรุป

1. Build images บน local → `./build-and-save-images.sh`
2. อัพโหลด tar files ไปยัง server
3. Load images บน server → `docker load`
4. Setup database และ .env
5. Run → `docker-compose -f docker-compose.images.yml up -d`

**ไม่ต้อง clone git หรือมี source code บน server!**

