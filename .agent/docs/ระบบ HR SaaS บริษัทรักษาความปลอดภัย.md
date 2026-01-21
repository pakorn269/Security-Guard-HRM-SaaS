# **รายงานวิเคราะห์เชิงลึก: สถาปัตยกรรมระบบและตรรกะทางธุรกิจสำหรับแพลตฟอร์ม SaaS บริหารทรัพยากรบุคคลในอุตสาหกรรมความปลอดภัยไทย**

## **บทนำ: บริบทและความท้าทายของอุตสาหกรรมความปลอดภัยในประเทศไทย**

อุตสาหกรรมรักษาความปลอดภัยในประเทศไทยกำลังเผชิญกับจุดเปลี่ยนครั้งสำคัญที่ถูกขับเคลื่อนด้วยสามปัจจัยหลัก ได้แก่ การเปลี่ยนแปลงทางกฎหมายที่เข้มงวดขึ้นผ่านพระราชบัญญัติธุรกิจรักษาความปลอดภัย พ.ศ. 2558 (พ.ร.บ. ธภ.) การปฏิรูปโครงสร้างค่าแรงและค่าล่วงเวลาที่จะมีผลบังคับใช้ในปี 2569 และพลวัตของตลาดแรงงานที่มีอัตราการหมุนเวียนสูง การพัฒนาเว็บแอปพลิเคชันรูปแบบ Software-as-a-Service (SaaS) แบบ Multi-tenant สำหรับบริษัทรักษาความปลอดภัยจึงไม่ใช่เพียงการสร้างระบบบริหารทรัพยากรบุคคล (HRM) ทั่วไป แต่เป็นการสร้าง "ระบบปฏิบัติการทางธุรกิจ" (Business Operating System) ที่ต้องผสานตรรกะทางกฎหมาย การบริหารจัดการกำลังพลแบบเรียลไทม์ และความซับซ้อนของการคำนวณค่าตอบแทนเข้าไว้ด้วยกันอย่างแนบเนียน

รายงานฉบับนี้จะเจาะลึกถึงรายละเอียดเชิงเทคนิค ตรรกะการทำงาน (Business Logic) และหน้าที่ความรับผิดชอบ (Functional Roles) ของผู้ใช้งาน 3 กลุ่มหลัก ได้แก่ **ผู้ดูแลระบบของบริษัท (Company Admin)**, **ผู้จัดการฝ่ายปฏิบัติการ/สายตรวจ (Manager/Inspector)**, และ **เจ้าหน้าที่รักษาความปลอดภัย (Security Guard)** โดยอ้างอิงข้อมูลจากกฎหมายแรงงานไทย มาตรฐานการปฏิบัติงาน (SOP) และแนวโน้มเทคโนโลยีในปัจจุบัน เพื่อให้เป็นแนวทางที่สมบูรณ์ที่สุดสำหรับการพัฒนาระบบ

## ---

**ส่วนที่ 1: สถาปัตยกรรมข้อมูลและบริบททางกฎหมาย (Data Architecture & Legal Context)**

ก่อนที่จะลงลึกในตรรกะของผู้ใช้งานแต่ละประเภท จำเป็นต้องวางรากฐานของระบบให้สอดคล้องกับโครงสร้างทางกฎหมายและธุรกิจของไทย ซึ่งเป็น "กฎเกณฑ์" (Rules Engine) ที่จะกำกับการทำงานของซอฟต์แวร์ทั้งหมด

### **1.1 การปฏิบัติตามกฎหมายเป็นศูนย์กลางข้อมูล (Regulatory Compliance as Core Data Object)**

ภายใต้ พ.ร.บ. ธุรกิจรักษาความปลอดภัย พ.ศ. 2558 การประกอบธุรกิจนี้ไม่ใช่เสรี แต่ต้องอยู่ภายใต้การกำกับดูแลของสำนักงานตำรวจแห่งชาติ โดยมีเอกสารใบอนุญาตสำคัญสองประเภทที่ระบบต้องจัดการเสมือนเป็น "สินทรัพย์ข้อมูล" (Data Assets) ที่มีวันหมดอายุและสถานะทางกฎหมาย 1

1. **ใบอนุญาตประกอบธุรกิจรักษาความปลอดภัย (ธภ.2):** สำหรับนิติบุคคล มีอายุ 4 ปี  
2. **ใบอนุญาตพนักงานรักษาความปลอดภัยรับอนุญาต (ธภ.7):** สำหรับตัวบุคคล มีอายุ 3 ปี

นัยสำคัญต่อตรรกะของระบบ (Implication for System Logic):  
ในระบบ HR ทั่วไป สถานะพนักงานอาจมีเพียง "Active" หรือ "Terminated" แต่ในระบบนี้ สถานะ "Active" ต้องเป็นผลลัพธ์จากสมการตรวจสอบสิทธิ์ (Validation Equation):  
Employee\_Active\_Status \= (Employment\_Contract \== Valid) AND (License\_TorPhor7\_Status \== Valid) AND (Training\_Record \== Completed)

หากใบอนุญาต ธภ.7 หมดอายุ ระบบจะต้องเปลี่ยนสถานะพนักงานเป็น "Suspended" (ระงับการปฏิบัติหน้าที่) โดยอัตโนมัติในระดับ Rostering Engine เพื่อป้องกันไม่ให้ผู้จัดการจัดตารางงานให้ ซึ่งจะทำให้บริษัทเสี่ยงต่อโทษปรับทางอาญา 2

