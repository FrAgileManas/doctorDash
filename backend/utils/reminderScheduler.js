import { processDueReminders } from '../controllers/reminderController.js';
import cron from 'node-cron';

// Process reminders every 5 minutes
const setupReminderScheduler = () => {
  console.log('Setting up reminder scheduler...');
  
  // Run every 5 minutes
  cron.schedule('*/1 * * * *', async () => {
    console.log('Running reminder check job:', new Date().toISOString());
    try {
      const result = await processDueReminders();
      console.log('Reminder processing completed:', result);
    } catch (error) {
      console.error('Error in reminder scheduler:', error);
    }
  });
  
  console.log('Reminder scheduler set up successfully');
};

export default setupReminderScheduler;