-- SQL Script to translate persona fields to Thai language
-- Updates role, environment, usage_pattern, key_drivers, and constraints for all 25 personas

-- P1: Female Office Worker
UPDATE personas SET 
    role = 'พนักงานออฟฟิศหญิง',
    environment = 'คอนโด',
    usage_pattern = 'ทำอาหารเป็นบางครั้ง',
    key_drivers = 'ชอบกลิ่นหอมและล้างออกง่าย',
    constraints = ''
WHERE interview_id = 'P1';

-- P2: Full-time Mom / Housewife
UPDATE personas SET 
    role = 'แม่บ้าน/แม่เลี้ยงเด็กเต็มเวลา',
    environment = 'มีลูกวัย 2 ขวบ',
    usage_pattern = 'อยู่บ้าน ทำอาหารทุกวัน',
    key_drivers = 'ความปลอดภัยของผลิตภัณฑ์, ฉลาก "อ่อนโยน", ไม่มีสารเคมีตกค้าง',
    constraints = ''
WHERE interview_id = 'P2';

-- P3: Working Dad / Private Company Employee
UPDATE personas SET 
    role = 'พ่อทำงาน/พนักงานบริษัทเอกชน',
    environment = 'มีลูก 1 คน',
    usage_pattern = 'ล้างจานหลังอาหารเย็นทุกวัน',
    key_drivers = 'ซื้อแบบขายส่ง (แม็คโคร), เน้นความเข้มข้นและความคุ้มค่า',
    constraints = ''
WHERE interview_id = 'P3';

-- P4: University Student
UPDATE personas SET 
    role = 'นักศึกษามหาวิทยาลัย',
    environment = 'หอพักกับเพื่อนอีก 1 คน',
    usage_pattern = 'ทำอาหารง่ายๆ',
    key_drivers = 'ซื้อที่ 7-11 เพื่อความสะดวกหรือ Shopee สำหรับซื้อจำนวนมาก/ราคา; กลิ่นดี, ขวดปั๊ม (ประหยัดพื้นที่), ราคาเหมาะกับนักศึกษา',
    constraints = ''
WHERE interview_id = 'P4';

-- P5: Creative Office Worker
UPDATE personas SET 
    role = 'พนักงานออฟฟิศสายครีเอทีฟ',
    environment = 'กรุงเทพ',
    usage_pattern = 'มินิมัลลิสต์, ชีวิตแบบยั่งยืน; ทำอาหารง่ายๆ, ล้างจานทุกวัน',
    key_drivers = 'ให้ความสำคัญกับส่วนผสมที่เป็นมิตรกับสิ่งแวดล้อม (ไม่มี SLS/Paraben) และบรรจุภัณฑ์รีไซเคิลได้',
    constraints = ''
WHERE interview_id = 'P5';

-- P6: Restaurant Owner
UPDATE personas SET 
    role = 'เจ้าของร้านอาหารตามสั่ง',
    environment = 'ธุรกิจขนาดเล็กมีพนักงาน 2 คน',
    usage_pattern = 'ใช้งานหนัก (ล้างจานหลายสิบชุดต่อวัน)',
    key_drivers = 'ราคาต่อหน่วย, ความเข้มข้น, พลังขจัดคราบมัน; ซื้อขายส่ง (แกลลอน/กล่อง)',
    constraints = ''
WHERE interview_id = 'P6';

-- P7: Hotel Maid
UPDATE personas SET 
    role = 'แม่บ้านโรงแรม',
    environment = 'ครัวพนักงานและล้างจาน',
    usage_pattern = 'หลายครั้งต่อวัน',
    key_drivers = 'ความเงางาม, ไม่มีคราบมันตกค้าง (โดยเฉพาะแก้วไวน์), ความเร็ว',
    constraints = ''
WHERE interview_id = 'P7';

-- P8: Retired Mom
UPDATE personas SET 
    role = 'แม่เกษียณ',
    environment = 'ต่างจังหวัด',
    usage_pattern = 'ทำอาหารทุกวัน',
    key_drivers = 'กลิ่นหอม (สดชื่น/สะอาด), ความอ่อนโยน (มือผู้สูงอายุ), ความคุ้นเคย/ความไว้วางใจ',
    constraints = ''
WHERE interview_id = 'P8';

-- P9: Creative Worker / Minimalist
UPDATE personas SET 
    role = 'พนักงานสายครีเอทีฟ/มินิมัลลิสต์',
    environment = 'คอนโด (อยู่คนเดียว)',
    usage_pattern = 'สายครีเอทีฟ, ทำอาหารง่ายๆ, ล้างทุกมื้อ',
    key_drivers = 'ดีไซน์ (บรรจุภัณฑ์), กลิ่นหอม (สะอาด/ธรรมชาติ), ฟังก์ชัน (ฟองน้อย)',
    constraints = ''