### **1.2 การเปลี่ยนแปลงโครงสร้างค่าล่วงเวลาปี 2569 (The 2026 Overtime Shift)**

ความท้าทายทางคณิตศาสตร์ที่สำคัญที่สุดสำหรับ Module เงินเดือน (Payroll) คือการเตรียมพร้อมสำหรับกฎกระทรวงฉบับใหม่ที่จะมีผลบังคับใช้ในเดือนเมษายน 2569 ซึ่งเปลี่ยนแปลงสูตรการคำนวณค่าล่วงเวลา (OT) สำหรับงานเฝ้าดูแลสถานที่โดยเฉพาะ 4

**ตารางเปรียบเทียบตรรกะการคำนวณค่าล่วงเวลา:**

| ประเภทการทำงาน | ตรรกะปัจจุบัน (Current Logic) | ตรรกะใหม่ (เม.ย. 2569\) (New 2026 Logic) |
| :---- | :---- | :---- |
| **OT วันทำงานปกติ** (ชั่วโมงที่ 9 เป็นต้นไป) | 1.5 เท่า ของค่าจ้างรายชั่วโมง | **1.25 เท่า** ของค่าจ้างรายชั่วโมง |
| **OT วันหยุด** (ชั่วโมงที่ 9 เป็นต้นไป) | 3.0 เท่า ของค่าจ้างรายชั่วโมง | **2.5 เท่า** ของค่าจ้างรายชั่วโมง |
| **ทำงานในวันหยุด** (8 ชั่วโมงแรก) | 2.0 เท่า (สำหรับพนักงานรายวัน) | 2.0 เท่า (คงเดิมตาม ม.62 พ.ร.บ. คุ้มครองแรงงาน) |
| **เพดานชั่วโมงทำงาน** | ไม่เกิน 36 ชม./สัปดาห์ (ทั่วไป) | ไม่เกิน **48 ชม./สัปดาห์** (เฉพาะ รปภ.) |

ตรรกะทางธุรกิจที่ต้องการ (Required Business Logic):  
ระบบ Payroll ไม่สามารถ Hard-code ตัวคูณ (Multiplier) ได้ แต่ต้องออกแบบเป็น "Temporal Rule Engine" (ระบบกฎที่ขึ้นกับช่วงเวลา) โดยระบบต้องตรวจสอบวันที่ของกะทำงาน (Shift Date) ว่าเกิดขึ้นก่อนหรือหลังวันที่กฎหมายบังคับใช้ เพื่อเลือกสูตรคำนวณที่ถูกต้อง โดยเฉพาะในช่วงรอยต่อ (Transition Period) ที่รอบการจ่ายเงินเดือนอาจคร่อมช่วงเวลาที่มีการเปลี่ยนแปลงกฎหมาย

## ---

**ส่วนที่ 2: บทบาทและตรรกะการทำงานของ Company Admin**

**Company Admin** ในบริบทของ SaaS นี้คือเจ้าของบริษัทรักษาความปลอดภัย หรือ ผู้อำนวยการฝ่ายบริหารจัดการ (Director of Operations) บทบาทหลักคือการเป็น **"Architect"** ผู้กำหนดโครงสร้าง กฎระเบียบ และการควบคุมต้นทุนกำไรขององค์กร ตรรกะการทำงานในส่วนนี้จะเน้นไปที่การตั้งค่า Master Data และการบริหารสัญญาจ้าง

### **2.1 การจัดการโครงสร้างองค์กรและลำดับชั้น (Organizational Hierarchy Logic)**

บริษัทรักษาความปลอดภัยในไทยมีโครงสร้างแบบกึ่งทหาร (Para-military Structure) ระบบต้องรองรับการกำหนดชั้นยศ (Rank) ที่ผูกพันกับโครงสร้างค่าตอบแทนและสิทธิการเข้าถึง 5

**ฟังก์ชันงานและตรรกะ:**

* **Rank Configuration (การกำหนดชั้นยศ):** Admin ต้องสามารถสร้างลำดับชั้นได้ เช่น พนักงาน รปภ. (Security Guard) \-\> หัวหน้าชุด (Shift Leader/Sergeant) \-\> สายตรวจ (Patrol Inspector) \-\> ผู้จัดการโซน (Zone Commander)  
  * *Logic:* แต่ละ Rank จะต้องถูก map เข้ากับ Base\_Wage\_Structure (เช่น รายวัน หรือ รายเดือน) และ Allowance\_Entitlements (ค่าตำแหน่ง, ค่าพาหนะ)  
