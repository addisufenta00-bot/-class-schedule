# University Class Scheduling & Timetable System (ባለብዙ-ተዋናይ የክፍል መደልደያ ሲስተም)

Full-stack, 100% zero-conflict university class timetable system supporting **Regular (መደበኛ)** and **Extension (ማታ እና ቅዳሜ-እሑድ)** academic programs with institutional multi-actor workflows.

---

## 👥 The 8 Institutional Actors & Roles

1. 🧑‍🎓 **Student (ተማሪ)**:
   * **Role**: Read-only access to their cohort's personal timetable.
   * **Security**: Zero editing permissions (cannot modify slots or rooms).
   * **Features**: View weekly schedule, laboratory timings, and export/print to PDF.

2. 👨‍🏫 **Instructor / Lecturer (መምህር)**:
   * **Role**: View personal teaching timetable and total allocated credit hours.
   * **Credit Hours Limit**: Safeguards against exceeding the university limit (12 credit hours).

3. 🏛️ **Department Head (የትምህርት ክፍል ኃላፊ)**:
   * **Role**:
     - Assign lectures to department faculty within allowable credit hours.
     - Swap/reassign lecturers for courses.
     - Add new departmental courses (with credit hours, lecture hours, and lab hours).
     - Add new lecturers with custom maximum credit hours.
   * **Overload Prevention**: Warns and prevents assigning courses if a lecturer exceeds maximum credit hours.

4. 🎓 **College Dean (ዲን)**:
   * **Role**:
     - Represents the entire College (e.g., **College of Engineering & Technology**, overseeing Computer Science, IT, Information Systems, and ECE).
     - Aggregates total student count and classroom needs across all departments.
     - Submits official classroom space requests to General Services (*"Need 6 lecture halls in Block 42 for 1,250 students"*).
     - Monitors status of space allocation requests (Pending, Approved, Declined).

5. 🏢 **General Services Directorate (አጠቃላይ አገልግሎት)**:
   * **Role**:
     - Physical campus facility and building management.
     - Reviews College Dean requests.
     - Allocates physical blocks and buildings (e.g. Block 42, Block 43, Tech Complex) to colleges.

6. 📋 **University Registrar (ሬጅስትራር)**:
   * **Role**:
     - Manages common university-wide **Freshman Courses** for both streams:
       - **Natural Science**: Mathematics for Natural Science, General Physics, Communicative English.
       - **Social Science**: Logic & Critical Thinking, Economics, Moral & Civics.
     - Manages academic streams, semester boundaries, and program cohorts (Regular vs Extension).

7. 🔑 **Classroom Usher / Key Proctor (ክፍል ከፋቾች እና ዘጊዎች)**:
   * **Role**:
     - Checks the daily timetable to see which classrooms need to be opened and locked.
     - Interactive Proctor Schedule: shows room number, start time, and prompts:
       - *"Unlock room B42-101 15 minutes before 08:30 AM"*
       - *"Lock room B42-101 after 10:30 AM"*
     - One-click door status toggle (`LOCKED` / `UNLOCKED`).

8. 👑 **Super Admin (ዋና የበላይ አስተዳዳሪ)**:
   * **Role**:
     - Based on all the data in the database (Registrar freshman courses, General Service block allocations, Dean & Department Head course-lecturer credit hour assignments), runs the **Automatic Conflict-Free Class Schedule Generator**.
     - Guarantees 0 clashes across all rooms, instructors, and student sections.
     - Supports separate generation for **Regular** and **Extension** programs.

---

## 🌙 Regular vs Extension Support

* **☀️ REGULAR (መደበኛ)**:
  * Monday through Friday (Periods 1 - 6: 08:30 - 16:00).
  * Day-shift student cohorts and full-time faculty.
* **🌙 EXTENSION (ማታ እና ቅዳሜ-እሑድ)**:
  * Evening shifts: Monday through Friday (18:00 - 21:00).
  * Weekend shifts: Saturday & Sunday (08:30 - 16:45).
  * Evening/weekend student sections and designated rooms.

---

## 🛠️ Tech Stack & Location

* **Folder Path**: `C:\Users\Administrator\.gemini\antigravity\scratch\class-schedule`
* **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons
* **Backend**: Node.js (ES Modules), Express, Prisma ORM
* **Database**: PostgreSQL 16 (`timetable_db` on `localhost:5432`)
* **Optimization Engine**: Heuristic Constraint Satisfaction Solver (MRV - Most Constrained Variable First)

---

## 🚀 Running the Project

### 1. In VS Code:
Open the folder in VS Code:
```
File -> Open Folder -> C:\Users\Administrator\.gemini\antigravity\scratch\class-schedule
```

### 2. Start Services:
```powershell
cd "C:\Users\Administrator\.gemini\antigravity\scratch\class-schedule"
.\run.ps1
```
* **Frontend Web UI**: `http://localhost:3000`
* **Backend API**: `http://localhost:5000`
