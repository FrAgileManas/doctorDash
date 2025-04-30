import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import vitalModel from "../models/vitalModel.js";
import crypto from 'crypto';
import { S3 } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { EmailClient } from '@azure/communication-email';
import userModel from "../models/userModel.js";

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

// Create an S3 client configured for Cloudflare R2
const s3Client = new S3({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// Create email client instance
const COMMUNICATION_SERVICES_CONNECTION_STRING = process.env.COMMUNICATION_SERVICES_CONNECTION_STRING;
const emailClient = new EmailClient(COMMUNICATION_SERVICES_CONNECTION_STRING);

// Add this function to doctorController.js
async function sendNotificationEmail(userEmail, subject, htmlContent) {
  try {
    const emailMessage = {
      senderAddress: "DoNotReply@d718c6b6-e8fb-4927-9631-85ded959af50.azurecomm.net",
      content: {
        subject: subject,
        html: htmlContent,
      },
      recipients: {
        to: [{ address: userEmail }],
      },
    };

    const poller = await emailClient.beginSend(emailMessage);
    const result = await poller.pollUntilDone();
    console.log("Email notification sent successfully");
    return result;
  } catch (error) {
    console.error("Error sending email notification:", error);
  }
}

// Add the doctor cancellation email template
const doctorCancellationTemplate = (userData, appointmentData) => `
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Appointment Cancelled by Doctor</title>
      <style>
          body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
          }
          .header {
              background-color: #ff6347;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
          }
          .content {
              padding: 20px;
              border: 1px solid #ddd;
              border-top: none;
              border-radius: 0 0 5px 5px;
          }
          .details {
              margin: 20px 0;
              padding: 15px;
              background-color: #f9f9f9;
              border-radius: 5px;
          }
          .footer {
              margin-top: 20px;
              text-align: center;
              font-size: 12px;
              color: #777;
          }
      </style>
  </head>
  <body>
      <div class="header">
          <h1>Appointment Cancelled by Doctor</h1>
      </div>
      <div class="content">
          <p>Dear ${userData.name},</p>
          <p>We regret to inform you that your appointment with Dr. ${appointmentData.docData.name} has been cancelled by the doctor.</p>
          
          <div class="details">
              <p><strong>Date:</strong> ${appointmentData.slotDate}</p>
              <p><strong>Time:</strong> ${appointmentData.slotTime}</p>
              <p><strong>Doctor:</strong> Dr. ${appointmentData.docData.name} (${appointmentData.docData.speciality})</p>
          </div>
          
          <p>We apologize for any inconvenience this may cause. The doctor might have had an emergency or other unavoidable circumstance.</p>
          
          <p>You can reschedule your appointment through our app or website at your convenience.</p>
          
          <p>Thank you for your understanding and for choosing DoctorDash for your healthcare needs.</p>
      </div>
      <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} DoctorDash. All rights reserved.</p>
      </div>
  </body>
  </html>
`;


const getUploadPresignedUrl = async (req, res) => {
    
    try {
      const { docId } = req.body;
      const { filename, contentType } = req.body;
      
      if (!filename || !contentType) {
        console.log("Filename or content type is missing");
        return res.json({ success: false, message: "Filename and content type are required" });
      }
      
      // Generate a unique key for the file
      const key = filename || `prescriptions/${docId}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
      
      // Create the command to put an object in the bucket
      const putObjectCommand = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
        Metadata: {
          docId: docId || "",
          uploadedAt: new Date().toISOString()
        }
      });
      
      // Generate a presigned URL for uploading
      const uploadUrl = await getSignedUrl(s3Client, putObjectCommand, {
        expiresIn: 3600 // 1 hour
      });
      
      // Generate the public URL for the file
      const fileUrl = `${R2_PUBLIC_URL}/${key}`;
      
      res.json({
        success: true,
        uploadUrl: uploadUrl,
        fileUrl,
        key,
      });
    } catch (error) {
      console.log(error);
      res.json({ success: false, message: error.message });
    }
  };
// Save prescription reference in the database
const savePrescription = async (req, res) => {
    try {
        const { docId, appointmentId, prescriptionUrl, storageKey } = req.body;
        
        if (!appointmentId || !prescriptionUrl) {
            return res.json({ success: false, message: "Appointment ID and prescription URL are required" });
        }
        
        const appointmentData = await appointmentModel.findById(appointmentId);
        
        // Verify that this appointment belongs to the doctor
        if (!appointmentData || appointmentData.docId !== docId) {
            return res.json({ success: false, message: "Invalid appointment" });
        }
        
        // Update appointment with prescription URL
        await appointmentModel.findByIdAndUpdate(appointmentId, { 
            prescription: prescriptionUrl,
            storageKey: storageKey // Optional: Store the R2 storage key for future reference
        });
        
        res.json({ success: true, message: "Prescription saved successfully" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API for doctor Login 
const loginDoctor = async (req, res) => {
    try {
        const { email, password } = req.body
        const user = await doctorModel.findOne({ email })

        if (!user) {
            return res.json({ success: false, message: "Invalid credentials" })
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if (isMatch) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)
            res.json({ success: true, token })
        } else {
            res.json({ success: false, message: "Invalid credentials" })
        }
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get doctor appointments for doctor panel
const appointmentsDoctor = async (req, res) => {
    try {
        const { docId } = req.body
        const appointments = await appointmentModel.find({ docId })

        res.json({ success: true, appointments })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to cancel appointment for doctor panel
const appointmentCancel = async (req, res) => {
    try {
        const { docId, appointmentId } = req.body;

        const appointmentData = await appointmentModel.findById(appointmentId);
        if (!appointmentData || appointmentData.docId !== docId) {
            return res.json({ success: false, message: 'Appointment not found or not authorized' });
        }
        
        await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true });
        
        // Get user data to send email
        const userData = await userModel.findById(appointmentData.userId).select("-password");
        
        // Send cancellation email to the user
        if (userData && userData.email) {
            const emailHtml = doctorCancellationTemplate(userData, appointmentData);
            sendNotificationEmail(userData.email, "Appointment Cancelled by Doctor - DoctorDash", emailHtml);
        }
        
        // Releasing doctor slot
        const { slotDate, slotTime } = appointmentData;
        const doctorData = await doctorModel.findById(docId);
        
        let slots_booked = doctorData.slots_booked;
        slots_booked[slotDate] = slots_booked[slotDate].filter(e => e !== slotTime);
        
        await doctorModel.findByIdAndUpdate(docId, { slots_booked });

        return res.json({ success: true, message: 'Appointment Cancelled' });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API to mark appointment completed for doctor panel
const appointmentComplete = async (req, res) => {
    try {
        const { docId, appointmentId } = req.body

        const appointmentData = await appointmentModel.findById(appointmentId)
        if (appointmentData && appointmentData.docId === docId) {
            await appointmentModel.findByIdAndUpdate(appointmentId, { isCompleted: true })
            return res.json({ success: true, message: 'Appointment Completed' })
        }

        res.json({ success: false, message: 'Appointment Cancelled' })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get all doctors list for Frontend
const doctorList = async (req, res) => {
    try {
        const doctors = await doctorModel.find();
        
        // For each doctor, calculate their average rating
        const doctorsWithRatings = await Promise.all(doctors.map(async (doctor) => {
            const doctorObj = doctor.toObject();
            
            // Find all appointments with reviews for this doctor
            const appointments = await appointmentModel.find({
                docId: doctor._id.toString(),
                isCompleted: true,
                patientReview: { $exists: true }
            });
            
            // Calculate average rating
            if (appointments.length > 0) {
                const totalRating = appointments.reduce((sum, appointment) => 
                    sum + appointment.patientReview.rating, 0);
                doctorObj.avgRating = totalRating / appointments.length;
                doctorObj.reviewCount = appointments.length;
            } else {
                doctorObj.avgRating = 0;
                doctorObj.reviewCount = 0;
            }
            
            return doctorObj;
        }));
        
        res.json({ success: true, doctors: doctorsWithRatings });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
};


// API to get doctor's patients with appointment status
const doctorPatients = async (req, res) => {
    try {
        const { docId } = req.body
        
        // Get all appointments for this doctor
        const appointments = await appointmentModel.find({ docId })
        
        // Create a map of unique patients with their appointments
        const patientMap = new Map()
        
        appointments.forEach(appointment => {
            const userId = appointment.userId
            
            if (!patientMap.has(userId)) {
                patientMap.set(userId, {
                    userId: userId,
                    name: appointment.userData.name,
                    image: appointment.userData.image,
                    dob: appointment.userData.dob,
                    appointments: []
                })
            }
            
            // Add this appointment to the patient's appointments array
            patientMap.get(userId).appointments.push({
                _id: appointment._id,
                slotDate: appointment.slotDate,
                slotTime: appointment.slotTime,
                amount: appointment.amount,
                isCompleted: appointment.isCompleted,
                cancelled: appointment.cancelled,
                payment: appointment.payment
            })
        })
        
        // Convert the map to an array of patients
        const patients = Array.from(patientMap.values())
        
        res.json({ success: true, patients })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get patient vitals
const patientVitals = async (req, res) => {
    try {
        const { patientId } = req.params
        
        // Get all vitals for this patient
        const vitals = await vitalModel.find({ userId: patientId }).sort({ date: -1, time: -1 })
        
        res.json({ success: true, vitals })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get patient appointments with current doctor
const patientAppointments = async (req, res) => {
    try {
        const { docId } = req.body
        const { patientId } = req.params
        
        // Get all appointments for this patient with this doctor
        const appointments = await appointmentModel.find({ 
            docId: docId,
            userId: patientId
        }).sort({ date: -1 })
        
        res.json({ success: true, appointments })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to change doctor availablity for Admin and Doctor Panel
const changeAvailablity = async (req, res) => {
    try {
        const { docId } = req.body

        const docData = await doctorModel.findById(docId)
        await doctorModel.findByIdAndUpdate(docId, { available: !docData.available })
        res.json({ success: true, message: 'Availablity Changed' })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get doctor profile for  Doctor Panel
const doctorProfile = async (req, res) => {
    try {
        const { docId } = req.body
        const profileData = await doctorModel.findById(docId).select('-password')

        res.json({ success: true, profileData })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to update doctor profile data from  Doctor Panel
const updateDoctorProfile = async (req, res) => {
    try {
        const { docId, fees, address, available } = req.body

        await doctorModel.findByIdAndUpdate(docId, { fees, address, available })

        res.json({ success: true, message: 'Profile Updated' })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get dashboard data for doctor panel
const doctorDashboard = async (req, res) => {
    try {
    const { docId } = req.body;

    // Get all paid appointments
    const paidAppointments = await appointmentModel.find({ docId, payment: true });

    // Total earnings
    const earnings = paidAppointments.reduce((sum, appointment) => sum + appointment.amount, 0);

    // Count total paid appointments
    const totalAppointments = await appointmentModel.countDocuments({ docId });

    // Count unique patients
    const uniquePatients = await appointmentModel.distinct('userId', { docId });

    // Latest paid appointments (limit to 10 for dashboard display)
    const latestAppointments = await appointmentModel.find({ docId })
        .sort({ date: -1 })
        .limit(10);

    // Get reviews from completed appointments that contain a review
    const reviewsData = await appointmentModel.find({
        docId,
        isCompleted: true,
        "patientReview.rating": { $exists: true }
    });

    const reviewCount = reviewsData.length;
    let avgRating = 0;

    if (reviewCount > 0) {
        const totalRating = reviewsData.reduce((sum, appointment) =>
            sum + (appointment.patientReview?.rating || 0), 0);
        avgRating = totalRating / reviewCount;
    }

    const dashData = {
        earnings,
        appointments: totalAppointments,
        patients: uniquePatients.length,
        latestAppointments,
        avgRating,
        reviewCount
    };

    res.json({ success: true, dashData });

} catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
}
}

const getMyReviews = async (req, res) => {
    try {
        const { docId } = req.body;
        
        const appointments = await appointmentModel.find({ 
            docId, 
            isCompleted: true,
            patientReview: { $exists: true }
        }).populate('userData');

        const reviews = appointments.map(appointment => ({
            rating: appointment.patientReview.rating,
            comment: appointment.patientReview.comment,
            date: appointment.patientReview.date,
            userData: appointment.userData
        }));

        res.json({ success: true, reviews });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
};

const getDoctorReviews = async (req, res) => {
    try {
        const { doctorId } = req.params;
        
        const appointments = await appointmentModel.find({ 
            docId: doctorId, 
            isCompleted: true,
            patientReview: { $exists: true }
        }).populate('userData');

        const reviews = appointments.map(appointment => ({
            rating: appointment.patientReview.rating,
            comment: appointment.patientReview.comment,
            date: appointment.patientReview.date,
            userData: appointment.userData
        }));

        res.json({ success: true, reviews });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
};
export {
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
    getMyReviews,
    getDoctorReviews
}