* **Site/Contract Setup (การตั้งค่าหน่วยงาน/สัญญา):** นี่คือหัวใจของการทำรายได้  
  * *Input Data:* ชื่อลูกค้า, ที่ตั้ง (พิกัด GPS สำหรับ Geofencing), วันที่เริ่ม-สิ้นสุดสัญญา, อัตราค่าบริการ (Billing Rate)  
  * *Billing Logic Flexibility:* ระบบต้องรองรับโมเดลรายได้สองแบบหลักที่พบในไทย:  
    1. **Headcount Billing:** คิดเงินตามจำนวนคน เช่น (จำนวนกะ Day x อัตรา) \+ (จำนวนกะ Night x อัตรา)  
    2. **Lump Sum Billing:** คิดเหมาจ่ายรายเดือน แต่ต้องมีการหักเงิน (Credit Note) หากจัดกำลังคนไม่ครบตามสัญญา (Manpower Shortfall Deduction)  
  * *Manpower Requirement Constraint:* Admin ต้องกำหนด "อัตรากำลังขั้นต่ำ" (Minimum Manning Level) ต่อหน่วยงาน เช่น "กลางวัน 3 นาย, กลางคืน 3 นาย" ข้อมูลนี้จะถูกส่งต่อไปยัง Rostering Engine เพื่อใช้เป็น *Hard Constraint* ในการจัดตารางเวร ห้ามผู้จัดการจัดคนต่ำกว่าเกณฑ์นี้เว้นแต่จะมีการ Override 6

### **2.2 ระบบบริหารจัดการความสอดคล้องทางกฎหมาย (Compliance & Tor Phor Engine)**

Admin จำเป็นต้องมี Dashboard ที่แสดงสถานะความเสี่ยงทางกฎหมายของทั้งบริษัท

**ตรรกะการแจ้งเตือนและกระบวนการ (Notification Logic & Workflow):**

1. **Company License Renewal (ธภ.2):** ระบบต้องมีตัวนับถอยหลัง (Countdown Timer) สำหรับใบอนุญาตบริษัท โดยแจ้งเตือนล่วงหน้า 180 วัน เพื่อให้ Admin เตรียมงบการเงินและเอกสาร บอจ.5 ตามกฎกระทรวง 7  
2. **Guard License Expiry Watchlist (ธภ.7):**  
   * *Query:* SELECT \* FROM Employees WHERE License\_Expiry\_Date \<= (CURRENT\_DATE \+ 60 Days)  
   * *Action:* สร้าง "Batch Renewal List" เพื่อให้ฝ่ายธุรการดำเนินการยื่นต่ออายุที่กองบัญชาการตำรวจนครบาลหรือภูธรจังหวัด  
   * *Risk Control:* หากใบอนุญาตหมดอายุแล้ว ระบบจะ Lock ไม่ให้จ่ายงาน (Dispatch) ให้กับ รปภ. คนนั้น จนกว่าจะมีการอัปเดตเลขใบอนุญาตใหม่  
3. **Blacklist Check:** ระบบควรมีฟังก์ชัน (หรือ API Integration) เพื่อตรวจสอบประวัติอาชญากรรมหรือ Blacklist ภายในบริษัทเครือข่าย เพื่อป้องกันการรับพนักงานที่มีประวัติทุจริตกลับเข้าทำงานซ้ำ 9

### **2.3 การกำหนดโครงสร้างค่าตอบแทนและสวัสดิการ (Compensation & Benefits Logic)**

ความซับซ้อนของค่าแรง รปภ. ไทยอยู่ที่ "เงินเพิ่ม" และ "เงินหัก" ต่างๆ

**ตรรกะการคำนวณ (Calculation Logic):**

* **เบี้ยขยัน (Diligence Allowance):** ตรรกะต้องตรวจสอบเงื่อนไขแบบ *Boolean Chain*:IF (Late\_Count \== 0\) AND (Absent\_Count \== 0\) AND (Leave\_Count \== 0\) THEN Award \= 500 THB ELSE Award \= 0  
* **เงินหักค้ำประกัน/ค่าชุด (Guarantee/Uniform Deduction):** ตามกฎหมายแรงงาน การหักเงินต้องไม่เกิน 10% ของค่าจ้าง หรือตามที่กฎหมายกำหนด  
  * *System Guardrail:* ระบบต้องมี Validation Rule ป้องกันไม่ให้ Admin ตั้งค่าการหักเงินต่องวดสูงเกินเพดานกฎหมาย 10  
* **Salary Advance Configuration (การเบิกเงินล่วงหน้า):** Admin เป็นผู้กำหนดนโยบาย (Policy Maker) ว่าพนักงานสามารถเบิกเงินล่วงหน้าได้กี่เปอร์เซ็นต์ของค่าแรงที่ทำไปแล้ว (Earned Wage Access) เพื่อช่วยแก้ปัญหาหนี้นอกระบบและลดอัตราการลาออก 11

### **2.4 การวิเคราะห์กำไรขั้นต้นรายหน่วยงาน (Site Profitability Analysis)**

Admin ต้องการทราบว่าหน่วยงานไหน "กำไร" หรือ "ขาดทุน"

**Formula Logic:**

Gross\_Margin \= (Contract\_Revenue) \- (Sum(Guard\_Wages) \+ Sum(OT\_Cost) \+ SSO\_Contribution \+ Uniform\_Cost \+ Equipment\_Depreciation)

ระบบต้องดึงข้อมูลจากโมดูล Payroll และ Contract มาคำนวณแบบ Real-time เพื่อให้ Admin ตัดสินใจได้ว่าควรต่อสัญญาหรือไม่หาก Margin ต่ำเกินไปเนื่องจากค่าแรง OT สูง

## ---

**ส่วนที่ 3: บทบาทและตรรกะการทำงานของ Manager (Operations/Inspector)**

