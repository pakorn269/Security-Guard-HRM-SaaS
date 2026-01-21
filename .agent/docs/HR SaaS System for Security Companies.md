# **In-Depth Analysis: System Architecture & Business Logic for HRM SaaS in the Thai Security Industry**

## **Introduction: Context and Challenges**

The security industry in Thailand is currently navigating a significant transition driven by three primary factors: stricter regulatory compliance under the **Security Business Act B.E. 2558 (2015)**, the upcoming restructuring of overtime compensation effective in **April 2026**, and the high turnover dynamics of the labor market. Developing a Multi-tenant SaaS for this sector requires more than standard HR functionality; it demands a **"Business Operating System"** that seamlessly integrates legal logic, real-time workforce management, and complex compensation algorithms.1

This report details the technical specifications, **Business Logic**, and **Functional Roles** for three key user groups: **Company Admin**, **Manager/Inspector**, and **Security Guard**, supported by English-language resources and regulatory references.

## ---

**Part 1: Data Architecture & Legal Context**

Before defining user roles, the system's foundation must be aligned with Thailand's legal and business structure, acting as the "Rules Engine" governing the software.

### **1.1 Regulatory Compliance as Core Data Object**

Under the Security Business Act 2015 (Tor Phor), the industry is regulated by the Royal Thai Police. The system must manage two critical license types as "Data Assets" with specific expiration dates and legal statuses 1:

1. **Security Business License (Tor Phor 2):** For the legal entity (Company), valid for 4 years.  
2. **Authorized Security Guard License (Tor Phor 7):** For the individual, valid for 3 years.

Implication for System Logic:  
Unlike standard HR systems where status is simply "Active" or "Terminated," the "Active" status in this system must be the result of a validation equation:  
Employee\_Active\_Status \= (Employment\_Contract \== Valid) AND (License\_TorPhor7\_Status \== Valid) AND (Training\_Record \== Completed)

If a *Tor Phor 7* license expires, the system must automatically change the employee's status to "Suspended" within the **Rostering Engine** to prevent illegal shift assignment, which carries criminal penalties for the company.

### **1.2 The 2026 Overtime Shift (New Ministerial Regulation)**

The most significant mathematical challenge for the **Payroll Module** is the new Ministerial Regulation published in 2025, which becomes effective in **April 2026**. This regulation drastically changes the Overtime (OT) calculation specifically for security work.3

**Comparison of Overtime Logic:**

| Work Type | Current Logic | New Logic (Effective April 2026\) |
| :---- | :---- | :---- |
| **OT on Normal Days** (Hours \> 8\) | 1.5x Hourly Rate | **1.25x** Hourly Rate |
| **OT on Holidays** (Hours \> 8\) | 3.0x Hourly Rate | **2.5x** Hourly Rate |
| **Work on Holidays** (First 8 Hours) | 2.0x (Daily workers) | 2.0x (Unchanged per Labor Protection Act Sec. 62\) |
| **Working Hour Cap** | Max 36 hrs/week (General) | Max **48 hrs/week** (Strictly for Guards) |

Required Business Logic:  
The Payroll engine cannot hard-code multipliers. It requires a "Temporal Rule Engine" that checks the Shift\_Date.

* If Shift\_Date \< April 2026: Apply old multipliers (1.5x / 3.0x).  
* If Shift\_Date \>= April 2026: Apply new multipliers (1.25x / 2.5x).  
* This is critical for the transition period where pay cycles may overlap the effective date.3

## ---

**Part 2: Company Admin Role & Logic**

The **Company Admin** represents the business owner or Operations Director. Their role is the **"Architect"**, defining the organization's structure, compliance policies, and profitability controls.

### **2.1 Organizational Hierarchy & Rank Logic**

Thai security companies often follow a para-military structure. The system must support **Rank Configuration** linked to compensation and access rights.

**Functions and Logic:**

* **Rank Setup:** Guard \-\> Shift Leader \-\> Zone Inspector \-\> Operations Manager.  
  * *Logic:* Each rank maps to a Base\_Wage\_Structure (Daily/Monthly) and Allowance\_Entitlements (Position allowance, travel).  
