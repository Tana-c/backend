# Backend Server

Backend API server สำหรับ AI Interview System

## การติดตั้งและใช้งาน

### รันบน Localhost (Development)

1. ติดตั้ง dependencies:
```bash
npm install
```

2. (Optional) สร้างไฟล์ `.env` สำหรับตั้งค่า environment variables:
```bash
# คัดลอกจาก .env.example
cp .env.example .env

# หรือสร้างใหม่ด้วยค่าต่อไปนี้:
HOST=localhost
PORT=3001
NODE_ENV=development
DB_PORT=5432
DB_PASSWORD=your_actual_password  # ใส่ password ที่ถูกต้องของ PostgreSQL
# หรือใช้ DATABASE_URL แทน
# DATABASE_URL=postgresql://postgres:your_actual_password@localhost:5432/interview_db
```

**หมายเหตุ**: 
- สำหรับ localhost PostgreSQL มักจะรันที่ port **5432** (default) ไม่ใช่ 5433
- ถ้าเห็น error "password authentication failed" ให้ตั้งค่า `DB_PASSWORD` ใน `.env` ให้ตรงกับ password ของ PostgreSQL user
- ถ้าไม่รู้ password สามารถเปลี่ยนได้ด้วย: `psql -U postgres` แล้วรัน `ALTER USER postgres PASSWORD 'new_password';`

3. รัน server:
```bash
# Development mode (with auto-reload)
npm run dev

# หรือใช้ nodemon
npm run nodemon

# Production mode
npm start
```

Server จะรันที่ `http://localhost:3001`

**หมายเหตุ**: สำหรับ localhost development:
- `HOST` จะเป็น `localhost` (default)
- `PORT` จะเป็น `3001` (default)
- `DATABASE_URL` จะใช้ `postgresql://postgres:postgres123@localhost:5433/interview_db` (default)

### รันบน Server (Production)

#### วิธีที่ 1: ใช้ Docker Compose (แนะนำ)

1. ตรวจสอบไฟล์ `docker-compose.yml`:
```yaml
environment:
  - NODE_ENV=production
  - PORT=7183
  - HOST=0.0.0.0
  - DATABASE_URL=postgresql://postgres:postgres123@localhost:5433/interview_db
```

2. รันด้วย docker-compose:
```bash
docker-compose up -d
```

#### วิธีที่ 2: ใช้ Docker โดยตรง

1. สร้าง Docker image:
```bash
docker build -t interview2-backend .
```

2. รัน Docker container:
```bash
docker run -d \
  -p 7183:7183 \
  -e NODE_ENV=production \
  -e PORT=7183 \
  -e HOST=0.0.0.0 \
  -e DATABASE_URL=postgresql://postgres:postgres123@localhost:5433/interview_db \
  --name interview2-backend \
  interview2-backend
```

#### วิธีที่ 3: รันโดยตรงบน Server (ไม่ใช้ Docker)

1. สร้างไฟล์ `.env`:
```bash
NODE_ENV=production
PORT=7183
HOST=0.0.0.0
DATABASE_URL=postgresql://postgres:postgres123@localhost:5433/interview_db
```

2. รัน server:
```bash
npm start
```

## Environment Variables

### สำหรับ Localhost (Development)
```env
HOST=localhost
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres123@localhost:5433/interview_db
```

### สำหรับ Server (Production)
```env
HOST=0.0.0.0
PORT=7183
NODE_ENV=production
DATABASE_URL=postgresql://postgres:postgres123@localhost:5433/interview_db
```

### รายละเอียด Environment Variables

- `PORT`: Port ที่ server จะฟัง
  - **Localhost**: `3001` (default)
  - **Server**: `7183` (default เมื่อ `NODE_ENV=production`)
  
- `HOST`: Host ที่ server จะ bind
  - **Localhost**: `localhost` (default)
  - **Server**: `0.0.0.0` (default เมื่อ `NODE_ENV=production`) เพื่อให้รับ connection จากภายนอก
  
- `NODE_ENV`: Environment mode
  - `development`: สำหรับ localhost development
  - `production`: สำหรับ production server
  
- `DATABASE_URL`: PostgreSQL connection string
  - Format: `postgresql://username:password@host:port/database`
  - Default: `postgresql://postgres:postgres123@localhost:5433/interview_db`
  - **หมายเหตุ**: สำหรับ Docker ที่ใช้ `network_mode: host` จะใช้ `localhost` แทน container name

### การตั้งค่า Database

**สำหรับ Localhost:**
- ต้องมี PostgreSQL รันอยู่ที่ `localhost:5433`
- Database name: `interview_db`
- Username: `postgres`
- Password: `postgres123`

**สำหรับ Server (Docker):**
- ใช้ `network_mode: host` ใน docker-compose.yml เพื่อให้ container เข้าถึง PostgreSQL บน host
- Database connection string ใช้ `localhost` แทน container name
- ตรวจสอบว่า PostgreSQL บน host รันอยู่ที่ port `5433`

## API Endpoints

API endpoints หลัก:
- `GET /api/cards` - ดึงข้อมูล cards ทั้งหมด
- `POST /api/cards` - สร้าง card ใหม่
- `GET /api/cards/:id` - ดึงข้อมูล card ตาม ID
- `PUT /api/cards/:id` - อัปเดต card
- `DELETE /api/cards/:id` - ลบ card
- `POST /api/analyze-objective` - วิเคราะห์ objective ด้วย AI
- `POST /api/analyze-answer` - วิเคราะห์คำตอบด้วย AI

ดู API endpoints เพิ่มเติมได้ในไฟล์ `src/server.js`