**Manager** ในที่นี้ครอบคลุมถึง ผู้จัดการฝ่ายปฏิบัติการ, หัวหน้าโซน, และสายตรวจ (Inspector) บทบาทหลักคือ **"Execution & Monitoring"** หรือการควบคุมให้การปฏิบัติงานหน้างานเป็นไปตามสัญญาจ้าง

### **3.1 อัลกอริทึมการจัดตารางเวรและกำลังพล (Rostering & Scheduling Logic)**

นี่คือฟังก์ชันที่ซับซ้อนที่สุดสำหรับ Manager เนื่องจากต้องบริหารจัดการคนที่มีจำกัดให้ครอบคลุมพื้นที่ 24 ชั่วโมง โดยไม่ผิดกฎหมายแรงงาน

**ตรรกะการจัดตาราง (Scheduling Algorithm):**

1. **Shift Pattern Definition:** ระบบต้องรองรับกะมาตรฐานของไทย เช่น  
   * **2 กะ (12 ชม.):** 07:00-19:00 (Day) / 19:00-07:00 (Night) 13  
   * **3 กะ (8 ชม.):** (น้อยกว่า แต่ใช้ในโรงงานบางแห่ง)  
2. **Constraint Satisfaction (การตรวจสอบข้อจำกัด):** เมื่อ Manager ลากวาง (Drag & Drop) พนักงานลงในกะ ระบบต้องรัน Validation Logic ทันที:  
   * *Fatigue Check:* ห้ามลงเวรต่อเนื่องเกิน 12 ชั่วโมง หรือ ควบกะ (Double Shift) 24 ชั่วโมง ซึ่งเสี่ยงต่อความปลอดภัยและผิดกฎหมาย 14  
   * *Qualification Check:* หน่วยงานนี้ต้องการ รปภ. ชาย สูง 170 ซม.+ (ระบบต้องเช็ค Profile Tag)  
   * *Overtime Cap:* เตือนหากชั่วโมงรวมต่อสัปดาห์เกิน 48 ชม. (ตามกฎหมายใหม่ปี 2569\)  
3. **Rotation Logic (การหมุนเวียน):** ระบบควรแนะนำแพทเทิร์นการหมุนเวียนแบบ "Forward Rotation" (เช้า \-\> บ่าย \-\> ดึก \-\> หยุด) เพื่อรักษาสุขภาพการนอนของพนักงาน 15

### **3.2 กระบวนการจัดการกำลังพลทดแทน (Substitution/Relief Workflow)**

ปัญหาที่พบบ่อยที่สุดคือ "รปภ. ขาดลามาช้า" ระบบต้องมี **"Automated Relief Protocol"**

**ตรรกะการทำงาน (Workflow Logic):**

1. **Trigger:** ระบบตรวจพบว่า "ไม่มีการ Check-in" ภายใน 15 นาทีหลังเริ่มกะ (เช่น 07:15 น.)  
2. **Alert:** แจ้งเตือน Manager ทันทีผ่าน Mobile App / LINE OA ว่า "Site A: Missing Guard"  
3. **Recommendation Engine:** ระบบค้นหาจาก Database "Relief Pool" (พนักงานหน่วยแทน/สแปร์) 6  
   * *Filter Logic:* Status \== Available AND Distance\_To\_Site \< 20 KM AND Skill\_Level \>= Required  
4. **Dispatch:** Manager กดปุ่ม "Request" ระบบส่ง Notification ไปหา รปภ. หน่วยแทน เพื่อกดรับงาน (Accept Job) เหมือนแอปพลิเคชันไรเดอร์

### **3.3 ระบบตรวจการณ์ดิจิทัล (Digital Guard Tour & Inspection)**

Manager (สายตรวจ) ต้องออกตรวจตามหน่วยงานเพื่อควบคุมคุณภาพ (QC)

**ตรรกะและฟังก์ชัน:**

* **Dynamic Checklist:** Admin สร้าง Template แบบฟอร์มตรวจการณ์ (เช่น ตรวจเครื่องแต่งกาย, ตรวจอุปกรณ์ดับเพลิง)  
  * *Logic:* เมื่อ Manager ไปถึงหน่วยงาน ระบบจะปลดล็อกแบบฟอร์มให้กรอกได้ก็ต่อเมื่อ GPS\_Location match Site\_Coordinates เท่านั้น เพื่อป้องกันการ "ตรวจทิพย์" (นั่งอยู่ออฟฟิศแต่กดส่งรายงาน)  
* **Scoring System:** การให้คะแนนแต่ละหัวข้อ (เช่น ผมยาว \= \-5 คะแนน, หลับเวร \= \-50 คะแนน)  
  * *Result:* คะแนนรวมจะถูกบันทึกเป็น KPI ของทั้ง รปภ. ประจำจุดนั้นและ KPI ของ Manager เอง  
  * *Evidence:* หากมีการตัดคะแนน ระบบต้องบังคับให้ถ่ายรูป (Mandatory Photo Proof) 17

### **3.4 การบริหารจัดการเหตุฉุกเฉิน (Incident Management State Machine)**

เมื่อเกิดเหตุ (ไฟไหม้, ขโมย, ทะเลาะวิวาท) Manager คือผู้บัญชาการเหตุการณ์

**ตรรกะสถานะงาน (State Logic):**

New (Reported by Guard) \-\> Acknowledged (by Manager) \-\> Investigating \-\> Report Filed (PDF Generated) \-\> Closed

