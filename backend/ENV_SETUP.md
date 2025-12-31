# Environment Variables Setup Guide

คู่มือการตั้งค่า Environment Variables สำหรับ Backend Server

## Quick Start

### สำหรับ Localhost Development

**Default values** (ไม่ต้องตั้งค่าถ้า PostgreSQL ใช้ port 5432):
- `HOST=localhost`
- `PORT=3001`
- `NODE_ENV=development`
- `DB_PORT=5432` (PostgreSQL default port)

**ถ้า PostgreSQL ใช้ port อื่น** สร้างไฟล์ `.env`:
```env
DB_PORT=5433
# หรือ
DATABASE_URL=postgresql://postgres:postgres123@localhost:5433/interview_db
```

### สำหรับ Production Server

สร้างไฟล์ `.env` ในโฟลเดอร์ `backend/`:

```env
NODE_ENV=production
PORT=7183
HOST=0.0.0.0
DATABASE_URL=postgresql://postgres:postgres123@localhost:5433/interview_db
```

## Environment Variables Reference

### HOST

- **Localhost**: `localhost` (default)
- **Server**: `0.0.0.0` (default เมื่อ `NODE_ENV=production`)
- **คำอธิบาย**: Host ที่ server จะ bind
  - `localhost`: รับ connection จากเครื่องเดียวกันเท่านั้น
  - `0.0.0.0`: รับ connection จากทุก network interface (สำหรับ production)

### PORT

- **Localhost**: `3001` (default)
- **Server**: `7183` (default เมื่อ `NODE_ENV=production`)
- **คำอธิบาย**: Port ที่ server จะฟัง

### NODE_ENV

- **Localhost**: `development` (default)
- **Server**: `production` (ต้องตั้งค่า)
- **คำอธิบาย**: Environment mode
  - `development`: แสดง error messages แบบละเอียด
  - `production`: ซ่อน error details เพื่อความปลอดภัย

### DATABASE_URL หรือ Individual Settings

**วิธีที่ 1: ใช้ DATABASE_URL (Full connection string)**
- **Format**: `postgresql://username:password@host:port/database`
- **Default สำหรับ Localhost**: `postgresql://postgres:postgres123@localhost:5432/interview_db`
- **Default สำหรับ Server**: `postgresql://postgres:postgres123@localhost:5433/interview_db`

**วิธีที่ 2: ใช้ Individual Settings (แนะนำ - ยืดหยุ่นกว่า)**
- `DB_HOST=localhost` (default)
- `DB_PORT=5432` (localhost) หรือ `5433` (server)
- `DB_USER=postgres` (default)
- `DB_PASSWORD=postgres123` (default)
- `DB_NAME=interview_db` (default)

**สำหรับ Localhost:**
```env
DB_PORT=5432
# หรือ
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/interview_db
```

**สำหรับ Server (Docker with host network):**
```env
DB_PORT=5433
# หรือ
DATABASE_URL=postgresql://postgres:postgres123@localhost:5433/interview_db
```
(ใช้ `localhost` เพราะ Docker ใช้ `network_mode: host`)

**สำหรับ Server (Docker with bridge network):**
```env
DB_HOST=postgres-container
DB_PORT=5432
# หรือ
DATABASE_URL=postgresql://postgres:postgres123@postgres-container:5432/interview_db
```
(ใช้ container name แทน `localhost`)

## การตรวจสอบการตั้งค่า

### ตรวจสอบว่า Server ใช้ค่าอะไร

เมื่อรัน server จะแสดง:
```
🚀 Server running on http://0.0.0.0:7183
📡 API endpoints available at http://0.0.0.0:7183/api
```

### ตรวจสอบ Database Connection

Server จะแสดง:
```
✅ Connected to PostgreSQL database
✅ Database schema initialized successfully
```

ถ้าเห็น error:
```
❌ Error initializing database: error: database "interview_db" does not exist
```

ให้ตรวจสอบ:
1. PostgreSQL รันอยู่หรือไม่
2. Database `interview_db` ถูกสร้างแล้วหรือไม่
3. `DATABASE_URL` ถูกต้องหรือไม่

## Troubleshooting

### ปัญหา: Server ไม่สามารถเชื่อมต่อ Database

**แก้ไข:**
1. ตรวจสอบว่า PostgreSQL รันอยู่:
   ```bash
   # Linux/Mac
   sudo systemctl status postgresql
   
   # หรือ
   psql -U postgres -h localhost -p 5433
   ```

2. สร้าง database ถ้ายังไม่มี:
   ```bash
   psql -U postgres -h localhost -p 5433
   CREATE DATABASE interview_db;
   ```

3. ตรวจสอบ `DATABASE_URL` ใน `.env` หรือ environment variables

### ปัญหา: Server ไม่สามารถ bind port

**แก้ไข:**
1. ตรวจสอบว่า port ถูกใช้งานอยู่หรือไม่:
   ```bash
   # Linux/Mac
   lsof -i :7183
   
   # Windows
   netstat -ano | findstr :7183
   ```

2. เปลี่ยน PORT ใน `.env` หรือ environment variables

### ปัญหา: Server รันแต่ไม่สามารถเข้าถึงจากภายนอก

**แก้ไข:**
1. ตรวจสอบว่า `HOST=0.0.0.0` (ไม่ใช่ `localhost`)
2. ตรวจสอบ firewall settings
3. ตรวจสอบว่า port ถูกเปิดใน firewall

## Best Practices

1. **อย่า commit `.env` file** - ไฟล์นี้ถูก ignore ใน `.gitignore` แล้ว
2. **ใช้ `.env.example`** - สร้างไฟล์ตัวอย่างสำหรับทีม
3. **ใช้ environment variables ใน Docker** - ตั้งค่าใน `docker-compose.yml` แทน hardcode
4. **แยก config ตาม environment** - ใช้ `.env.development` และ `.env.production` ถ้าจำเป็น

