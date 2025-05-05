import { processAppointmentReminders } from '../controllers/AppointmentReminderController.js';
import cron from 'node-cron';

// Process appointment reminders every minute
const setupAppointmentReminderScheduler = () => {
  console.log('Setting up appointment reminder scheduler...');
  
  // Run every minute to catch both 1-hour and 1-minute reminders
  cron.schedule('* * * * *', async () => {
    console.log('Running appointment reminder check:', new Date().toISOString());
    try {
      const result = await processAppointmentReminders();
      console.log('Appointment reminder processing completed:', result);
    } catch (error) {
      console.error('Error in appointment reminder scheduler:', error);
    }
  });
  
  console.log('Appointment reminder scheduler set up successfully');
};

export default setupAppointmentReminderScheduler;