* **Contract/Site Setup:** The core of revenue generation.  
  * *Billing Logic:* The system must handle two primary Thai models:  
    1. **Headcount Billing:** Invoice based on actual shifts served: $R \= (DayShifts \\times Rate\_D) \+ (NightShifts \\times Rate\_N)$.  
    2. **Lump Sum Billing:** Fixed monthly fee with **"Manpower Shortfall Deduction"** logic. If the roster is not fully staffed, the system must auto-calculate the credit note amount.  
  * *Constraints:* Admins define "Minimum Manning Levels" (e.g., 3 Day / 3 Night). The Rostering Engine treats this as a *Hard Constraint*.4

### **2.2 Compliance & License Management Engine**

Admins require a Dashboard visualizing legal risk.

**Notification & Workflow Logic:**

1. **Company License Renewal (Tor Phor 2):** Countdown timer alerting 180 days in advance for financial statement preparation (Form Bor.Or.Jor.5).2  
2. **Guard License Watchlist (Tor Phor 7):**  
   * *Query:* SELECT \* FROM Employees WHERE License\_Expiry\_Date \<= (CURRENT\_DATE \+ 60 Days)  
   * *Action:* Auto-generate a "Batch Renewal List" for the admin to submit to the Metropolitan or Provincial Police.5  
   * *Risk Control:* Auto-lock dispatching for guards with expired licenses.  
3. **Blacklist Check:** Internal API to check re-hires against company historical records for past fraud or negligence.

### **2.3 Compensation & Deduction Logic**

Thai guard payroll involves complex "Additions" and "Deductions".

**Calculation Logic:**

* **Diligence Allowance (Beautification):** Boolean Chain logic:IF (Late\_Count \== 0\) AND (Absent\_Count \== 0\) AND (Leave\_Count \== 0\) THEN Award \= 500 THB ELSE Award \= 0  
* **Deductions (Uniform/Guarantee):** Must comply with Labor Law caps (e.g., not exceeding 10% of salary).  
  * *Guardrail:* System validation prevents Admins from setting deduction installments higher than the legal limit.  
* **Salary Advance Policy:** Admin sets the %\_Limit of earned wages available for early withdrawal (Earned Wage Access) to mitigate loan shark debts.6

### **2.4 Site Profitability Analysis**

Admins need to know which sites are profitable.

**Formula Logic:**

Gross\_Margin \= (Contract\_Revenue) \- (Sum(Guard\_Wages) \+ Sum(OT\_Cost) \+ SSO\_Contribution \+ Uniform\_Cost)

The system must aggregate data from Payroll and Contract modules in real-time.

## ---

**Part 3: Manager Role & Logic (Operations/Inspector)**

The **Manager** (Zone Commander/Inspector) focuses on **"Execution & Monitoring"**—ensuring the roster is filled and Service Level Agreements (SLAs) are met.

### **3.1 Rostering & Scheduling Algorithm**

Managing limited manpower across 24-hour coverage is the most complex task.

**Scheduling Logic:**

1. **Shift Patterns:** Support for standard Thai shifts:  
   * **2 Shifts (12 Hours):** 07:00-19:00 (Day) / 19:00-07:00 (Night).  
2. **Constraint Satisfaction:** When a Manager drags-and-drops a guard:  
   * *Fatigue Check:* Flag if a guard works \>12 hours or does a "Double Shift" (24hrs).  
   * *Qualification Check:* Ensure the guard matches site requirements (e.g., Male, Height \> 170cm).  
   * *Overtime Cap:* Warning if total hours \> 48/week (New 2026 Law).3  
3. **Rotation Logic:** Suggest "Forward Rotation" patterns (Day \-\> Night \-\> Off) to maintain health.

### **3.2 Substitution & Relief Workflow**

Handling "No-Shows" requires an **"Automated Relief Protocol"**.

**Workflow Logic:**

