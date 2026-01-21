Based on comprehensive research into the Thai security industry's legal frameworks (Security Business Act B.E. 2558\) and operational standards, the following is a structured list of implementation tasks. These are designed to be fed into an AI Agent or Issue Tracker to upgrade your codebase systematically.

Each phase begins with a **Codebase Analysis** step to ensure the AI Agent understands the current state before attempting modifications.

### **Phase 1: Regulatory Compliance & Data Architecture Foundation**

*Focus: Aligning the system with the Royal Thai Police (RTP) regulations and the Security Business Act (Tor Phor).*

**1.1 Codebase Analysis: License & Entity Management**

* **Task:** Analyze the current Company and Employee database schemas. Check if there are dedicated fields and logic for managing "Tor Phor 2" (Company License) and "Tor Phor 7" (Guard License) as distinct entities with start/end dates and status flags.1  
* **Task:** Verify if the current system has a document storage architecture capable of linking specific file types (e.g., criminal record checks, training certificates) to individual employee profiles.3

**1.2 Implementation: License Lifecycle Engine**

* **Task:** Update the Employee schema to include License\_TorPhor7\_Number, License\_Issue\_Date, and License\_Expiry\_Date. Implement a background job that runs daily to scan for licenses expiring within 60 days.1  
* **Task:** Create a "Compliance Dashboard" for Company Admins that displays a countdown for the company's "Tor Phor 2" license renewal (required every 4 years) and aggregates all expiring guard licenses.5  
* **Task:** Implement a strict "Status Lock" logic: If License\_Expiry\_Date \< Current\_Date, automatically set Employee\_Status to Suspended and block them from being assigned to new shifts in the Rostering module.1

---

### **Phase 2: Advanced Rostering & Substitution Logic (Manager Module)**

*Focus: Managing workforce allocation, fatigue, and rapid substitution.*

**2.1 Codebase Analysis: Scheduling Algorithms**

* **Task:** Review the current ShiftAssignment logic. Does it currently allow double-booking or assigning guards to back-to-back 12-hour shifts without rest?  
* **Task:** Analyze how the system currently handles "No-Show" events. Is there an existing workflow for substitution, or is it manual?

**2.2 Implementation: Constraint-Based Rostering**

* **Task:** Implement "Hard Constraints" in the scheduling API to reject assignments if:  
  * Total weekly hours \> 48 hours (aligning with 2026 regulations).6  
  * The guard does not match the site's specific requirements (e.g., gender, height, age 18-60).  
* **Task:** Develop a "Relief Pool Recommendation" endpoint. When a manager needs a substitute, the system should query available guards based on: Status=Active AND Location=Nearby AND OT\_Hours\_Remaining \> 0.7

**2.3 Implementation: Substitution Workflow**

* **Task:** Build a "Shift Offer" feature. When a guard is marked absent, the system automatically sends a push notification/LINE message to eligible guards in the Relief Pool allowing them to "Claim" the open shift.

---

### **Phase 3: Operational Guard App (Mobile/PWA)**

*Focus: Proof of presence, digital patrolling, and offline capabilities.*

**3.1 Codebase Analysis: Mobile Connectivity & Reporting**

* **Task:** Audit the mobile app's behavior when internet connectivity is lost. Does it cache data locally, or does the app crash/fail to save?  
* **Task:** Review the current "Clock-In" validation. Does it rely solely on GPS, or are there anti-spoofing measures?

**3.2 Implementation: Offline-First Patrol Engine**

* **Task:** Refactor the patrol logging function to use a local database (e.g., SQLite/Realm). Patrol checkpoints (QR/NFC scans) must be timestamped locally and synced to the server once the connection is restored.9  
* **Task:** Implement "Geofencing Strict Mode." The Clock\_In button should remain disabled unless the device coordinates are within a defined radius (e.g., 50m) of the Site\_Location.

**3.3 Implementation: Financial Wellness (Salary Advance)**

* **Task:** Create a "Salary Advance" request feature. Implement logic to calculate Accrued\_Wages (Days Worked \* Daily Rate) and allow guards to request a withdrawal up to a set percentage (e.g., 50%) via the app.10

---

### **Phase 4: Payroll Engine Overhaul (The 2026 Transition)**

*Focus: Handling complex Thai overtime calculations and the upcoming regulatory shift.*

**4.1 Codebase Analysis: Payroll Formula Injection**

* **Task:** Inspect the PayrollService to see if overtime multipliers (1.5x, 3.0x) are hardcoded.  
* **Task:** Check if the system distinguishes between "Daily Wage" and "Monthly Salary" employees, as the OT calculation base differs for holiday work.6

**4.2 Implementation: Temporal Calculation Engine**

* **Task:** Refactor the payroll calculator to accept an Effective\_Date.  
  * **Logic A (Current):** OT Normal \= 1.5x, OT Holiday \= 3.0x.  
  * **Logic B (Post-April 2026):** OT Normal \= 1.25x, OT Holiday \= 2.5x.6  
* **Task:** Implement the "8-Hour Threshold" rule specifically for security work. Any work \>8 hours/day triggers OT, even if the total weekly hours are low. Ensure the system flags weeks exceeding 48 hours as a compliance violation.6  
* **Task:** Update the "Deduction" module to ensure deductions (for uniforms, advances, etc.) do not exceed 10% of the total salary per cycle, maintaining labor law compliance.12

---

### **Phase 5: Reporting & Government Documentation**

*Focus: Automating the paperwork required by the Metropolitan Police Bureau.*

**5.1 Codebase Analysis: Reporting Capabilities**

* **Task:** Check if the system can export data in specific formats (PDF/Excel) that match government templates.

**5.2 Implementation: Automated Form Generation**

* **Task:** Create a generator for **Form Tor Phor 1 (ธภ.1)** (List of Guards) and **Form Tor Phor 6 (ธภ.6)** (Application for Guard License) using employee data stored in the system.1  
* **Task:** Implement an export function for the "Guard Registry Report" required by the Registrar, detailing new hires and resignations within the legal notification window (usually 15 days).

