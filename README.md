# 🎓 University Class Scheduling & Timetable System
### ባለብዙ-ተዋናይ የከፍል እና የጊዜ ሰሌዳ መደልደያ ሲስተም

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-Visit_Website-22c55e?style=for-the-badge&logo=googlechrome&logoColor=white)](https://addisufenta00-bot.github.io/-class-schedule/)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/addisufenta00-bot/-class-schedule)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

[![React](https://img.shields.io/badge/React_18-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite_5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma_ORM-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL_16-316192?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

---

## 🌟 Overview (አጠቃላይ እይታ)

An enterprise-grade, full-stack university timetable scheduling platform engineered to solve the complex **NP-complete Classroom and Course Scheduling Problem**. 

The system guarantees **100% clash-free schedules** across rooms, instructors, and student cohorts, while coordinating real-world workflows across **8 institutional roles** and supporting both **Regular (መደበኛ)** and **Extension (ማታ እና ቅዳሜ-እሑድ)** academic programs.

👉 **Experience the Live Application**: [https://addisufenta00-bot.github.io/-class-schedule/](https://addisufenta00-bot.github.io/-class-schedule/)

---

## ⚡ Key Highlights & Core Features

* 🎯 **100% Clash-Free Scheduling Engine**: Heuristic Constraint Satisfaction Solver (MRV - Most Constrained Variable First) that eliminates instructor double-booking, room capacity overflow, and student cohort overlaps.
* 🏛️ **8 Institutional Multi-Actor Workflows**: Role-based access control and customized dashboards tailored to university hierarchy from Student to Super Admin.
* ☀️ **Dual Academic Program Support**:
  * **Regular (መደበኛ)**: Monday – Friday (Periods 1–6: 08:30 – 16:00).
  * **Extension (ማታ እና ቅዳሜ-እሑድ)**: Weekday evenings (18:00 – 21:00) & Weekends (08:30 – 16:45).
* 📑 **PDF Timetable Export**: One-click printable PDF timetables for cohorts and faculty.
* 🔐 **Interactive Facility Operations**: Physical classroom unlocking/locking schedule for Campus Ushers and Key Proctors.
* 📊 **Faculty Workload Safeguards**: Automatic tracking and limits to prevent exceeding maximum allowable credit hours (e.g., 12 credit hour ceiling).

---

## 👥 The 8 Institutional Actors & Roles

| Role | Responsibility | Key Permissions & Features |
| :--- | :--- | :--- |
| 🧑‍🎓 **Student (ተማሪ)** | Cohort Timetable Viewing | Read-only weekly schedule, lab timings, PDF export. Zero editing permissions. |
| 👨‍🏫 **Instructor (መምህር)** | Teaching Schedule | View assigned courses, allocated lecture rooms, and credit hour load monitoring. |
| 🏛️ **Department Head (ኃላፊ)** | Faculty & Course Assignment | Assign lectures, assign courses, swap instructors, enforce credit limits. |
| 🎓 **College Dean (ዲን)** | Cross-Department Coordination | Aggregate student counts and submit official classroom requests to General Services. |
| 🏢 **General Services (አጠቃላይ አገልግሎት)** | Campus Facilities Management | Allocate physical blocks and buildings (Block 42, Block 43, Tech Complex). |
| 📋 **Registrar (ሬጅስትራር)** | Freshman & Academic Streams | Manage common university-wide freshman courses (Natural & Social Sciences). |
| 🔑 **Classroom Proctor (ክፍል ከፋች)** | Daily Building Access | Timed classroom unlock/lock checklist with real-time toggle status. |
| 👑 **Super Admin (ዋና አስተዳዳሪ)** | Master Schedule Generation | Run automated conflict-free timetable generator across all rooms and faculty. |

---

## 🔬 Scheduling Optimization Engine

The core scheduling engine models the problem as a **Constraint Satisfaction Problem (CSP)**:

```
Variables    : Course Offerings (Lectures + Labs)
Domains      : Available Timeslots × Available Rooms
Constraints  : 
  - Hard: No instructor overlap (same timeslot)
  - Hard: No student cohort overlap (same timeslot)
  - Hard: Room capacity >= Enrolled cohort student count
  - Hard: Program boundaries (Regular vs Evening vs Weekend)
  - Soft: Faculty credit load limits (<= 12 hours)
```

By leveraging **MRV (Most Constrained Variable First)** heuristics and forward-checking, the algorithm computes conflict-free schedules in sub-second execution time.

---

## 🛠️ Tech Stack Architecture

* **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Headless UI
* **Backend API**: Node.js (ES Modules), Express.js, RESTful Architecture
* **ORM & Database**: Prisma ORM, PostgreSQL 16
* **Deployment & CI/CD**: GitHub Actions, GitHub Pages

---

## 🚀 Quickstart & Local Setup

### Prerequisites
* **Node.js** (v18.0 or higher)
* **PostgreSQL** (v14 or higher)

### 1. Clone the Repository
```bash
git clone https://github.com/addisufenta00-bot/-class-schedule.git
cd -class-schedule
```

### 2. Install Dependencies
```bash
# Install root, backend, and frontend packages
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 3. Setup Database Environment
Configure your database connection in `backend/.env`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/timetable_db?schema=public"
PORT=5000
```
Run Prisma migrations and seed the database:
```bash
cd backend
npx prisma migrate dev --name init
npx prisma db seed
cd ..
```

### 4. Run Development Servers
```bash
# Start both Backend and Frontend concurrently
npm run dev
```

* **Frontend Web UI**: `http://localhost:3000`
* **Backend API**: `http://localhost:5000`

---

## 👨‍💻 Author

**Addisu Fenta**  
* Full-Stack Developer & Software Engineer
* GitHub: [@addisufenta00-bot](https://github.com/addisufenta00-bot)
* Live Application: [University Class Scheduling System](https://addisufenta00-bot.github.io/-class-schedule/)

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
