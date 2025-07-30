import express from "express"
import cors from 'cors'
import 'dotenv/config'
import connectDB from "./config/mongodb.js"
import connectCloudinary from "./config/cloudinary.js"
import userRouter from "./routes/userRoute.js"
import doctorRouter from "./routes/doctorRoute.js"
import adminRouter from "./routes/adminRoute.js"
import whatsappRouter from "./routes/whatsappRoute.js"
import setupReminderScheduler from "./utils/reminderScheduler.js"
import setupAppointmentReminderScheduler from "./utils/appointmentReminderScheduler.js"

// app config
const app = express()
const port = process.env.PORT || 4000
connectDB()
connectCloudinary()

// middlewares
app.use(express.json())
app.use(cors())

// api endpoints
app.use("/api/user", userRouter)
app.use("/api/admin", adminRouter)
app.use("/api/doctor", doctorRouter)
app.use("/api/whatsapp", whatsappRouter) // Add WhatsApp webhook route

app.get("/", (req, res) => {
  const now = new Date();
  const timeString = now.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    timeZoneName: 'short',
    hour12: true,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit'
  });

  res.send(`API Working — Current IST Time: ${timeString}`);
});
app.get('/redirect', (req, res) => {
  const userAgent = req.headers['user-agent'] || '';
  const isMobile = /mobile/i.test(userAgent);

  const redirectUrl = isMobile
    ? 'https://wa.me/15551415789'
    : `${process.env.FRONTEND_URL}/tracker`;

  res.redirect(302, redirectUrl);
});


setupReminderScheduler();
setupAppointmentReminderScheduler();

app.listen(port, () => console.log(`Server started on PORT:${port}`))

