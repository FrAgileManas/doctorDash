import Appointment from '../models/appointmentModel.js';
import userModel from "../models/userModel.js";
import { sendNotificationEmail } from '../controllers/userController.js';
import emailTemplates from "../models/emailTemplates.js";

// Process upcoming appointment reminders
export const processAppointmentReminders = async () => {
  try {
    const now = new Date();
    
    // Find all appointments that are in the future and not cancelled
    const upcomingAppointments = await Appointment.find({
      cancelled: { $ne: true },
      // Only future appointments
      $expr: {
        $gt: [
          { 
            $dateFromString: { 
              dateString: "$slotDate", 
              format: "%m_%d_%Y" 
            } 
          }, 
          now
        ]
      }
    });
    
    console.log(`Processing ${upcomingAppointments.length} upcoming appointments for reminders`);
    
    for (const appointment of upcomingAppointments) {
      try {
        // Skip if userData doesn't exist or has no email
        if (!appointment.userData || !appointment.userData.email) {
          console.warn(`Skipping appointment ${appointment._id}: User data not found or missing email`);
          continue;
        }
        
        // Calculate appointment datetime
        const appointmentDate = new Date(appointment.slotDate);
        const [hours, minutes] = appointment.slotTime.split(':').map(Number);
        appointmentDate.setHours(hours, minutes, 0, 0);
        
        // Calculate time until appointment
        const timeUntilAppointment = appointmentDate - now;
        const minutesUntilAppointment = Math.floor(timeUntilAppointment / (1000 * 60));
        
        // Check if we need to send reminders
        // 1 hour = 60 minutes
        if (minutesUntilAppointment <= 60 && minutesUntilAppointment >= 59) {
          // Send 1-hour reminder
          console.log(`Sending 1-hour reminder for appointment ${appointment._id}`);
          await sendAppointmentReminderEmail(appointment, '1 hour');
        } else if (minutesUntilAppointment <= 1 && minutesUntilAppointment >= 0) {
          // Send 1-minute reminder
          console.log(`Sending 1-minute reminder for appointment ${appointment._id}`);
          await sendAppointmentReminderEmail(appointment, '1 minute');
        }
        
      } catch (emailError) {
        console.error(`Failed to process appointment reminder ${appointment._id}:`, emailError);
      }
    }
    
    return {
      success: true,
      processedCount: upcomingAppointments.length
    };
  } catch (error) {
    console.error('Error processing appointment reminders:', error);
    return {
      success: false,
      message: 'Failed to process appointment reminders',
      error: error.message
    };
  }
};

// Send appointment reminder email
async function sendAppointmentReminderEmail(appointment, timeframe) {
  try {
    // Use userData directly instead of userId
    const userData = appointment.userData;
    
    if (!userData || !userData.email) {
      console.warn(`Cannot send reminder: user email not found for appointment ${appointment._id}`);
      return;
    }

    // Get doctor name
    const doctorName = appointment.docData.name;
    
    // Prepare email content
    const subject = `Appointment Reminder - ${timeframe} from now`;
    let htmlContent = '';
    
    // Check if we have an appointment reminder template
    if (emailTemplates.appointmentReminder) {
      htmlContent = emailTemplates.appointmentReminder(userData, appointment, timeframe);
    } else {
      // Fallback template
      htmlContent = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #3b82f6;">Appointment Reminder</h2>
              </div>
              <p>Hi ${userData.name},</p>
              <p>This is a friendly reminder that your appointment with Dr. ${doctorName} is ${timeframe} from now.</p>
              <p><strong>Date:</strong> ${appointment.slotDate}</p>
              <p><strong>Time:</strong> ${appointment.slotTime}</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/appointments" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Appointment Details</a>
              </div>
              <p>Best regards,<br>DoctorDash Team</p>
            </div>
          </body>
        </html>
      `;
    }
    
    // Send email
    await sendNotificationEmail(userData.email, subject, htmlContent);
    
    console.log(`${timeframe} reminder sent successfully to ${userData.email} for appointment ${appointment._id}`);
    return true;
  } catch (error) {
    console.error(`Failed to send appointment reminder:`, error);
    return false;
  }
}