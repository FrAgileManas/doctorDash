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
    `
  };
  export default emailTemplates;