ระบบต้องติดตาม SLA (Service Level Agreement) เช่น หากเป็นเหตุ "ระดับวิกฤต" (Critical) แล้ว Manager ไม่กด Acknowledge ภายใน 15 นาที ระบบจะ Escalate แจ้งเตือนไปยัง Company Admin ทันที 19

## ---

**ส่วนที่ 4: บทบาทและตรรกะการทำงานของ Security Guard**

**Security Guard** คือผู้ใช้งานที่มีจำนวนมากที่สุด แต่มีความถนัดทางเทคโนโลยีน้อยที่สุด (Low Tech Literacy) การออกแบบ UX/UI ต้องเน้นความง่าย (Big Buttons, Icon-based) และอาจใช้ LINE OA Integration เพื่อลดความยุ่งยากในการติดตั้งแอป 20 หน้าที่หลักคือ **"Data Origination"** หรือการสร้างข้อมูลดิบเข้าระบบ

### **4.1 การลงเวลาเข้า-ออกงาน (Attendance & Access Control)**

ข้อมูลนี้คือ "สินค้า" ที่บริษัทขายให้ลูกค้า (Proof of Presence)

**ตรรกะการตรวจสอบ (Validation Logic):**

1. **Geofencing:** ปุ่ม "เข้างาน" (Clock In) จะกดไม่ได้ถ้า Distance(Device, Site) \> 50 meters  
2. **Liveness Detection:** เพื่อป้องกันการฝากเพื่อนลงเวลา (Buddy Punching) ระบบอาจบังคับให้ถ่ายรูป Selfie  
   * *AI Logic:* ใช้ Face Recognition API เปรียบเทียบรูป Selfie กับรูปในฐานข้อมูลพนักงาน หรือใช้การตรวจสอบพิกัดร่วมกับ Device ID 20  
3. **Shift Handover Protocol (การรับ-ส่งเวร):** ก่อนกดเข้างาน รปภ. ผลัดใหม่ต้องกด "รับทราบ" ข้อมูลจากผลัดเก่า (เช่น "ประตูหลังชำรุด", "มีรถ VIP จอดค้างคืน") ซึ่งถูกบันทึกไว้ใน Digital Logbook 21

### **4.2 การลาดตระเวนดิจิทัล (Digital Patrol / Guard Tour)**

แทนที่จะใช้นาฬิกายาม (Guard Tour Wand) แบบเก่า ให้ใช้สมาร์ทโฟนสแกน QR Code หรือ NFC Tag ที่ติดไว้ตามจุดต่างๆ

**ตรรกะการทำงาน (Patrol Logic):**

* **Sequence Logic:** Admin กำหนดเส้นทาง A \-\> B \-\> C \-\> D  
* **Timing Constraints:**  
  * *Min Time:* ห้ามเดินเร็วกว่ากำหนด (ป้องกันการวิ่งผ่านๆ)  
  * *Max Time:* ห้ามเดินช้ากว่ากำหนด (ป้องกันการอู้งานระหว่างทาง)  
  * *Logic:* IF (Time\_B \- Time\_A) \> 15 Minutes THEN Alert\_Manager("Loitering Detected") 23  
* **Offline Capability:** เนื่องจากจุดตรวจมักอยู่ชั้นใต้ดินหรือมุมอับสัญญาณ แอปต้องออกแบบด้วยสถาปัตยกรรม **"Offline-First"** คือบันทึกข้อมูลและ Timestamp ลง Local Database (SQLite/Realm) ก่อน แล้วค่อย Sync ขึ้น Server เมื่อมีสัญญาณอินเทอร์เน็ต เพื่อป้องกันข้อมูลสูญหาย 24

### **4.3 สวัสดิการและการเงิน (Financial Well-being)**

เพื่อแก้ปัญหาการหมุนเงินไม่ทัน ซึ่งเป็นสาเหตุหลักของการลาออกและการทุจริต

**ฟังก์ชันและตรรกะ:**

* **Salary Advance (เบิกเงินล่วงหน้า):** ระบบคำนวณรายได้สะสมรายวัน (Accrued Income)  
  * *Logic:* Withdrawable\_Amount \= (Days\_Worked \* Daily\_Wage) \* %\_Policy\_Limit  
  * *Process:* รปภ. กดขอเบิก \-\> ระบบตรวจสอบวงเงิน \-\> อนุมัติอัตโนมัติ (หรือผ่าน Manager) \-\> เชื่อมต่อ API ธนาคารเพื่อโอนเงิน \-\> ระบบบันทึกรายการหักเงิน (Deduction) รอไว้สำหรับรอบจ่ายเงินเดือนสิ้นเดือน 11

### **4.4 การรายงานเหตุและขอความช่วยเหลือ (Incident Reporting & SOS)**

* **SOS Panic Button:** ปุ่มแดงขนาดใหญ่สำหรับเหตุด่วน  
  * *Action:* ส่งพิกัด GPS \+ สัญญาณเสียง ไปยังศูนย์ควบคุม (Command Center) และมือถือ Manager ทันที  
* **Incident Form:** แบบฟอร์มรายงานเหตุแบบง่าย เน้นการถ่ายรูปและอัดเสียง (Voice Note) แทนการพิมพ์ข้อความยาวๆ เพื่อความสะดวกรวดเร็วและลดข้อผิดพลาดทางภาษา 19