1. **Trigger:** No "Clock-in" detected within 15 mins of shift start.  
2. **Alert:** Notification sent to Manager via Mobile App/LINE.  
3. **Recommendation Engine:** Queries the "Relief Pool" 7:  
   * *Filter:* Status \== Available AND Distance\_To\_Site \< 20 KM AND Skills\_Match \== True.  
4. **Dispatch:** Manager sends a job offer; the replacement guard accepts via app.

### **3.3 Digital Inspection & Guard Tour**

Managers (Inspectors) perform QC checks.

**Logic & Features:**

* **Dynamic Checklist:** Admin-defined forms (e.g., Uniform Check, Fire Extinguisher Check).  
* **Location Validation:** The inspection form only unlocks if GPS\_Location matches Site\_Coordinates.  
* **Scoring:** Deductions for infractions (e.g., Sleeping \= \-50 pts). Scores feed into the Guard's performance profile.

### **3.4 Incident Management State Machine**

Handling incidents (theft, fire) follows a strict state flow.

**State Logic:**

New \-\> Acknowledged \-\> Investigating \-\> Report Filed \-\> Closed

* *SLA Monitoring:* If a "Critical" incident isn't acknowledged in 15 mins, escalate to Company Admin.

## ---

**Part 4: Security Guard Role & Logic**

**Security Guards** often have low tech-literacy. The UI must be simple (Big Buttons, Icons) and potentially integrated with LINE OA. Their role is **"Data Origination"**.

### **4.1 Attendance & Access Control**

**Validation Logic:**

1. **Geofencing:** Clock-in disabled if Distance(Device, Site) \> 50 meters.  
2. **Liveness Detection:** To prevent "Buddy Punching", require a Selfie.  
   * *AI Logic:* Face verification or simple photo timestamping.  
3. **Shift Handover:** Digital acknowledgement of the previous shift's logbook before starting work.

### **4.2 Digital Patrol (Guard Tour)**

Replacing paper logs or old wands with NFC/QR codes.

**Patrol Logic:**

* **Sequence Enforcement:** Checkpoint A \-\> B \-\> C.  
* **Timing Constraints:**  
  * *Min Time:* Prevent rushing (running through points).  
  * *Max Time:* Prevent loitering.  
  * *Alert:* IF (Time\_B \- Time\_A) \> Threshold THEN Alert\_Supervisor.  
* **Offline-First:** Data must buffer locally if the internet drops in basements, syncing once online.8

### **4.3 Financial Well-being**

**Feature:** **Salary Advance (Earned Wage Access)**.

* *Logic:* Withdrawable\_Amount \= (Days\_Worked x Daily\_Wage) \* Policy\_%.  
* *Process:* Guard requests via app \-\> Auto-approval (if within limit) \-\> API call to Bank \-\> Deduction queued for payroll.6

### **4.4 SOS & Reporting**

* **Panic Button:** One-touch alert sending GPS \+ Audio stream to the Command Center.  
* **Incident Reporting:** Multimedia-first (Voice notes \+ Photos) to reduce typing burden.

## ---

**Part 5: Advanced Payroll Computation Engine**

### **5.1 Calculation Formulas**

The system variables must handle the unique Thai security context:

| Variable | Logic/Formula |
| :---- | :---- |
| **Working\_Days** | Count(Shift\_Normal) |
| **Public\_Holiday\_Work** | Count(Shift\_Holiday) |
| **OT\_Normal\_Hrs** | Sum(Hours \> 8\) WHERE Date\!= Holiday |
| **OT\_Holiday\_Hrs** | Sum(Hours \> 8\) WHERE Date \== Holiday |
| **Net\_Salary** | (Base \+ OT \+ Allowances) \- (SSO \+ Tax \+ Uniform \+ Advances) |

**Transition Logic (Code Snippet Concept):**

Python

def calculate\_ot\_pay(shift\_date, hours\_worked, hourly\_rate):  
    ot\_hours \= max(0, hours\_worked \- 8)  
    is\_holiday \= check\_holiday(shift\_date)  
      
    \# 2026 Regulation Switch  
    effective\_date \= date(2026, 4, 1)  
      
    if shift\_date \>= effective\_date:  
        multiplier \= 2.5 if is\_holiday else 1.25  
    else:  
        multiplier \= 3.0 if is\_holiday else 1.5 \# Old rates

    return ot\_hours \* hourly\_rate \* multiplier

