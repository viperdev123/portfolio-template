# Portfolio Tab Maker

เว็บแอปทำหน้าพอร์ตโฟลิโอ A4 พร้อมแถบสารบัญด้านข้าง แล้วบันทึกเป็น PNG 2480×3508 px (300 DPI)
Vue 3 + Vite + TypeScript, html-to-image, jszip, ฟอนต์ @fontsource (ฝังในโปรเจกต์ ไม่ใช้ CDN)

## ใช้งาน
```
npm install
npm run dev          # http://localhost:5173
npm run build        # type-check + build
npm run test:e2e     # ต้องเปิด npm run dev ไว้ ตรวจขนาด PNG / alpha / ZIP และเก็บภาพลง docs/
```
(ครั้งแรกของ e2e: `npx playwright install chromium`)

## โครงสร้าง
- `src/components/PageCanvas.vue` หน้า 1240×1754 px คงที่ ใช้ทั้งพรีวิวและ export
- `src/export.ts` mount PageCanvas แบบไม่มี transform นอกจอ → html-to-image (warm-up 1 รอบ, pixelRatio 2)
- `src/store.ts` state + localStorage, `src/presets.ts` ชุดสี, `src/App.vue` UI
- `tests/e2e.mjs`, `sample/background.jpg` (ดึงจาก side-tabs-preview.html), `docs/` screenshot ผลลัพธ์

## ข้อตัดสินใจที่สเปกคลุมเครือ (เลือกแบบง่ายสุด)
- แถบวาดอยู่ในหน้า ชิดขอบ; มุมโค้งอยู่ด้านที่หันเข้าหาเนื้อหา; แถบ active กว้าง 1.36× ของแถบอื่น (ค่าคงที่)
- แถบมีเฉพาะชื่อไทย (ตัวหนา เขียนแนวตั้ง) ไม่มีชื่ออังกฤษ
- แต่ละแถบความสูงเท่ากัน ชื่อยาวมากจะล้นแถบ ให้ลดขนาดตัวอักษรหรือเพิ่มความสูงรวม
- เลขลำดับ: ช่องว่าง = ใส่อัตโนมัติ 01, 02, …
- ชุดสีเปลี่ยนทั้งสีแถบ ตัวอักษร และสีทอง; สีพื้นแถบเป็นรายแถบแก้ได้ภายหลัง
- รูปอัปโหลดถูกย่อให้ด้านยาวไม่เกิน 3508 px และเก็บเป็น JPEG data URL; ถ้าใหญ่เกินโควตา localStorage จะเตือนให้ใช้ไฟล์ .json
- ชื่อไฟล์ ZIP: `NN-ชื่อไทย.png`
- กรอบประสีแดงในพรีวิวคือพื้นที่แถบ (ไม่ติดไปกับไฟล์ export); เปิด/ปิดได้