## ---

**ส่วนที่ 5: การคำนวณเงินเดือนขั้นสูง (Advanced Payroll Computation Engine)**

หัวใจสำคัญที่ทำให้ระบบนี้แตกต่างจาก HR ทั่วไป คือความสามารถในการรองรับความซับซ้อนของค่าแรง รปภ. ไทย

### **5.1 รายละเอียดสูตรการคำนวณ (Detailed Calculation Formulas)**

ระบบต้องรองรับตัวแปร (Variables) ดังนี้:

| ตัวแปร (Variable) | คำอธิบาย (Description) | สูตร/เงื่อนไข (Logic/Condition) |
| :---- | :---- | :---- |
| **Working\_Days** | จำนวนวันทำงานปกติ | Count(Shift\_Normal) |
| **Public\_Holiday\_Work** | จำนวนวันทำงานในวันหยุด | Count(Shift\_Holiday) |
| **OT\_Normal\_Hrs** | ชั่วโมง OT วันปกติ | Sum(Hours \> 8\) WHERE Date\!= Holiday |
| **OT\_Holiday\_Hrs** | ชั่วโมง OT วันหยุด | Sum(Hours \> 8\) WHERE Date \== Holiday |
| **Total\_Deduction** | รวมเงินหัก | SSO \+ Tax \+ Uniform \+ Advance\_Payment \+ Lateness\_Fine |
| **Net\_Salary** | เงินเดือนสุทธิ | (Base\_Pay \+ OT\_Pay \+ Allowances) \- Total\_Deduction |

ตรรกะการคำนวณ OT ช่วงเปลี่ยนผ่าน (Transition Logic):  
ระบบต้องตรวจสอบวันที่ของแต่ละกะ (Shift Date) เทียบกับ "Effective Date" ของกฎหมายใหม่ (เมษายน 2569\)

Python

\# Pseudo-code logic for OT Calculation  
def calculate\_ot\_pay(shift\_date, hours\_worked, hourly\_rate):  
    ot\_hours \= max(0, hours\_worked \- 8)  
    if ot\_hours \== 0:  
        return 0

    is\_holiday \= check\_if\_holiday(shift\_date)  
      
    \# 2026 Regulation Logic Switch  
    if shift\_date \>= date(2026, 4, 1):  
        rate\_multiplier \= 2.5 if is\_holiday else 1.25  
    else:  
        rate\_multiplier \= 3.0 if is\_holiday else 1.5

    return ot\_hours \* hourly\_rate \* rate\_multiplier

### **5.2 การนำส่งประกันสังคม (Social Security Submission)**

ระบบต้องคำนวณเงินสมทบกองทุนประกันสังคม (SSO) โดยอัตโนมัติ:

* **Logic:** Contribution \= Min(Base\_Salary, 15000\) \* 0.05  
* **Floor:** ฐานเงินเดือนขั้นต่ำในการคำนวณคือ 1,650 บาท  
* **Output:** ระบบต้อง Export ไฟล์ในรูปแบบ **SPS 1-10 (สปส. 1-10)** เพื่อให้ Admin อัปโหลดเข้าสู่ระบบ e-Service ของสำนักงานประกันสังคมได้ทันที 26

## ---

**ส่วนที่ 6: บทสรุปและข้อเสนอแนะเชิงกลยุทธ์ (Conclusion & Strategic Recommendations)**

การพัฒนา Multi-tenant HRM SaaS สำหรับบริษัทรักษาความปลอดภัยในไทย ไม่ใช่เพียงการสร้างเครื่องมือบันทึกเวลา แต่เป็นการสร้าง **"ระบบนิเวศการบริหารจัดการความเสี่ยงและประสิทธิภาพ" (Risk & Efficiency Management Ecosystem)** ความสำเร็จของแพลตฟอร์มนี้ขึ้นอยู่กับความแม่นยำในการตีความกฎระเบียบ (เช่น พ.ร.บ. ธภ. และ กฎกระทรวงแรงงานปี 2569\) มาเป็นตรรกะทางคอมพิวเตอร์ที่แม่นยำ

**ข้อเสนอแนะหลักสำหรับการพัฒนา:**

1. **Prioritize Compliance:** ให้ความสำคัญสูงสุดกับระบบแจ้งเตือนใบอนุญาตและการคำนวณ OT ที่ถูกต้องตามกฎหมายใหม่ เพราะนี่คือจุดเจ็บปวด (Pain Point) ที่ใหญ่ที่สุดของเจ้าของกิจการ  
2. **Mobile-First for Guards:** ออกแบบแอปฝั่ง รปภ. ให้ใช้งานง่ายที่สุด รองรับการทำงานแบบ Offline และอาจพิจารณาการเชื่อมต่อผ่าน LINE OA เพื่อลดแรงต้านในการใช้งาน  
3. **Data-Driven Operations:** ใช้ข้อมูลจาก Digital Patrol และ Time Attendance มาวิเคราะห์เพื่อหา "กำไรที่แท้จริง" ของแต่ละหน่วยงาน (Site Profitability) เพื่อให้ Admin ตัดสินใจเชิงกลยุทธ์ได้แม่นยำขึ้น