WHERE interview_id = 'P9';

-- P10: Family Dad / Office Worker
UPDATE personas SET 
    role = 'พ่อครอบครัว/พนักงานออฟฟิศ',
    environment = 'แต่งงาน, มีลูกสาว 2 คน',
    usage_pattern = 'ทำอาหารเย็น, ล้างจานกับลูกๆ',
    key_drivers = 'การสร้างความผูกพันในครอบครัว, บรรยากาศที่ดี (กลิ่นหอม), ความปลอดภัยสำหรับเด็ก',
    constraints = ''
WHERE interview_id = 'P10';

-- P11: General Laborer (Upcountry)
UPDATE personas SET 
    role = 'แรงงานรับจ้างทั่วไป (ต่างจังหวัด)',
    environment = 'ภรรยาขายอาหาร (ผัดไทย) หน้าบ้าน',
    usage_pattern = 'หนัก (ล้างหลังร้านปิด)',
    key_drivers = 'ความคุ้มค่า (แกลลอน/ขายส่ง), โปรโมชั่น, การขจัดคราบมัน',
    constraints = ''
WHERE interview_id = 'P11';

-- P12: SME Owner (Design Firm)
UPDATE personas SET 
    role = 'เจ้าของ SME (บริษัทดีไซน์)',
    environment = 'พนักงาน 15 คน; ครัวออฟฟิศ (แก้วกาแฟ, อาหารกลางวัน)',
    usage_pattern = '',
    key_drivers = 'ความสะอาด, ภาพลักษณ์มืออาชีพ, กลิ่นหอม (ไม่ติดทน), ขวดปั๊ม',
    constraints = ''
WHERE interview_id = 'P12';

-- P13: Content Creator / Influencer
UPDATE personas SET 
    role = 'คอนเทนต์ครีเอเตอร์/อินฟลูเอนเซอร์',
    environment = 'บ้านมินิมัลและไลฟ์สไตล์',
    usage_pattern = 'Sunlight (ธรรมชาติ/มะนาว) หรือแบรนด์ญี่ปุ่น',
    key_drivers = 'บรรจุภัณฑ์สวยงาม (โทนขาว/เหลือง), แนวคิดธรรมชาติ/ยั่งยืน',
    constraints = ''
WHERE interview_id = 'P13';

-- P14: International Student (Australia)
UPDATE personas SET 
    role = 'นักศึกษาต่างชาติ (ออสเตรเลีย)',
    environment = 'หอพักร่วมกับเพื่อนต่างชาติ 4 คน',
    usage_pattern = 'ซื้อ/ใช้ร่วมกัน',
    key_drivers = 'กลิ่นสากล (มะนาว), ขวดขนาดกลาง, ล้างออกง่าย (เนื่องจากแรงดันน้ำ)',
    constraints = ''
WHERE interview_id = 'P14';

-- P15: Office Worker / Sensitive Skin User
UPDATE personas SET 
    role = 'พนักงานออฟฟิศ/ผู้มีผิวแพ้ง่าย',
    environment = '',
    usage_pattern = 'ทำอาหารเย็นทุกวัน',
    key_drivers = 'ส่วนผสมอ่อนโยน (อโลเวร่า, วิตามินอี), ไม่มี SLS/แอลกอฮอล์',
    constraints = 'โรคผิวหนังอักเสบจากการสัมผัส (แพ้สารเคมีรุนแรง)'
WHERE interview_id = 'P15';

-- P16: New Mom (Maternity Leave)
UPDATE personas SET 
    role = 'แม่ใหม่ (ลาคลอด)',
    environment = 'มีลูกวัย 6 เดือน',
    usage_pattern = 'ล้างขวดนมและจานหลายครั้งต่อวัน',
    key_drivers = 'เกรดอาหาร, ปลอดภัยสำหรับเด็ก, ไม่มีสารเคมีตกค้าง, ผ่านการทดสอบโดยแพทย์ผิวหนัง',
    constraints = ''
WHERE interview_id = 'P16';

-- P17: Daily Rental Condo Maid
UPDATE personas SET 
    role = 'แม่บ้านคอนโดให้เช่ารายวัน',
    environment = '',
    usage_pattern = 'ทำความสะอาดห้องและล้างจานหลังแขก; 20-30 ชุดในวันที่มีแขกเยอะ',
    key_drivers = 'ความเร็ว, ความคุ้มค่า (ขนาดแกลลอน), การขจัดคราบมัน',
    constraints = ''
