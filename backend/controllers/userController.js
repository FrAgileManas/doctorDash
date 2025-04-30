import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";
import userModel from "../models/userModel.js";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";
import { v2 as cloudinary } from 'cloudinary'
import razorpayInstance from "../config/razorpay.js";
// Import the required module at the top of userController.js
import { EmailClient } from '@azure/communication-email';
import emailTemplates from "../models/emailTemplates.js";
// Create email client instance
const COMMUNICATION_SERVICES_CONNECTION_STRING = process.env.COMMUNICATION_SERVICES_CONNECTION_STRING;
const emailClient = new EmailClient(COMMUNICATION_SERVICES_CONNECTION_STRING);

// Reusable email notification function
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
    // Note: We're catching the error here to prevent it from affecting the main operation
    // if email sending fails
  }
}

// API to register user
const registerUser = async (req, res) => {

    try {
        const { name, email, password } = req.body;

        // checking for all data to register user
        if (!name || !email || !password) {
            return res.json({ success: false, message: 'Missing Details' })
        }

        // validating email format
        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Please enter a valid email" })
        }

        // validating strong password
        if (password.length < 8) {
            return res.json({ success: false, message: "Please enter a strong password" })
        }

        // hashing user password
        const salt = await bcrypt.genSalt(10); // the more no. round the more time it will take
        const hashedPassword = await bcrypt.hash(password, salt)

        const userData = {
            name,
            email,
            password: hashedPassword,
        }

        const newUser = new userModel(userData)
        const user = await newUser.save()
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)

        res.json({ success: true, token })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to login user
