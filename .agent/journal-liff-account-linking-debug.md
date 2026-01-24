# บันทึกโครงการ: แก้ไขปัญหา LIFF Account Linking และ LINE Profile Display

**วันที่:** 24 มกราคม 2026
**หัวข้อ:** การแก้ไขปัญหาการแสดง LINE Profile ในหน้า Account Linking
**Branch:** `develop`

---

## สรุปปัญหา

เมื่อผู้ใช้เปิด LIFF Link Page (https://liff.line.me/2008935318-2hSCjYJb) ใน LINE app และเข้าสู่หน้า Account Linking สำเร็จ แต่ไม่แสดงชื่อและรูปโปรไฟล์จาก LINE

### อาการที่พบ
- หน้า Account Link โหลดได้ปกติ
- แสดงปุ่มเลือกวิธีการยืนยันตัวตน (รหัสพนักงาน / อีเมล-รหัสผ่าน)
- แต่ส่วนแสดงชื่อและรูปโปรไฟล์ LINE แสดงเป็นค่า default (User icon และ "LINE User")
- Console log แสดง: `[LiffLink] Already initialized this session, skipping`
- Debug output แสดง: `storedProfile: null`

---

## การวิเคราะห์ปัญหา

### Root Cause
ปัญหาเกิดจาก **Race Condition** ระหว่างการบันทึก session state และการบันทึกข้อมูล LINE profile:

1. **ขั้นตอนการทำงานที่มีปัญหา:**
   ```
   1. User เปิด LIFF Link page
   2. initializeLiff() ถูกเรียก
   3. markSessionInitialized() ถูกเรียกทันที (บรรทัด 151)
   4. เริ่มทำ OAuth flow กับ LINE
   5. [หน้าเว็บ reload ในจุดนี้ - ระหว่างทาง]
   6. (ไม่ได้ทำ) saveLineProfile() ที่บรรทัด 232/285
   ```

2. **หลังจาก page reload:**
   ```
   1. initializeLiff() ถูกเรียกอีกครั้ง
   2. ตรวจสอบ isSessionInitialized() = true
   3. พยายาม getStoredLineProfile() = null (เพราะยังไม่เคยบันทึก)
   4. แสดงหน้า Account Link โดยไม่มีข้อมูล profile
   ```

### ปัญหาที่เกี่ยวข้อง (ที่แก้ไขมาแล้ว)

ก่อนหน้านี้เราได้แก้ปัญหาอื่นๆ มาแล้ว:

1. **Infinite Loop ระหว่าง "Loading" และ "Checking"**
   - สาเหตุ: React state reset ทุกครั้งที่ page reload
   - แก้ไข: ใช้ `sessionStorage` เพื่อเก็บ initialization flag แทน `useState`

2. **Network Error ใน LINE app**
   - สาเหตุ: Axios มีปัญหาความเข้ากันได้กับ LIFF SDK
   - แก้ไข: เปลี่ยนจาก axios เป็น fetch() API

3. **Rate Limiting ระหว่าง Development**
   - สาเหตุ: Backend rate limiting ทำงานระหว่าง testing
   - แก้ไข: ปิด rate limiting ใน development mode

---

## วิธีแก้ไข

### การแก้ไข #1: เพิ่ม sessionStorage สำหรับ LINE Profile

**ไฟล์:** `frontend/src/components/layout/LiffLinkLayout.tsx`

เพิ่ม helper functions เพื่อจัดการ LINE profile ใน sessionStorage:

```typescript
const LIFF_PROFILE_KEY = 'liff_line_profile';

// Store LINE profile to sessionStorage
const saveLineProfile = (profile: LineProfile) => {
    sessionStorage.setItem(LIFF_PROFILE_KEY, JSON.stringify(profile));
};

// Retrieve LINE profile from sessionStorage
const getStoredLineProfile = (): LineProfile | null => {
    const stored = sessionStorage.getItem(LIFF_PROFILE_KEY);
    if (!stored) return null;
    try {
        return JSON.parse(stored) as LineProfile;
    } catch {
        return null;
    }
};

// Clear LINE profile from sessionStorage
const clearLineProfile = () => {
    sessionStorage.removeItem(LIFF_PROFILE_KEY);
};
```

### การแก้ไข #2: เพิ่ม Debug Logging

เพิ่ม console logs เพื่อติดตามการบันทึกและการดึงข้อมูล profile:

```typescript
// เมื่อบันทึก profile
console.log('[LiffLink] Saving profile to sessionStorage:', verifyResult.lineProfile);
saveLineProfile(verifyResult.lineProfile);
addDebugLog(`Saved profile: ${verifyResult.lineProfile.displayName}`);

// เมื่อดึง profile กลับมา
const storedProfile = getStoredLineProfile();
console.log('[LiffLink] Restoring from storage, storedProfile:', storedProfile);
addDebugLog(`Stored profile: ${storedProfile ? storedProfile.displayName : 'null'}`);
```

### การแก้ไข #3: แสดง Debug Output บนหน้าจอ

**ไฟล์:** `frontend/src/pages/liff/LiffLinkPage.tsx`

เพิ่มส่วนแสดง debug info เพื่อตรวจสอบข้อมูล profile:

```tsx
{/* Debug info */}
<div className="mt-6 p-3 bg-neutral-100 dark:bg-neutral-800 rounded text-left">
    <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
        Debug - LINE Profile:
    </p>
    <pre className="text-xs font-mono text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap break-all">
        {JSON.stringify(lineProfile, null, 2) || 'null'}
    </pre>
</div>
```

### การแก้ไข #4: ปรับเปลี่ยนตำแหน่งการเรียก markSessionInitialized() 🎯

**นี่คือการแก้ไขหลักที่แก้ปัญหาได้:**

**ก่อนแก้ไข:**
```typescript
try {
    console.log('[LiffLink] Starting initialization...');
    hasInitializedRef.current = true;
    markSessionInitialized(); // ❌ เรียกเร็วเกินไป!
    setState(prev => ({ ...prev, status: 'initializing', error: null }));

    // ... ทำ OAuth flow และดึงข้อมูล profile ...

    saveLineProfile(verifyResult.lineProfile); // อาจไม่ถึงจุดนี้ถ้า page reload
}
```

**หลังแก้ไข:**
```typescript
try {
    console.log('[LiffLink] Starting initialization...');
    hasInitializedRef.current = true;
    // ไม่เรียก markSessionInitialized() ที่นี่แล้ว
    setState(prev => ({ ...prev, status: 'initializing', error: null }));

    // ... ทำ OAuth flow และดึงข้อมูล profile ...

    // เรียก markSessionInitialized() หลังจากบันทึก profile เรียบร้อยแล้ว
    saveLineProfile(verifyResult.lineProfile);
    markSessionInitialized(); // ✅ ตำแหน่งใหม่ที่ถูกต้อง!
}
```

### การแก้ไข #5: เพิ่ม Fallback Mechanism

เพิ่มกลไกสำรองสำหรับกรณีที่ไม่มี stored profile:

```typescript
// User not linked yet, show linking page
// Try to restore LINE profile from sessionStorage
const storedProfile = getStoredLineProfile();
console.log('[LiffLink] Restoring from storage, storedProfile:', storedProfile);
addDebugLog(`Stored profile: ${storedProfile ? storedProfile.displayName : 'null'}`);

// If no stored profile, we need to re-fetch it from LINE
if (!storedProfile) {
    console.log('[LiffLink] No stored profile, need to re-initialize to fetch profile');
    addDebugLog('No stored profile, re-initializing...');
    // Clear the session flag so we can re-initialize
    sessionStorage.removeItem(LIFF_INIT_KEY);
    hasInitializedRef.current = false;
    // Don't return - fall through to full initialization
} else {
    setState(prev => ({
        ...prev,
        status: 'not_linked',
        lineProfile: storedProfile,
    }));
    return;
}
```

---

## ไฟล์ที่แก้ไข

### 1. `frontend/src/components/layout/LiffLinkLayout.tsx`

**การเปลี่ยนแปลง:**
- เพิ่ม `LIFF_PROFILE_KEY` constant
- เพิ่ม `saveLineProfile()`, `getStoredLineProfile()`, `clearLineProfile()` functions
- ย้าย `markSessionInitialized()` ไปหลัง `saveLineProfile()`
- เพิ่ม fallback mechanism สำหรับกรณีไม่มี stored profile
- เพิ่ม console logs สำหรับ debugging
- เพิ่มการเรียก `clearLineProfile()` หลังจาก link สำเร็จ

**บรรทัดที่สำคัญ:**
- Line 82: เพิ่ม `LIFF_PROFILE_KEY` constant
- Lines 111-129: helper functions สำหรับจัดการ LINE profile
- Lines 142-156: fallback mechanism
- Line 224, 234, 278, 287: เพิ่ม `markSessionInitialized()` หลัง save profile
- Line 337, 378, 418: clear profile หลัง link สำเร็จ

### 2. `frontend/src/pages/liff/LiffLinkPage.tsx`

**การเปลี่ยนแปลง:**
- เพิ่ม debug section เพื่อแสดง LINE profile JSON

**บรรทัดที่สำคัญ:**
- Lines 130-138: debug info section

---

## Git Commits

### Commit 1: `92d4b04`
```
fix: persist LINE profile across page reloads in LIFF

Store LINE profile to sessionStorage so it displays correctly
after OAuth redirect page reloads. Profile is cleared after
successful account linking or on retry.
```

### Commit 2: `db07918`
```
debug: add LINE profile storage logging

Add console logs and debug display to track LINE profile
save/restore from sessionStorage to diagnose why profile
is not displaying after page reload.
```

### Commit 3: `e5cfd78`
```
fix: mark session initialized only after profile is saved

Move markSessionInitialized() to after saveLineProfile() to
ensure profile data is in sessionStorage before marking the
session as initialized. This prevents race condition where
page reload happens between marking initialized and saving
the profile.
```

---

## ผลลัพธ์

✅ **ปัญหาได้รับการแก้ไขสำเร็จ**

การทำงานหลังจากแก้ไข:

1. User เปิด LIFF Link page ใน LINE app
2. LIFF SDK ทำ initialization และ OAuth flow
3. ได้รับ LINE profile จาก backend verification
4. **บันทึก profile ลง sessionStorage ทันที**
5. **จากนั้นจึง mark session เป็น initialized**
6. ถ้า page reload (เช่นจาก OAuth redirect):
   - ตรวจสอบ session initialized = true
   - ดึง LINE profile จาก sessionStorage
   - แสดงชื่อและรูปโปรไฟล์ได้ถูกต้อง

---

## บทเรียนที่ได้เรียนรู้

### 1. Race Condition ใน Async Operations
- **ปัญหา:** การ mark state ก่อนที่ data จะพร้อม
- **วิธีแก้:** รอให้ข้อมูลพร้อมก่อน แล้วจึง mark state
- **หลักการ:** ต้องคิดถึง timing ของ page reload ระหว่าง async operations

### 2. sessionStorage vs localStorage
- **sessionStorage:** เหมาะสำหรับ temporary state ที่ต้องการให้หายไปเมื่อปิด tab/browser
- **localStorage:** เหมาะสำหรับ persistent data ที่ต้องการเก็บไว้นานๆ
- **ในกรณีนี้:** ใช้ sessionStorage เพราะ LINE profile ควรหายไปเมื่อปิด LIFF

### 3. Debug Strategy
- เพิ่ม console logs ในจุดสำคัญ
- แสดง debug output บนหน้าจอ (ใน development)
- ตรวจสอบ sessionStorage/localStorage ใน DevTools
- ติดตาม flow ของ async operations

### 4. LIFF Development Challenges
- **OAuth Redirects:** ทำให้เกิด page reload บ่อย
- **State Persistence:** ต้องใช้ storage API แทน React state
- **Axios vs Fetch:** Axios มีปัญหาใน LIFF environment บางครั้ง
- **Rate Limiting:** ต้องปิดระหว่าง development

---

## Cleanup Tasks (ทำในอนาคต)

### 1. ลบ Debug Code ออกจาก Production
- ลบ debug section จาก `LiffLinkPage.tsx` (lines 130-138)
- ลบหรือ conditional debug logs จาก `LiffLinkLayout.tsx`
- เก็บแค่ console.error() สำหรับ production

### 2. เพิ่ม Unit Tests
- Test `saveLineProfile()` และ `getStoredLineProfile()`
- Test fallback mechanism เมื่อไม่มี stored profile
- Mock sessionStorage สำหรับ testing

### 3. ปรับปรุง Error Handling
- จัดการกรณี sessionStorage เต็ม (quota exceeded)
- จัดการกรณี JSON parse error ที่ชัดเจนขึ้น
- เพิ่ม retry mechanism สำหรับ profile fetch ที่ล้มเหลว

### 4. Performance Optimization
- พิจารณาใช้ React Context แทนการอ่าน sessionStorage บ่อยๆ
- Cache LINE profile ใน memory ระหว่างใช้งาน
- Lazy load debug components

---

## เอกสารอ้างอิง

### LIFF Documentation
- [LINE LIFF SDK](https://developers.line.biz/en/docs/liff/overview/)
- [LINE Login OAuth 2.1](https://developers.line.biz/en/docs/line-login/integrate-line-login/)

### Web APIs
- [sessionStorage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage)
- [fetch() API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

### React Patterns
- [React useCallback Hook](https://react.dev/reference/react/useCallback)
- [React Context](https://react.dev/learn/passing-data-deeply-with-context)

---

## สรุป

การแก้ไขครั้งนี้สอนให้เราเข้าใจถึงความสำคัญของ **timing และ sequencing** ใน async operations โดยเฉพาะเมื่อมี page reload เกิดขึ้นระหว่างทาง

**Key Takeaway:** อย่า mark state เป็น "initialized" จนกว่าข้อมูลที่จำเป็นจะพร้อมและถูกบันทึกเรียบร้อยแล้ว

การแก้ไขทำให้ LIFF Account Linking flow ทำงานได้อย่างสมบูรณ์และแสดง LINE profile ได้ถูกต้องแล้ว ✨
