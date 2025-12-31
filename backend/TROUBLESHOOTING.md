# Troubleshooting Guide

## 502 Bad Gateway Error

เมื่อเจอ 502 Bad Gateway แสดงว่า nginx ไม่สามารถเชื่อมต่อไปที่ backend ได้

### ขั้นตอนการตรวจสอบ:

1. **ตรวจสอบว่า Docker container รันอยู่หรือไม่:**
   ```bash
   docker ps | grep ai-interviewer
   ```

2. **ตรวจสอบ logs ของ container:**
   ```bash
   docker logs ai-interviewer
   ```

3. **ตรวจสอบว่า port 7183 เปิดอยู่:**
   ```bash
   netstat -tuln | grep 7183
   # หรือ
   ss -tuln | grep 7183
   ```

4. **ทดสอบว่า backend รันอยู่หรือไม่:**
   ```bash
   curl http://127.0.0.1:7183/health
   # หรือ
   curl http://127.0.0.1:7183/aiinterview/
   ```

5. **ตรวจสอบ nginx error logs:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

6. **ทดสอบ nginx config:**
   ```bash
   sudo nginx -t
   ```

7. **Reload nginx:**
   ```bash
   sudo systemctl reload nginx
   ```

### วิธีแก้ไข:

#### ถ้า container ไม่รัน:
```bash
cd /root/ai_interviewer/interview-/
docker-compose up -d
```

#### ถ้า container รันแต่ backend crash:
- ตรวจสอบ logs: `docker logs ai-interviewer`
- ตรวจสอบว่า database connection ถูกต้อง
- ตรวจสอบว่า dist folder มีอยู่ใน container หรือไม่

#### ถ้า container รันแต่ port ไม่เปิด:
```bash
# ตรวจสอบว่า container bind port ถูกต้อง
docker port ai-interviewer
```

#### ถ้า nginx config ไม่ถูกต้อง:
- ตรวจสอบไฟล์ `/etc/nginx/sites-available/interviewer`
- ทดสอบ config: `sudo nginx -t`
- Reload nginx: `sudo systemctl reload nginx`

### ตรวจสอบ dist folder ใน container:

```bash
docker exec ai-interviewer ls -la /usr/src/app/dist
docker exec ai-interviewer ls -la /usr/src/app/dist/index.html
```

### Restart ทั้งหมด:

```bash
# Stop container
docker-compose down

# Start container
docker-compose up -d

# Check logs
docker logs -f ai-interviewer

# Reload nginx
sudo systemctl reload nginx
```

## SyntaxError: Unexpected token ':' (TypeScript in JavaScript)

ถ้าเจอ error `SyntaxError: Unexpected token ':'` แสดงว่ามี TypeScript syntax ในไฟล์ `.js`

### วิธีแก้ไข:

1. **ตรวจสอบไฟล์ server.js** - ต้องไม่มี TypeScript type annotations เช่น `(t: any)` ควรเป็น `(t)` แทน

2. **Rebuild Docker image:**
   ```bash
   cd /root/ai_interviewer/interview-/
   docker-compose down
   docker-compose build
   docker-compose up -d
   ```

3. **ตรวจสอบ logs:**
   ```bash
   docker logs -f ai-interviewer
   ```

4. **ถ้ายังมี error** - ตรวจสอบว่าไฟล์ `src/server.js` ไม่มี TypeScript syntax:
   ```bash
   # ตรวจสอบว่ามี TypeScript syntax หรือไม่
   grep -n ":\s*any" src/server.js
   # ถ้ามี ให้ลบ type annotations ออก
   ```

