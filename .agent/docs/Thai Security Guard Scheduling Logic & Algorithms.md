# **Deep Research Report: Strategic Workforce Management & Scheduling Logic in Thai Security Operations**

## **Introduction: Industry Dynamics & Technical Context**

In the ecosystem of the Thai Security Guarding Industry, **Scheduling** is not merely an administrative task but a strategic core determining organizational survival, profitability, and legal compliance. Amidst economic volatility and the critical **2026 Labor Law Restructuring**, the roles of the **Operations Manager** and **Inspector** (Sai Truat) have evolved into complex functions. Allocating human resources in this sector is equivalent to solving a **Multivariable Constraint Satisfaction Problem (CSP)**, balancing strict legal statutes, Client Service Level Agreements (SLAs), and physiological human limits.

This report dissects the functional roles, **Operational Logic**, and **Scheduling Algorithms** required for a modern SaaS platform, synthesizing data from Standard Operating Procedures (SOPs), the upcoming 2026 Ministerial Regulations, and modern management theory.

## ---

**1\. The Scheduling Ecosystem: Roles & Responsibilities**

Effective rostering results from the synchronization between two primary actors: the **Operations Manager (Strategy)** and the **Inspector (Execution)**.

### **1.1 Operations Manager (OM): The Strategic Architect**

The OM holds the **"Master Logic"** for workforce management. Their role extends beyond filling slots; it involves deep requirement analysis converted into executable plans compliant with cost and law.

1.1.1 Strategic Manpower Planning Logic  
The OM starts by calculating the Full-Time Equivalent (FTE) required to satisfy a "24-hour Security" requirement.

* **Time Calculation Logic:** A standard week contains $24 \\times 7 \= 168$ hours. Under the new 2026 legal framework (8 hours/day, 6 days/week), a single guard provides only 48 hours/week.  
* Manpower Equation:

  $$\\text{FTE Required} \= \\frac{\\text{Total Post Hours}}{\\text{Standard Guard Hours}} \= \\frac{168}{48} \= 3.5 \\text{ FTE}$$

  System Logic: The system must round this up to 4 headcount or apply Overtime (OT) logic. This calculation is critical for the Transition Period to the 2026 regulations.

1.1.2 Contract & SLA Management  
The OM translates client requirements into "Hard Constraints" for the scheduler:

* **Qualification Constraints:** Filtering guards based on specific attributes (Height, Weight, Language Skills, Driving License) required by high-end clients (e.g., Luxury Hotels, Industrial Estates).  
* **Continuity Constraints:** Enforcing "Dedicated Teams" to ensure familiarity with the site, minimizing security risks associated with high turnover.

**1.1.3 Budgetary Stewardship (Burn Rate Control)**

* **Cost Logic:** If a contract is **Lump Sum** (Flat Rate Revenue) but wages are **Variable** (Actual Hours), an "OT-Heavy" roster can immediately render a site unprofitable. The OM must utilize a **"Cost Minimization"** logic when balancing shifts.

### **1.2 Inspector (Sai Truat): Tactical Enforcement & Verification**

If the OM is the brain, the Inspector is the "Nervous System," sensing and responding to real-time site conditions.

**1.2.1 Proof of Presence Verification**

* **Headcount Validation:** The Inspector physically verifies if the roster matches reality. Discrepancies (No-Shows, unauthorized swaps) must be flagged immediately.  
* **Penalty Logic:** Contracts often stipulate fines for missing guards (e.g., 500 \- 1,000 THB/occurrence). The Inspector's report triggers these **Deduction Events** in the Payroll module.

**1.2.2 Fatigue Management**

* **Targeted Patrol Logic:** Instead of random checks, algorithms should guide Inspectors to check sites during **Circadian Dips** (02:00 \- 04:00 AM), where the risk of guards sleeping is highest.  
* **Real-time Decision:** Inspectors have the authority to "Pull" an unfit guard from duty, triggering a **Substitution Request** in the system.

**1.2.3 Dynamic Redeployment**

* **Substitution Logic:** In emergencies (sudden illness), the Inspector decides which low-risk site can spare a guard to cover a high-risk gap, requiring a **"Best-Fit"** recommendation engine.

## ---

**2\. Scheduling Logic & Algorithms**

Scheduling Thai security guards is a **Constraint Satisfaction Problem (CSP)**. The system must handle the following constraint matrix:

### **2.1 The Constraint Matrix**

**2.1.1 Hard Constraints (Must Not Violate)**

1. **Zero Gap Policy:** 24/7 coverage is mandatory; no time slot can be empty.  
2. **Legal Compliance:**  
   * **Mandatory Rest:** No working \>6 days without a rest day.  
   * **Age/Gender Restrictions:** No minors (\<18) or pregnant women on night shifts (22:00-06:00).  
   * **Licensing:** Active **Tor Phor 7 (ธภ.7)** license required.  
3. **No Overlapping:** A guard cannot be in two locations simultaneously.

**2.1.2 Soft Constraints (Optimize Where Possible)**

1. **Preferences:** Guard desire for high OT vs. specific days off.  
2. **Proximity:** Minimize travel distance between residence and site to reduce fatigue/lateness.  
3. **Continuity:** Prioritize assigning the same guard to the same post.

### **2.2 Shift Pattern Models**

**2.2.1 The 12-Hour Model (Traditional Thai Model)**