### **5.2 Social Security (SSO)**

* **Logic:** Contribution \= Min(Base\_Salary, 15000\) \* 0.05.  
* **Output:** Generate **SPS 1-10** file format for upload to the Thai SSO e-Service.9

## ---

**Conclusion**

This architecture provides a compliant, efficient, and scalable foundation for a Thai Security HRM SaaS. By prioritizing **Regulatory Compliance (Tor Phor)** and **Automated Logic (Rostering/Payroll)**, the system addresses the specific pain points of Thai security firms, distinguishing itself from generic HR platforms.

#### **Works cited**

1. Security Industry Business Act, accessed January 21, 2026, [https://www.bccthai.com/asp/view\_doc.asp?DocCID=2858](https://www.bccthai.com/asp/view_doc.asp?DocCID=2858)  
2. Translation MINISTERIAL REGULATION AUTHORIZING SECURITY ..., accessed January 21, 2026, [https://www.royalthaipolice.go.th/downloads/laws/laws\_05\_05.pdf](https://www.royalthaipolice.go.th/downloads/laws/laws_05_05.pdf)  
3. New Ministerial Regulations on Overtime Payment for Security ..., accessed January 21, 2026, [https://pkfthailand.asia/new-ministerial-regulations-on-overtime-payment-for-security-guard-work-effective-2026/](https://pkfthailand.asia/new-ministerial-regulations-on-overtime-payment-for-security-guard-work-effective-2026/)  
4. How Many Security Guards Do You Actually Need? A Practical Guide for Offices, Hotels & Warehouses, accessed January 21, 2026, [https://blackdragonsecurity.com/2025/11/17/how-many-security-guards-do-you-need/](https://blackdragonsecurity.com/2025/11/17/how-many-security-guards-do-you-need/)  
5. การขอใบอนุญาตเป็นพนักงานรักษาความปลอดภัยรับอนุญาต, accessed January 21, 2026, [https://gcc.go.th/2023/02/06/%E0%B9%83%E0%B8%9A%E0%B8%AD%E0%B8%99%E0%B8%B8%E0%B8%8D%E0%B8%B2%E0%B8%95%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%E0%B8%9E%E0%B8%99%E0%B8%B1%E0%B8%81%E0%B8%87%E0%B8%B2%E0%B8%99%E0%B8%A3%E0%B8%B1%E0%B8%81/](https://gcc.go.th/2023/02/06/%E0%B9%83%E0%B8%9A%E0%B8%AD%E0%B8%99%E0%B8%B8%E0%B8%8D%E0%B8%B2%E0%B8%95%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%E0%B8%9E%E0%B8%99%E0%B8%B1%E0%B8%81%E0%B8%87%E0%B8%B2%E0%B8%99%E0%B8%A3%E0%B8%B1%E0%B8%81/)  
6. Salary Hero \- Financial Health Platform for Employees, accessed January 21, 2026, [https://www.salary-hero.com/](https://www.salary-hero.com/)  
7. Best Practices for Effective Security Guard Scheduling \- Novagems, accessed January 21, 2026, [https://novagems.com/best-practices-for-effective-security-guard-scheduling/](https://novagems.com/best-practices-for-effective-security-guard-scheduling/)  
8. Secure Checker: ลาดตระเวนไร้ขีดจำกัด ด้วยโหมดออฟไลน์ \- defensive hive, accessed January 21, 2026, [https://www.defensivehiveplatform.com/blog/secure-checker-new-feature-offline-mode](https://www.defensivehiveplatform.com/blog/secure-checker-new-feature-offline-mode)  
9. Employer of Record Thailand | Hire in Thailand \- BIPO EOR, accessed January 21, 2026, [https://www.biposervice.com/global-hiring-guide/thailand/](https://www.biposervice.com/global-hiring-guide/thailand/)