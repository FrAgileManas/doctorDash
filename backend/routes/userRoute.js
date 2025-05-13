import express from 'express';
import { loginUser, registerUser, getProfile, updateProfile, bookAppointment, listAppointment, cancelAppointment, paymentRazorpay, verifyRazorpay, addReview, deleteReview, holdSlot, finalizeBooking, releaseHeldSlot, resendConfirmationEmail, updateNotificationPreferences } from '../controllers/userController.js';
import { addVital, getVitalsByDate, updateVital, deleteVital, getAllVitals } from '../controllers/vitalController.js';
import { getReminders, addReminder, updateReminder, deleteReminder, testReminderEmail } from '../controllers/reminderController.js';
import { createMember, getMembers, createCase, getUploadUrl, addFile, deleteFile, getMember } from '../controllers/healthRecordsController.js';

import { getRoom } from '../controllers/roomController.js';
import upload from '../middleware/multer.js';
import authUser from '../middleware/authUser.js';
const userRouter = express.Router();

userRouter.post("/register", registerUser)
userRouter.post("/login", loginUser)

userRouter.get("/get-profile", authUser, getProfile)
userRouter.post("/update-profile", upload.single('image'), authUser, updateProfile)
userRouter.post("/book-appointment", authUser, bookAppointment)
userRouter.post('/hold-slot', authUser, holdSlot);
userRouter.post('/finalize-booking', authUser, finalizeBooking);
userRouter.post('/release-slot', authUser, releaseHeldSlot);


userRouter.get("/appointments", authUser, listAppointment)
userRouter.post("/cancel-appointment", authUser, cancelAppointment)
userRouter.post("/payment-razorpay", authUser, paymentRazorpay)
userRouter.post("/verify-razorpay", authUser, verifyRazorpay)
userRouter.post("/resend-confirmation", authUser, resendConfirmationEmail)

// Notification preferences
userRouter.post("/notification-preferences", authUser, updateNotificationPreferences)

// Review endpoints
userRouter.post("/add-review", authUser, addReview)
userRouter.post("/delete-review", authUser, deleteReview)

// Vital tracking endpoints
userRouter.post("/vitals", authUser, addVital)
userRouter.get("/vitals", authUser, getVitalsByDate)
userRouter.put("/vitals/:id", authUser, updateVital)
userRouter.delete("/vitals/:id", authUser, deleteVital)
userRouter.get("/all-vitals", authUser, getAllVitals)

// Room endpoints
userRouter.get("/room/:appointmentId", authUser, getRoom)

// Reminder endpoints
userRouter.get("/reminders", authUser, getReminders)
userRouter.post("/reminders", authUser, addReminder)
userRouter.put("/reminders/:id", authUser, updateReminder)
userRouter.delete("/reminders/:id", authUser, deleteReminder)
userRouter.post("/reminders/:id/test", authUser, testReminderEmail)


userRouter.post("/health-records/members", authUser, createMember);
userRouter.get("/health-records/members", authUser, getMembers);
userRouter.get("/health-records/members/:memberId", authUser, getMember);
userRouter.post("/health-records/cases", authUser, createCase);
userRouter.post("/health-records/upload-url", authUser, getUploadUrl);
userRouter.post("/health-records/files", authUser, addFile);
userRouter.post("/health-records/files/delete", authUser, deleteFile);
export default userRouter;