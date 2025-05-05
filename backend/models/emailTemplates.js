const emailTemplates = {
    appointmentConfirmation: (userData, appointmentData, transactionId = null) => `
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Appointment Confirmation</title>
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
                  background-color: #4CAF50;
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
              .receipt {
                  margin: 20px 0;
                  padding: 15px;
                  background-color: #f0f7ff;
                  border: 1px dashed #aad4ff;
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
              <h1>Appointment Confirmed</h1>
          </div>
          <div class="content">
              <p>Dear ${userData.name},</p>
              <p>Your appointment with Dr. ${appointmentData.docData.name} has been confirmed.</p>
              
              <div class="details">
                  <p><strong>Date:</strong> ${appointmentData.slotDate}</p>
                  <p><strong>Time:</strong> ${appointmentData.slotTime}</p>
                  <p><strong>Doctor:</strong> Dr. ${appointmentData.docData.name} (${appointmentData.docData.speciality})</p>
                  <p><strong>Fee:</strong> ${appointmentData.amount}</p>
              </div>
              
              ${transactionId ? `
              <div class="receipt">
                  <h3>Payment Receipt</h3>
                  <p><strong>Transaction ID:</strong> ${transactionId}</p>
                  <p><strong>Amount Paid:</strong> ${appointmentData.amount}</p>
                  <p><strong>Payment Date:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
              ` : ''}
              
              <p>Please arrive 15 minutes before your appointment. If you need to cancel or reschedule, please do so at least 24 hours in advance.</p>
              
              <p>Thank you for choosing DoctorDash for your healthcare needs.</p>
          </div>
          <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} DoctorDash. All rights reserved.</p>
          </div>
      </body>
      </html>
    `,
    
    appointmentCancellation: (userData, appointmentData, cancelledBy) => `
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Appointment Cancellation</title>
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
              <h1>Appointment Cancelled</h1>
          </div>
          <div class="content">
              <p>Dear ${userData.name},</p>
              <p>Your appointment with Dr. ${appointmentData.docData.name} has been cancelled ${cancelledBy === 'doctor' ? 'by the doctor' : 'as requested'}.</p>
              
              <div class="details">
                  <p><strong>Date:</strong> ${appointmentData.slotDate}</p>
                  <p><strong>Time:</strong> ${appointmentData.slotTime}</p>
                  <p><strong>Doctor:</strong> Dr. ${appointmentData.docData.name} (${appointmentData.docData.speciality})</p>
              </div>
              
              ${cancelledBy === 'doctor' ? 
                '<p>We apologize for any inconvenience this may cause. The doctor might have had an emergency or other unavoidable circumstance.</p>' :
                '<p>Your appointment has been successfully cancelled as per your request.</p>'}
              
              <p>You can reschedule your appointment through our app or website at your convenience.</p>
              
              <p>Thank you for choosing DoctorDash for your healthcare needs.</p>
          </div>
          <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} DoctorDash. All rights reserved.</p>
          </div>
      </body>
      </html>
    `,
    appointmentReminder: (user, appointment, timeframe) => {
        const doctorName = appointment.docData.name;
        const speciality = appointment.docData.speciality || 'Specialist';
        
        return `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <div style="text-align: center; margin-bottom: 20px; background-color: #f0f8ff; padding: 10px; border-radius: 4px;">
                  <h2 style="color: #3b82f6; margin: 0;">Appointment Reminder</h2>
                  <p style="margin: 5px 0 0 0; color: #666;">Your appointment is ${timeframe} from now</p>
                </div>
                
                <p>Hello ${user.name},</p>
                
                <p>This is a friendly reminder that your appointment with <strong>Dr. ${doctorName}</strong> (${speciality}) is <strong>${timeframe}</strong> from now.</p>
                
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #4b5563;">Appointment Details</h3>
                  <p><strong>Date:</strong> ${appointment.slotDate}</p>
                  <p><strong>Time:</strong> ${appointment.slotTime}</p>
                  <p><strong>Doctor:</strong> Dr. ${doctorName}</p>
                  <p><strong>Speciality:</strong> ${speciality}</p>
                  ${appointment.amount ? `<p><strong>Consultation Fee:</strong> ₹${appointment.amount}</p>` : ''}
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.FRONTEND_URL}/appointments" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Appointment Details</a>
                </div>
                
                <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
                  <p style="margin: 0; color: #666;">If you need to cancel or reschedule, please do so at least 4 hours before your appointment time.</p>
                  <p style="margin: 20px 0 0 0;">Best regards,<br>DoctorDash Team</p>
                </div>
              </div>
            </body>
          </html>
        `;
      },
  };
  export default emailTemplates;