ด้วยสถาปัตยกรรมและตรรกะที่นำเสนอนี้ ระบบ SaaS จะสามารถตอบโจทย์ความต้องการที่ซับซ้อนของอุตสาหกรรมรักษาความปลอดภัยไทยได้อย่างครบถ้วน ช่วยยกระดับมาตรฐานการบริการและคุณภาพชีวิตของบุคลากรในอุตสาหกรรมนี้ได้อย่างยั่งยืน

#### **Works cited**

1. Security Industry Business Act, accessed January 21, 2026, [https://www.bccthai.com/asp/view\_doc.asp?DocCID=2858](https://www.bccthai.com/asp/view_doc.asp?DocCID=2858)  
2. Thailand's Security Business Act 2016: Are You Good Men and True? \- Tilleke & Gibbins, accessed January 21, 2026, [https://www.tilleke.com/insights/thailands-security-business-act-2016-are-you-good-men-and-true/](https://www.tilleke.com/insights/thailands-security-business-act-2016-are-you-good-men-and-true/)  
3. ธภ.7 คืออะไร? ใบอนุญาตพนักงานรักษาความปลอดภัยรับอนุญาต \- bodyguard vip thailand, accessed January 21, 2026, [https://www.bodyguardvipthailand.com/blog/5966/%E0%B8%98%E0%B8%A07-%E0%B8%84%E0%B8%B7%E0%B8%AD%E0%B8%AD%E0%B8%B0%E0%B9%84%E0%B8%A3-%E0%B9%83%E0%B8%9A%E0%B8%AD%E0%B8%99%E0%B8%B8%E0%B8%8D%E0%B8%B2%E0%B8%95%E0%B8%9E%E0%B8%99%E0%B8%B1%E0%B8%81%E0%B8%87%E0%B8%B2%E0%B8%99%E0%B8%A3%E0%B8%B1%E0%B8%81%E0%B8%A9%E0%B8%B2%E0%B8%84%E0%B8%A7%E0%B8%B2%E0%B8%A1%E0%B8%9B%E0%B8%A5%E0%B8%AD%E0%B8%94%E0%B8%A0%E0%B8%B1%E0%B8%A2%E0%B8%A3%E0%B8%B1%E0%B8%9A%E0%B8%AD%E0%B8%99%E0%B8%B8%E0%B8%8D%E0%B8%B2%E0%B8%95](https://www.bodyguardvipthailand.com/blog/5966/%E0%B8%98%E0%B8%A07-%E0%B8%84%E0%B8%B7%E0%B8%AD%E0%B8%AD%E0%B8%B0%E0%B9%84%E0%B8%A3-%E0%B9%83%E0%B8%9A%E0%B8%AD%E0%B8%99%E0%B8%B8%E0%B8%8D%E0%B8%B2%E0%B8%95%E0%B8%9E%E0%B8%99%E0%B8%B1%E0%B8%81%E0%B8%87%E0%B8%B2%E0%B8%99%E0%B8%A3%E0%B8%B1%E0%B8%81%E0%B8%A9%E0%B8%B2%E0%B8%84%E0%B8%A7%E0%B8%B2%E0%B8%A1%E0%B8%9B%E0%B8%A5%E0%B8%AD%E0%B8%94%E0%B8%A0%E0%B8%B1%E0%B8%A2%E0%B8%A3%E0%B8%B1%E0%B8%9A%E0%B8%AD%E0%B8%99%E0%B8%B8%E0%B8%8D%E0%B8%B2%E0%B8%95)  
4. New Ministerial Regulations on Overtime Payment for Security ..., accessed January 21, 2026, [https://pkfthailand.asia/new-ministerial-regulations-on-overtime-payment-for-security-guard-work-effective-2026/](https://pkfthailand.asia/new-ministerial-regulations-on-overtime-payment-for-security-guard-work-effective-2026/)  
5. Understanding Security Guard Levels (Security Guard Ranks), accessed January 21, 2026, [https://www.securityguardtrainingcentral.com/understanding-security-guard-levels-security-guard-ranks/](https://www.securityguardtrainingcentral.com/understanding-security-guard-levels-security-guard-ranks/)  
6. How Many Security Guards Do You Actually Need? A Practical Guide for Offices, Hotels & Warehouses, accessed January 21, 2026, [https://blackdragonsecurity.com/2025/11/17/how-many-security-guards-do-you-need/](https://blackdragonsecurity.com/2025/11/17/how-many-security-guards-do-you-need/)  
7. Renewing and Maintaining Your Business Registration in Thailand \- Siamese, accessed January 21, 2026, [https://siamese-legal.com/renewing-and-maintaining-your-business-registration-in-thailand/](https://siamese-legal.com/renewing-and-maintaining-your-business-registration-in-thailand/)  
8. Translation MINISTERIAL REGULATION AUTHORIZING SECURITY ..., accessed January 21, 2026, [https://www.royalthaipolice.go.th/downloads/laws/laws\_05\_05.pdf](https://www.royalthaipolice.go.th/downloads/laws/laws_05_05.pdf)  
9. The Leading Company in Thailand for Professional Security \- Guardforce, accessed January 21, 2026, [https://www.guardforce.co.th/en/our-company](https://www.guardforce.co.th/en/our-company)  
10. Labor Protection Act: Wages (Sections 53-65) \- Thailand Law Library, accessed January 21, 2026, [https://library.siam-legal.com/thai-law/labor-protection-act-wages-sections-53-65/](https://library.siam-legal.com/thai-law/labor-protection-act-wages-sections-53-65/)  
11. Salary Hero \- Financial Health Platform for Employees, accessed January 21, 2026, [https://www.salary-hero.com/](https://www.salary-hero.com/)  
12. Financial Health Platform for Employees \- Salary Hero, accessed January 21, 2026, [https://www.salary-hero.com/th/](https://www.salary-hero.com/th/)  
13. Thailand Working Hours & Overtime Regulations, accessed January 21, 2026, [https://www.playroll.com/working-hours/thailand](https://www.playroll.com/working-hours/thailand)  
14. Legal Analysis of Overtime Pay Issues Under the Two-Shift Work System in the Security Industry \- Oreate AI Blog, accessed January 21, 2026, [https://www.oreateai.com/blog/legal-analysis-of-overtime-pay-issues-under-the-twoshift-work-system-in-the-security-industry/fd716ee9ad99b6f05cdac2da66ffdaaf](https://www.oreateai.com/blog/legal-analysis-of-overtime-pay-issues-under-the-twoshift-work-system-in-the-security-industry/fd716ee9ad99b6f05cdac2da66ffdaaf)  
15. How to Schedule Security Guards for 24/7 Coverage \- myshyft.com, accessed January 21, 2026, [https://www.myshyft.com/blog/security-guard-scheduling/](https://www.myshyft.com/blog/security-guard-scheduling/)  
16. Effective scheduling techniques for security staff \- Mobohubb, accessed January 21, 2026, [https://mobohubb.com/blog/effective-scheduling-techniques-for-security-staff/](https://mobohubb.com/blog/effective-scheduling-techniques-for-security-staff/)  
17. Security Guard Inspection Checklist Template | Free Download \- Lumiform, accessed January 21, 2026, [https://lumiformapp.com/templates/security-guard-inspection-checklist\_34134](https://lumiformapp.com/templates/security-guard-inspection-checklist_34134)  
18. 04 ตำแหน่งพนักงานรักษาความปลอดภัย (แบบฟอร์มกลาง), accessed January 21, 2026, [https://person.pcru.ac.th/images/documents/04Form\_estimate-Security\_guard.docx](https://person.pcru.ac.th/images/documents/04Form_estimate-Security_guard.docx)  
19. Security Services in Thailand | Certified & 24/7 Monitoring | IFS, accessed January 21, 2026, [https://www.ifs-thailand.com/services/security-service/](https://www.ifs-thailand.com/services/security-service/)  
20. Top 10 Best HR Management Software For Thailand \- Yomly, accessed January 21, 2026, [https://www.yomly.com/best-hr-software-for-thailand/](https://www.yomly.com/best-hr-software-for-thailand/)  
21. 10 Standard Operating Procedures for Security Guards \- SOS, accessed January 21, 2026, [https://www.sos.co.id/en/news/standar-operasional-prosedur-satpam](https://www.sos.co.id/en/news/standar-operasional-prosedur-satpam)  
22. มาตรฐานงานรักษาความปลอดภัย, accessed January 21, 2026, [https://www.teerachaiguard.com/%E0%B8%A1%E0%B8%B2%E0%B8%95%E0%B8%A3%E0%B8%90%E0%B8%B2%E0%B8%99%E0%B8%87%E0%B8%B2%E0%B8%99%E0%B8%A3%E0%B8%B1%E0%B8%81%E0%B8%A9%E0%B8%B2%E0%B8%84%E0%B8%A7%E0%B8%B2%E0%B8%A1%E0%B8%9B%E0%B8%A5%E0%B8%AD/](https://www.teerachaiguard.com/%E0%B8%A1%E0%B8%B2%E0%B8%95%E0%B8%A3%E0%B8%90%E0%B8%B2%E0%B8%99%E0%B8%87%E0%B8%B2%E0%B8%99%E0%B8%A3%E0%B8%B1%E0%B8%81%E0%B8%A9%E0%B8%B2%E0%B8%84%E0%B8%A7%E0%B8%B2%E0%B8%A1%E0%B8%9B%E0%B8%A5%E0%B8%AD/)  
23. wac guard tour ระบบสแกนจุดตรวจออนไลน์ สำหรับตรวจสอบการทำงานของรปภ.และเจ้าหน้าที่ลาดตระเวน, accessed January 21, 2026, [https://www.wacinfotech.com/guardtour.html](https://www.wacinfotech.com/guardtour.html)  
24. Secure Checker: ลาดตระเวนไร้ขีดจำกัด ด้วยโหมดออฟไลน์ \- defensive hive, accessed January 21, 2026, [https://www.defensivehiveplatform.com/blog/secure-checker-new-feature-offline-mode](https://www.defensivehiveplatform.com/blog/secure-checker-new-feature-offline-mode)  
25. โปรแกรมรักษาความปลอดภัยคอนโดและหมู่บ้าน GuardOS \- The LivingOS, accessed January 21, 2026, [https://www.thelivingos.com/security\_guardos/](https://www.thelivingos.com/security_guardos/)  
26. Employer of Record Thailand | Hire in Thailand \- BIPO EOR, accessed January 21, 2026, [https://www.biposervice.com/global-hiring-guide/thailand/](https://www.biposervice.com/global-hiring-guide/thailand/)