WHERE interview_id = 'P17';

-- P18: Market Vendor (Grilled Pork)
UPDATE personas SET 
    role = 'แม่ค้าตลาด (หมูปิ้ง)',
    environment = '',
    usage_pattern = 'เริ่มตี 4, ล้างอุปกรณ์คราบมันหนักหลังขาย',
    key_drivers = 'ขจัดคราบมันหนัก, ความคุ้มค่าแบบขายส่ง, ฟองน้อย (เพื่อประหยัดน้ำ)',
    constraints = 'แรงดันน้ำจำกัดที่ตลาด, เร่งเวลา'
WHERE interview_id = 'P18';

-- P19: Fashion Industry Professional
UPDATE personas SET 
    role = 'มืออาชีพในอุตสาหกรรมแฟชั่น',
    environment = 'คอนโดหรู (ทองหล่อ)',
    usage_pattern = 'ทำอาหารเล็กน้อย',
    key_drivers = 'ความสวยงามระดับพรีเมียม, กลิ่นหอมหรูหรา (ซิตรัส/สมุนไพร), ดีไซน์มินิมัล',
    constraints = ''
WHERE interview_id = 'P19';

-- P20: Boarding School Teacher
UPDATE personas SET 
    role = 'ครูโรงเรียนประจำ',
    environment = 'หอพักโรงเรียน/โรงอาหาร',
    usage_pattern = 'ล้างถาด/จานนักเรียน',
    key_drivers = 'ความปลอดภัยสำหรับเด็ก (ไม่มีตกค้าง), ความอ่อนโยน (สำหรับพนักงาน/ตัวเอง), ความคุ้มค่า',
    constraints = ''
WHERE interview_id = 'P20';

-- P21: Food Delivery Rider
UPDATE personas SET 
    role = 'ไรเดอร์ส่งอาหาร',
    environment = '',
    usage_pattern = 'ล้างอุปกรณ์ส่งอาหารและของส่วนตัวทุกคืน',
    key_drivers = 'ความเร็ว, กลิ่นสดชื่น (มะนาว/เบอร์กามอต) เพื่อการผ่อนคลาย, ความสะดวก',
    constraints = 'ภาชนะมันๆ, ความเหนื่อยล้า'
WHERE interview_id = 'P21';

-- P22: University Student
UPDATE personas SET 
    role = 'นักศึกษามหาวิทยาลัย',
    environment = 'หอพักในเมือง',
    usage_pattern = '',
    key_drivers = 'กลิ่นผ่อนคลาย/สดชื่น (ลาเวนเดอร์/ชาเขียว), ขนาดกะทัดรัด, ฟองน้อย',
    constraints = 'อ่างล้างจานเล็ก/พื้นที่จำกัด'
WHERE interview_id = 'P22';

-- P23: Elderly living alone
UPDATE personas SET 
    role = 'ผู้สูงอายุอยู่คนเดียว',
    environment = '',
    usage_pattern = '',
    key_drivers = 'ขวดบีบง่าย, พื้นผิวไม่ลื่น, กลิ่นอ่อน, ความปลอดภัย/ความไว้วางใจ',
    constraints = 'โรคข้ออักเสบ, มือแห้ง'
WHERE interview_id = 'P23';

-- P24: Cafe Owner / Chef
UPDATE personas SET 
    role = 'เจ้าของคาเฟ่/เชฟ',
    environment = 'คาเฟ่เล็กที่มีครัวเปิด',
    usage_pattern = 'ใช้งานสูงทุกวัน',
    key_drivers = 'การขจัดคราบมัน, ไม่มีกลิ่นตกค้าง (ส่งผลต่อกลิ่นกาแฟ), ภาพลักษณ์ร้าน (บรรจุภัณฑ์)',
    constraints = ''
WHERE interview_id = 'P24';

-- P25: Lab Researcher / Chemist
UPDATE personas SET 
    role = 'นักวิจัยห้องแล็บ/นักเคมี',
    environment = 'อุปกรณ์ห้องแล็บและกล่องอาหารกลางวันส่วนตัว',
    usage_pattern = 'อุตสาหกรรม (ห้องแล็บ) / Sunlight (บ้าน)',
    key_drivers = 'ไม่มีสารเคมีตกค้างเลย, ไม่มีกลิ่น/กลิ่นสะอาด, ล้างออกง่าย',
    constraints = ''
WHERE interview_id = 'P25';

-- Verify the updates
SELECT interview_id, role, environment, usage_pattern, key_drivers, constraints 
FROM personas 
ORDER BY interview_id;
