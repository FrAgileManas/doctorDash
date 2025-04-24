import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import vitalModel from "../models/vitalModel.js";
import crypto from 'crypto';
import { S3 } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";


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
        const { docId, appointmentId } = req.body

        const appointmentData = await appointmentModel.findById(appointmentId)
        if (appointmentData && appointmentData.docId === docId) {
            await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true })
            return res.json({ success: true, message: 'Appointment Cancelled' })
        }

        res.json({ success: false, message: 'Appointment Cancelled' })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

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
        const doctors = await doctorModel.find({}).select(['-password', '-email'])
        res.json({ success: true, doctors })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

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
        const { docId } = req.body

        const appointments = await appointmentModel.find({ docId })

        let earnings = 0

        appointments.map((item) => {
            if (item.isCompleted || item.payment) {
                earnings += item.amount
            }
        })

        let patients = []

        appointments.map((item) => {
            if (!patients.includes(item.userId)) {
                patients.push(item.userId)
            }
        })

        const dashData = {
            earnings,
            appointments: appointments.length,
            patients: patients.length,
            latestAppointments: appointments.reverse()
        }

        res.json({ success: true, dashData })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

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
    savePrescription
}