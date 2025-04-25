import express from 'express';
import { 
    loginDoctor, 
    appointmentsDoctor, 
    appointmentCancel, 
    doctorList, 
    changeAvailablity, 
    appointmentComplete, 
    doctorDashboard, 
    doctorProfile, 
    updateDoctorProfile,
    doctorPatients,
    patientVitals,
    patientAppointments,
    getUploadPresignedUrl,
    savePrescription,
    getDoctorReviews,
    getMyReviews
} from '../controllers/doctorController.js';
import authDoctor from '../middleware/authDoctor.js';
const doctorRouter = express.Router();

doctorRouter.post("/login", loginDoctor);
doctorRouter.post("/cancel-appointment", authDoctor, appointmentCancel);
doctorRouter.get("/appointments", authDoctor, appointmentsDoctor);
doctorRouter.get("/list", doctorList);
doctorRouter.post("/change-availability", authDoctor, changeAvailablity);
doctorRouter.post("/complete-appointment", authDoctor, appointmentComplete);
doctorRouter.get("/dashboard", authDoctor, doctorDashboard);
doctorRouter.get("/profile", authDoctor, doctorProfile);
doctorRouter.post("/update-profile", authDoctor, updateDoctorProfile);

// Review endpoints
doctorRouter.get("/reviews/:doctorId", getDoctorReviews); // Public endpoint
doctorRouter.get("/my-reviews", authDoctor, getMyReviews); // Auth-protected endpoint

// New routes for patient functionality
doctorRouter.get("/patients", authDoctor, doctorPatients);
doctorRouter.get("/patient/:patientId/vitals", authDoctor, patientVitals);
doctorRouter.get("/patient/:patientId/appointments", authDoctor, patientAppointments);

// New routes for R2 file storage
doctorRouter.post("/get-upload-url", authDoctor, getUploadPresignedUrl);
doctorRouter.post("/save-prescription", authDoctor, savePrescription);

export default doctorRouter;