* **Structure:** Day (07:00-19:00) / Night (19:00-07:00).  
* **Pros:** Simple administration, high gross pay for guards (due to OT).  
* **Cons:** High fatigue risk, exponential cost increase under 2026 OT laws (1.25x rate for hours \>8).  
* **Logic:** Uses "Buddy System" (Guard A \+ Guard B) with a "Reliever" rotating in.

**2.2.2 The 8-Hour Model (International/Future Standard)**

* **Structure:** Morning (07-15) / Afternoon (15-23) / Night (23-07).  
* **Pros:** Low fatigue, compliant with new laws, lower OT costs.  
* **Cons:** Complex administration (3 handovers/day), requires more headcount (3 guards/post).

### **2.3 Relief Factor Algorithms**

Total Force Algorithm:

$$\\text{Total Guards} \= (\\text{Number of Posts} \\times \\text{Shifts per Day}) \\times (1 \+ \\text{Relief Factor})$$

* **Relief Factor:** Standard safe margin is **15-20%** (approx 1:6 ratio).  
* **"Guard 7" Logic:** In a 12-hour system with 6 fixed guards (3 Day / 3 Night), a **7th Guard (Rotator)** is required to cover the weekly days off.  
  * *Algorithmic Challenge:* Prevent **"Backward Rotation"** (e.g., Night Shift \-\> Morning Shift without 24h rest). The system must enforce forward rotation (Day \-\> Night \-\> Off).

## ---

**3\. The 2026 Regulatory Paradigm Shift (Critical Logic Update)**

The new **Ministerial Regulation on Overtime for Security Work (Effective April 2026\)** fundamentally alters the cost logic.

### **3.1 Logic Comparison: Pre-2026 vs Post-2026**

| Factor | Current Logic (Pre-2026) | New Logic (Post-2026) |
| :---- | :---- | :---- |
| **OT Base Rate** | Often flat rate or 1.0x | **Mandatory 1.25x** for hours \>8 on normal days |
| **Holiday OT** | 2.0x (Daily wage logic) | **Mandatory 2.5x** for hours \>8 on holidays |
| **12-Hour Shift Cost** | Linear (Low Cost) | **Non-Linear (High Cost)** due to 4 hours at 1.25x premium |
| **Weekly Cap** | Flexible | Capped at **48 Hours/Week** (Strict) |

### **3.2 Cost Impact Analysis & Algorithmic Response**

* **Scenario:** 1 Post, 24 Hours.  
* **Old Logic (12h x 2 guards):** Feasible and cheap.  
* **New Logic (12h x 2 guards):** The last 4 hours of every shift cost 25% more. Daily cost increases significantly.  
* **System Adaptation:** The Scheduling Algorithm must shift its objective function from "Maximize Individual Hours" to **"Minimize Overtime Penalty"**. This favors **8-hour shifts** or **Split Shifts** (employing Part-time staff for peak hours).

## ---

**4\. Scheduling Frequency & Types**

### **4.1 Monthly Roster (Industry Standard)**

* **Logic:** Aligned with payroll cycles.  
* **Use Case:** Stable sites (Condos, Factories).  
* **System Req:** Batch generation features ("Copy Previous Month").

### **4.2 Weekly Roster (Flexible)**

* **Logic:** For volatile demand (Events, Construction).  
* **System Req:** Drag-and-drop flexibility, rapid publishing.

### **4.3 Cyclic Roster (Master Rotation)**

* **Logic:** Infinite loop patterns (e.g., "4 On, 2 Off").  
* **Use Case:** Optimal for reducing admin workload and ensuring predictability for guards.

## ---

**5\. Implementation Data Tables**

### **Table 1: Shift Pattern Logic Matrix**

| Pattern | Staff/Post | Fatigue Risk | Handover Frequency | 2026 Cost Impact | Suitable For |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **12-Hour** | 2 (+Relief) | High | 2/Day | **High** (OT 1.25x) | General Sites |
| **8-Hour** | 3 (+Relief) | Low | 3/Day | **Low** (Base Rate) | High-Security/MNCs |
| **Split/Hybrid** | 2 \+ Part-time | Medium | Variable | Medium | Retail/Events |

### **Table 2: Relief Logic Matrix**

| Scenario | Source Pool | Cost Factor | System Action |
| :---- | :---- | :---- | :---- |
| **Sick Leave** | Standby Unit | Normal | Auto-Assign from Relief Pool |
| **Emergency (No-Show)** | Double Shift (Guard on site extends) | **High (OT)** | Manager Approval Required |
| **Resignation** | Recruit/New Hire | Acquisition Cost | Trigger Recruitment Workflow |

## ---

**6\. Conclusion & Strategic Recommendations for AI Agent**

1. **End of "Cheap Labor" Logic:** The system must stop optimizing for long shifts. The 2026 law makes 12-hour shifts a premium cost. The AI should recommend **8-hour patterns** or **Split Shifts** to optimize margins.  
2. **The Inspector as Auditor:** The mobile app for Inspectors must focus on **Data Integrity** (validating the roster vs. reality) to prevent payroll leakage.  
3. **Tech-Driven Compliance:** Hard-code the **Tor Phor 7** license expiry and the **48-hour/week** limit as unbreakable rules in the rostering engine to protect the client from legal liability.

*This report synthesizes legal frameworks and operational realities to serve as the blueprint for the system's logic upgrade.*