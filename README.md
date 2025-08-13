# 📊 Company Management Platform

A **full-stack Company Management Platform** built with **React.js**, **Node.js**, **Express.js**, and **MySQL/PostgreSQL**.  
It’s designed to help **Admins**, **Managers**, and **Employees** collaborate efficiently with **task tracking**, **attendance management**, **leave requests**, and **team coordination** — all in one place.

---

## ✨ Features

### 👑 Admin
- Manage all users (Add, Edit, Delete)
- Assign roles (**Admin**, **Manager**, **Employee**)
- View company-wide statistics

### 📋 Manager
- Assign and track tasks with **@mention** functionality
- View and manage team members
- Monitor attendance records
- Approve / Reject leave requests
- Export attendance data to **PDF** or **Excel**

### 👨‍💼 Employee
- View assigned tasks
- Submit daily attendance (**Check-in / Check-out**)
- View personal attendance records
- Request leave directly from the dashboard
- Update profile & logout

---

## 🛠️ Tech Stack

**Frontend**
- React.js (with Hooks)
- Axios (for API requests)
- CSS (custom styling)
- Lucide Icons

**Backend**
- Node.js + Express.js
- JWT Authentication
- RESTful API endpoints

**Database**
- MySQL / PostgreSQL

---

## 📂 Project Structure

company_management/
│
├── backend/ # Node.js + Express API
│ ├── routes/ # API route handlers
│ ├── config/ # DB and JWT config
│ ├── controllers/ # Request handling logic
│ └── server.js # Entry point
│
├── frontend/ # React.js application
│ ├── src/pages/ # Dashboard pages
│ ├── src/components/ # UI components
│ └── src/styles/ # CSS styles
│
└── README.md


---

## 📸 Screenshots

### Landing Page
![Landing Page](screenshots/Screenshot_2025-08-05_210536.png)

### Manager Dashboard
![Manager Dashboard](screenshots/Screenshot_2025-08-05_170012.png)

### Employee Dashboard
![Employee Dashboard](screenshots/Screenshot_2025-08-05_210644.png)

### Admin Dashboard
![Admin Dashboard](screenshots/Screenshot_2025-08-05_211319.png)

---

## 🚀 Getting Started

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/yourusername/company_management.git
cd company_management

2️⃣ Install Dependencies
Backend
cd backend
npm install

Frontend
cd ../frontend
npm install
3️⃣ Set Up Environment Variables
Create a .env file in backend/ and add:

env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=company_db
JWT_SECRET=your_jwt_secret
4️⃣ Run the Project
Backend
cd backend
npm start

Frontend
cd ../frontend
npm start
📌 Notes
Make sure MySQL/PostgreSQL is running before starting the backend.

Adjust database credentials in .env as needed.

The default backend runs on http://localhost:5000 and frontend on http://localhost:3000.

📝 License
This project is licensed under the MIT License — feel free to use and modify it for your needs.