const loginUser = async (req, res) => {

    try {
        const { email, password } = req.body;
        const user = await userModel.findOne({ email })

        if (!user) {
            return res.json({ success: false, message: "User does not exist" })
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if (isMatch) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)
            res.json({ success: true, token })
        }
        else {
            res.json({ success: false, message: "Invalid credentials" })
        }
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to get user profile data
const getProfile = async (req, res) => {

    try {
        const { userId } = req.body
        const userData = await userModel.findById(userId).select('-password')

        res.json({ success: true, userData })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to update user profile
const updateProfile = async (req, res) => {

    try {

        const { userId, name, phone, address, dob, gender } = req.body
        const imageFile = req.file

        if (!name || !phone || !dob || !gender) {
            return res.json({ success: false, message: "Data Missing" })
        }

        await userModel.findByIdAndUpdate(userId, { name, phone, address: JSON.parse(address), dob, gender })

        if (imageFile) {

            // upload image to cloudinary
            const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: "image" })
            const imageURL = imageUpload.secure_url

            await userModel.findByIdAndUpdate(userId, { image: imageURL })
        }

        res.json({ success: true, message: 'Profile Updated' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// API to book appointment 
const bookAppointment = async (req, res) => {

    try {

        const { userId, docId, slotDate, slotTime } = req.body
        const docData = await doctorModel.findById(docId).select("-password")

        if (!docData.available) {
            return res.json({ success: false, message: 'Doctor Not Available' })
        }

        let slots_booked = docData.slots_booked

        // checking for slot availablity 
        if (slots_booked[slotDate]) {
            if (slots_booked[slotDate].includes(slotTime)) {
                return res.json({ success: false, message: 'Slot Not Available' })
            }
            else {
                slots_booked[slotDate].push(slotTime)
            }
        } else {
            slots_booked[slotDate] = []
            slots_booked[slotDate].push(slotTime)
        }

        const userData = await userModel.findById(userId).select("-password")

        delete docData.slots_booked

        const appointmentData = {
            userId,
            docId,
            userData,
            docData,
            amount: docData.fees,
            slotTime,
            slotDate,
            date: Date.now()
        }

        const newAppointment = new appointmentModel(appointmentData)
        await newAppointment.save()

        // save new slots data in docData
        await doctorModel.findByIdAndUpdate(docId, { slots_booked })

        res.json({ success: true, message: 'Appointment Booked' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}

// API to cancel appointment
const cancelAppointment = async (req, res) => {
    try {
        const { userId, appointmentId } = req.body;
        const appointmentData = await appointmentModel.findById(appointmentId);

        // verify appointment user 
        if (appointmentData.userId !== userId) {
            return res.json({ success: false, message: 'Unauthorized action' });
        }

        await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true });

        // releasing doctor slot 
        const { docId, slotDate, slotTime } = appointmentData;

        const doctorData = await doctorModel.findById(docId);
        const userData = await userModel.findById(userId).select("-password");

        let slots_booked = doctorData.slots_booked;

        slots_booked[slotDate] = slots_booked[slotDate].filter(e => e !== slotTime);

        await doctorModel.findByIdAndUpdate(docId, { slots_booked });

        // Send cancellation email
        if (userData.email) {
            const emailHtml = emailTemplates.appointmentCancellation(userData, appointmentData, 'user');
            sendNotificationEmail(userData.email, "Appointment Cancellation - DoctorDash", emailHtml);
        }

        res.json({ success: true, message: 'Appointment Cancelled' });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API to get user appointments for frontend my-appointments page
const listAppointment = async (req, res) => {
    try {

        const { userId } = req.body
        const appointments = await appointmentModel.find({ userId })

        res.json({ success: true, appointments })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

const paymentRazorpay = async (req, res) => {
    try {
        const { holdId, docId } = req.body;
        
        // Verify holdId
        let decodedData;
        try {
            decodedData = jwt.verify(holdId, process.env.JWT_SECRET);
        } catch (err) {
            return res.json({ success: false, message: 'Hold has expired' });
        }
        
        const docData = await doctorModel.findById(docId);
        
        // creating options for razorpay payment
        const options = {
            amount: docData.fees * 100,
            currency: process.env.CURRENCY,
        };

        // creation of an order
        const order = await razorpayInstance.orders.create(options);
        if (!order) {
            return res.json({ success: false, message: 'Something went wrong' });
        }
        res.json({ success: true, order });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API to verify payment of razorpay
const verifyRazorpay = async (req, res) => {
    try {
        const { razorpay_order_id, holdId } = req.body;
        const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id);

        if (orderInfo.status === 'paid') {
            res.json({ success: true, message: "Payment Successful" });
        }
        else {
            res.json({ success: false, message: 'Payment Failed' });
        }
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};


// API to add or update review to an appointment
const addReview = async (req, res) => {
    try {
        const { userId, appointmentId, rating, comment } = req.body;
        
        if (!rating || !comment) {
            return res.json({ success: false, message: 'Rating and comment are required' });
        }
        
        // Validate rating
        if (rating < 1 || rating > 5 || !Number.isInteger(Number(rating))) {
            return res.json({ success: false, message: 'Rating must be an integer between 1 and 5' });
        }
        
        const appointment = await appointmentModel.findById(appointmentId);
        
        // Check if appointment exists and belongs to the user
        if (!appointment) {
            return res.json({ success: false, message: 'Appointment not found' });
        }
        
        if (appointment.userId !== userId) {
            return res.json({ success: false, message: 'Unauthorized action' });
        }
        
        // Check if appointment is completed
        if (!appointment.isCompleted) {
            return res.json({ success: false, message: 'Can only review completed appointments' });
        }
        
        // Add or update review
        await appointmentModel.findByIdAndUpdate(appointmentId, {
            patientReview: { rating, comment, date: new Date() }
        });
        
        res.json({ success: true, message: 'Review submitted successfully' });
        
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API to delete a review
const deleteReview = async (req, res) => {
    try {
        const { userId, appointmentId } = req.body;
        
        const appointment = await appointmentModel.findById(appointmentId);
        
        // Check if appointment exists and belongs to the user
        if (!appointment) {
            return res.json({ success: false, message: 'Appointment not found' });
        }
        
        if (appointment.userId !== userId) {
            return res.json({ success: false, message: 'Unauthorized action' });
        }
        
        // Check if appointment has a review
        if (!appointment.patientReview) {
            return res.json({ success: false, message: 'No review found to delete' });
        }
        
        // Remove the review by setting patientReview to undefined
        await appointmentModel.findByIdAndUpdate(appointmentId, {
            $unset: { patientReview: "" }
        });
        
        res.json({ success: true, message: 'Review deleted successfully' });
        
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};
// API to temporarily hold a slot for payment
const holdSlot = async (req, res) => {
    try {
        const { userId, docId, slotDate, slotTime } = req.body;
        const docData = await doctorModel.findById(docId).select("-password");

        if (!docData.available) {
            return res.json({ success: false, message: 'Doctor Not Available' });
        }

        let slots_booked = docData.slots_booked;
        let slots_on_hold = docData.slots_on_hold || {};

        // Check if slot is already booked
        if (slots_booked[slotDate] && slots_booked[slotDate].includes(slotTime)) {
            return res.json({ success: false, message: 'Slot Not Available' });
        }

        // Check if slot is already on hold
        if (slots_on_hold[slotDate] && slots_on_hold[slotDate][slotTime]) {
            const holdTime = slots_on_hold[slotDate][slotTime].timestamp;
            // Check if hold has expired (15 minutes)
            if (Date.now() - holdTime < 15 * 60 * 1000) {
                return res.json({ success: false, message: 'Slot is currently unavailable' });
            }
        }

        // Hold the slot
        if (!slots_on_hold[slotDate]) {
            slots_on_hold[slotDate] = {};
        }
        
        slots_on_hold[slotDate][slotTime] = {
            userId,
            timestamp: Date.now()
        };

        // Update doctor with held slot
        await doctorModel.findByIdAndUpdate(docId, { slots_on_hold });

        // Generate a hold ID
        const holdId = jwt.sign(
            { userId, docId, slotDate, slotTime }, 
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        res.json({ 
            success: true, 
            message: 'Slot held successfully', 
            holdId 
        });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};


// API to finalize booking after payment
const finalizeBooking = async (req, res) => {
    try {
        const { holdId, razorpay_payment_id } = req.body;
        
        // Verify and decode holdId
        let decodedData;
        try {
            decodedData = jwt.verify(holdId, process.env.JWT_SECRET);
        } catch (err) {
            return res.json({ success: false, message: 'Hold has expired' });
        }
        
        const { userId, docId, slotDate, slotTime } = decodedData;
        const docData = await doctorModel.findById(docId).select("-password");
        
        // Verify the hold still exists
        const slots_on_hold = docData.slots_on_hold || {};
        if (!slots_on_hold[slotDate] || 
            !slots_on_hold[slotDate][slotTime] || 
            slots_on_hold[slotDate][slotTime].userId !== userId) {
            return res.json({ success: false, message: 'Hold no longer valid' });
        }
        
        // Move from hold to booked
        let slots_booked = docData.slots_booked;
        
        if (slots_booked[slotDate]) {
            slots_booked[slotDate].push(slotTime);
        } else {
            slots_booked[slotDate] = [slotTime];
        }
        
        // Remove from hold
        delete slots_on_hold[slotDate][slotTime];
        if (Object.keys(slots_on_hold[slotDate]).length === 0) {
            delete slots_on_hold[slotDate];
        }
        
        const userData = await userModel.findById(userId).select("-password");
        
        const appointmentData = {
            userId,
            docId,
            userData,
            docData: {
                _id: docData._id,
                name: docData.name,
                image: docData.image,
                speciality: docData.speciality,
                fees: docData.fees,
                degree: docData.degree,
                experience: docData.experience
            },
            amount: docData.fees,
            slotTime,
            slotDate,
            date: Date.now(),
            payment: true,
            transactionId: razorpay_payment_id
        };
        
        const newAppointment = new appointmentModel(appointmentData);
        const savedAppointment = await newAppointment.save();
        
        // Update doctor data
        await doctorModel.findByIdAndUpdate(docId, { 
            slots_booked,
            slots_on_hold
        });
        
        // Send confirmation email
        if (userData.email) {
            const emailHtml = emailTemplates.appointmentConfirmation(userData, appointmentData, razorpay_payment_id);
            sendNotificationEmail(userData.email, "Appointment Confirmation - DoctorDash", emailHtml);
        }
        
        res.json({ 
            success: true, 
            message: 'Appointment Booked Successfully', 
            appointmentId: savedAppointment._id 
        });
        
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API to resend appointment confirmation email
const resendConfirmationEmail = async (req, res) => {
    try {
        const { userId, appointmentId } = req.body;
        
        // Find the appointment
        const appointment = await appointmentModel.findById(appointmentId);
        
        // Check if appointment exists and belongs to the user
        if (!appointment) {
            return res.json({ success: false, message: 'Appointment not found' });
        }
        
        if (appointment.userId !== userId) {
            return res.json({ success: false, message: 'Unauthorized action' });
        }
        
        // Get user data
        const userData = await userModel.findById(userId).select("-password");
        
        if (!userData || !userData.email) {
            return res.json({ success: false, message: 'User email not found' });
        }
        
        // Generate and send the email
        const emailHtml = emailTemplates.appointmentConfirmation(
            userData, 
            appointment, 
            appointment.transactionId || null
        );
        
        await sendNotificationEmail(
            userData.email, 
            "Appointment Confirmation - DoctorDash", 
            emailHtml
        );
        
        res.json({ success: true, message: 'Confirmation email resent successfully' });
        
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API to release a held slot
const releaseHeldSlot = async (req, res) => {
    try {
        const { holdId } = req.body;
        
        // Verify and decode holdId
        let decodedData;
        try {
            decodedData = jwt.verify(holdId, process.env.JWT_SECRET);
        } catch (err) {
            return res.json({ success: true, message: 'Hold already expired' });
        }
        
        const { docId, slotDate, slotTime } = decodedData;
        const docData = await doctorModel.findById(docId);
        
        const slots_on_hold = docData.slots_on_hold || {};
        
        // Remove from hold if exists
        if (slots_on_hold[slotDate] && slots_on_hold[slotDate][slotTime]) {
            delete slots_on_hold[slotDate][slotTime];
            
            if (Object.keys(slots_on_hold[slotDate]).length === 0) {
                delete slots_on_hold[slotDate];
            }
            
            await doctorModel.findByIdAndUpdate(docId, { slots_on_hold });
        }
        
        res.json({ success: true, message: 'Slot released successfully' });
        
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};
export {
    loginUser,
    registerUser,
    getProfile,
    updateProfile,
    bookAppointment,
    listAppointment,
    cancelAppointment,
    paymentRazorpay,
    verifyRazorpay,
    addReview,
    deleteReview,
    holdSlot,
    finalizeBooking,
    releaseHeldSlot,
    resendConfirmationEmail,
    sendNotificationEmail,
}