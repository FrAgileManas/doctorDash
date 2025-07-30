# DoctorDash - Comprehensive Telemedicine Platform

DoctorDash is a full-stack web application designed to bridge the gap between patients and doctors. It provides a seamless platform for booking appointments, managing health records, tracking vitals, and conducting online video consultations. The project is a monorepo containing three main parts: a patient-facing frontend, a doctor/admin-facing dashboard, and a robust backend server.

### 🌐 Live Demo Links

* Patient Website: [https://doctor-dash-theta.vercel.app/](https://doctor-dash-theta.vercel.app/)
* Admin & Doctor Panel: [https://doctor-dash-lxab.vercel.app/](https://doctor-dash-lxab.vercel.app/)
* Desktop App (Windows): [Download Electron App](https://github.com/fragile-manas/doctordash/releases/download/v1.0.0/DoctorDash.Setup.1.0.0.exe)

## ✨ Features

DoctorDash is packed with features to empower patients and streamline the workflow for doctors and administrators.

### ⭐ Core Features

Our platform is built around five key pillars to deliver a modern healthcare experience:

* 🩺 **Health Vitals Tracker**: Patients can log and monitor key health metrics like blood pressure, blood sugar, and weight. The data is visualized in interactive charts, making it easy to track progress and share with doctors.
* 📂 **Health Records Manager**: Securely upload, store, and manage all your medical records in one place. You can also manage records for family members, ensuring everyone's health information is organized and accessible.
* 💻 **Telemedication**: Conduct secure, one-on-one video consultations with doctors directly from the platform. No need for third-party applications.
* ⏰ **Automated Reminders**: Never miss an appointment or a scheduled vitals check-in again. Our system sends automated reminders via Email and WhatsApp.
* 📅 **Appointment Booking**: A user-friendly interface to browse doctors by specialty, view their profiles and availability, and book appointments with secure online payments via Razorpay. This includes an enhanced user flow that locks appointment slots during payment to prevent double bookings.

### 🧑‍⚕️ For Patients (Frontend)

* User Authentication: Secure registration and login functionality.
* Doctor Discovery: Browse and filter doctors by specialty.
* View Doctor Profiles: Access detailed information about doctors, including their qualifications, experience, and available time slots.
* Appointment Management: View and manage upcoming and past appointments.
* Profile Management: Update personal information and profile picture.

### 👨‍⚕️ For Doctors (Admin Panel)

* Doctor Dashboard: An overview of key metrics like total earnings, number of patients, and appointments.
* Appointment Management: View, approve, or cancel patient appointments.
* Patient Management: Access a list of all their patients.
* View Patient Health Data: Review patients' vitals and uploaded health records to provide better care.
* Profile Management: Update their professional profile, qualifications, and consultation fees.

### ⚙️ For Admins (Admin Panel)

* Admin Dashboard: A comprehensive overview of the platform's activity, including total earnings, number of doctors, and registered users.
* Doctor Management: Add new doctors to the platform and manage existing ones (view profiles, approve/block access).
* View All Users: Access a list of all registered patients on the platform.
* View All Appointments: Monitor all appointments being booked on the platform.
* Electron App Support: Includes configuration for an Electron-based desktop application for the admin panel.

## 🙏 Acknowledgements

This project was built upon the foundation of the Prescripto project, developed by [GreatStack](https://greatstack.dev/).

* The original UI design, assets, and the foundational appointment booking feature are credited to the Prescripto project. You can view the original project here: [prescripto.vercel.app](https://prescripto.vercel.app/)
* DoctorDash significantly expands upon this foundation by introducing all other core features (Health Vitals Tracker, Health Records Manager, Telemedication, Automated Reminders) from scratch. Furthermore, the appointment booking functionality was heavily modified to improve the user flow, for instance by adding a slot-locking mechanism during payment processing.

## 🛠️ Tech Stack

This project is built using the MERN stack and other modern technologies.

* **Frontend**: React, Vite, Tailwind CSS
* **Backend**: Node.js, Express.js
* **Database**: MongoDB with Mongoose
* **Authentication**: JSON Web Tokens (JWT)
* **Real-time Communication**:
    * Video Calls: Daily.co API
    * Notifications: Socket.IO
* **Payments**: Razorpay
* **File Storage**: Cloudinary
* **Notifications**: Nodemailer (Email), Twilio (WhatsApp - via whatsappService.js)
* **Job Scheduling**: node-cron for reminders

## 📁 Project Structure

The project is a monorepo with the following structure:

```
/
├── admin/      # React app for Admin and Doctor Dashboard
├── backend/    # Node.js/Express.js server
├── frontend/   # React app for Patients
└── start.bat   # Script to run all services concurrently
```

## 🚀 Getting Started

Follow these instructions to set up and run the project on your local machine.

### Prerequisites

* [Node.js](https://nodejs.org/) (v16 or higher)
* [MongoDB](https://www.mongodb.com/try/download/community) (or a MongoDB Atlas account)
* A code editor like [VS Code](https://code.visualstudio.com/)

### Installation & Setup

1.  Clone the repository:
    `git clone [https://github.com/FrAgileManas/doctorDash.git](https://github.com/FrAgileManas/doctorDash.git)`
    `cd doctordash`
2.  Set up the Backend:
    * Navigate to the backend directory: `cd backend`
    * Install dependencies: `npm install`
    * Create a `.env` file in the `backend` directory and add the environment variables from the sample `env.txt` or the table below.
    * Start the backend server: `npm start`
3.  Set up the Frontend (Patient App):
    * Navigate to the frontend directory: `cd ../frontend`
    * Install dependencies: `npm install`
    * Create a `.env` file in the `frontend` directory and add the required environment variables.
    * Start the frontend app: `npm run dev`
4.  Set up the Admin Panel (Doctor/Admin App):
    * Navigate to the admin directory: `cd ../admin`
    * Install dependencies: `npm install`
    * Create a `.env` file in the `admin` directory and add the required environment variables.
    * Start the admin panel: `npm run dev`
5.  Run all services concurrently:
    * From the root directory, you can use the provided batch script (on Windows) to start all three services at once.
    * `./start.bat`

### Environment Variables

You need to create a `.env` file in the `backend`, `frontend`, and `admin` directories.

#### backend/.env

| Variable | Description |
| :--- | :--- |
| `PORT` | The port for the backend server (e.g., 4000) |
| `FRONTEND_URL` | The URL of the frontend application (e.g., "http://localhost:5173") |
| `CURRENCY` | The currency for payments (e.g., "INR") |
| `JWT_SECRET` | A secret key for JWT token generation |
| `ADMIN_EMAIL` | The email for the default admin account |
| `ADMIN_PASSWORD` | The password for the default admin account |
| `MONGODB_URI` | The connection string for your MongoDB database |
| `MONGODB_DB_NAME` | The name of your database |
| `CLOUDINARY_NAME` | Your Cloudinary cloud name |
| `CLOUDINARY_API_KEY`| Your Cloudinary API key |
| `CLOUDINARY_SECRET_KEY` | Your Cloudinary API secret |
