import Reminder from '../models/reminderModel.js';
import User from '../models/userModel.js'; // Assuming you have a User model
import { EmailClient } from '@azure/communication-email';
import dotenv from 'dotenv';
import { sendWhatsAppMessage, sendReminderWithButtons } from '../utils/whatsappService.js';

dotenv.config();

// Azure Communication Services Email Client
const connectionString = process.env.COMMUNICATION_SERVICES_CONNECTION_STRING;
const emailClient = new EmailClient(connectionString);
const senderAddress = 'DoNotReply@d718c6b6-e8fb-4927-9631-85ded959af50.azurecomm.net';

// Get all reminders for a user
export const getReminders = async (req, res) => {
  try {
    const reminders = await Reminder.find({ userId: req.user._id }).sort({ createdAt: -1 });
    
    return res.status(200).json({
      success: true,
      reminders
    });
  } catch (error) {
    console.error('Error fetching reminders:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch reminders'
    });
  }
};

// Add a new reminder
export const addReminder = async (req, res) => {
  try {
    const { vitalType, frequency, time, daysOfWeek = [], active = true, notificationMethod = ['email'] } = req.body;
    
    // Validate required fields
    if (!vitalType || !frequency || !time) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }
    
    // For weekly frequency, ensure at least one day is selected
    if (frequency === 'weekly' && (!daysOfWeek || daysOfWeek.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one day of the week for weekly reminders'
      });
    }
    
    // Create and save new reminder
    const reminder = new Reminder({
      userId: req.user._id,
      vitalType,
      frequency,
      time,
      daysOfWeek: frequency === 'weekly' ? daysOfWeek : [],
      active,
      notificationMethod // New field to specify email, whatsapp, or both
    });
    
    await reminder.save();
    
    return res.status(201).json({
      success: true,
      message: 'Reminder created successfully',
      reminder
    });
  } catch (error) {
    console.error('Error adding reminder:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to add reminder'
    });
  }
};

// Update an existing reminder
export const updateReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const { vitalType, frequency, time, daysOfWeek, active, notificationMethod } = req.body;
    
    // Find reminder and check ownership
    const reminder = await Reminder.findById(id);
    
    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }
    
    if (reminder.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this reminder'
      });
    }
    
    // Update fields
    if (vitalType) reminder.vitalType = vitalType;
    if (frequency) reminder.frequency = frequency;
    if (time) reminder.time = time;
    if (notificationMethod) reminder.notificationMethod = notificationMethod;
    
    // Handle days of week based on frequency
    if (frequency === 'weekly' && daysOfWeek) {
      if (daysOfWeek.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Please select at least one day of the week for weekly reminders'
        });
      }
      reminder.daysOfWeek = daysOfWeek;
    } else if (frequency === 'daily') {
      reminder.daysOfWeek = [];
    }
    
    if (active !== undefined) reminder.active = active;
    
    // Reset nextScheduled time when updating
    reminder.lastSent = null;
    
    await reminder.save();
    
    return res.status(200).json({
      success: true,
      message: 'Reminder updated successfully',
      reminder
    });
  } catch (error) {
    console.error('Error updating reminder:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update reminder'
    });
  }
};

// Delete a reminder
export const deleteReminder = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find reminder and check ownership
    const reminder = await Reminder.findById(id);
    
    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }
    
    if (reminder.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this reminder'
      });
    }
    
    await Reminder.findByIdAndDelete(id);
    
    return res.status(200).json({
      success: true,
      message: 'Reminder deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting reminder:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete reminder'
    });
  }
};

// Process due reminders (to be called by a scheduled job)
export const processDueReminders = async () => {
  try {
    const now = new Date();
    
    // Find all active reminders that are due
    const dueReminders = await Reminder.find({
      active: true,
      nextScheduled: { $lte: now }
    }).populate('userId', 'name email phone');
    
    console.log(`Processing ${dueReminders.length} due reminders`);
    
    for (const reminder of dueReminders) {
      try {
        // Skip if user doesn't exist
        if (!reminder.userId) {
          console.warn(`Skipping reminder ${reminder._id}: User not found`);
          continue;
        }
        
        // Send notifications based on user's preferences
        const notificationMethods = reminder.notificationMethod || ['email'];
        
        // Send email notification if selected
        if (notificationMethods.includes('email') && reminder.userId.email) {
          try {
            await sendReminderEmail(reminder);
            console.log(`Email reminder sent to ${reminder.userId.email}`);
          } catch (emailError) {
            console.error(`Failed to send email reminder to ${reminder.userId.email}:`, emailError);
          }
        }
        
        // Send WhatsApp notification if selected
        if (notificationMethods.includes('whatsapp') && reminder.userId.phone && reminder.userId.phone !== '000000000') {
          try {
            await sendReminderWithButtons(reminder);
            console.log(`WhatsApp reminder sent to ${reminder.userId.phone}`);
          } catch (whatsappError) {
            console.error(`Failed to send WhatsApp reminder to ${reminder.userId.phone}:`, whatsappError);
          }
        }
        
        // Update reminder with new next scheduled time
        reminder.lastSent = now;
        await reminder.save(); // This will recalculate nextScheduled via pre-save hook
        
      } catch (processingError) {
        console.error(`Failed to process reminder ${reminder._id}:`, processingError);
      }
    }
    
    return {
      success: true,
      processedCount: dueReminders.length
    };
  } catch (error) {
    console.error('Error processing reminders:', error);
    return {
      success: false,
      message: 'Failed to process reminders',
      error: error.message
    };
  }
};

// Send reminder email using Azure Communication Services
const sendReminderEmail = async (reminder) => {
  // Get human-readable vital type
  const vitalTypeMap = {
    'blood-pressure': 'Blood Pressure',
    'heart-rate': 'Heart Rate',
    'blood-sugar': 'Blood Sugar',
    'body-temperature': 'Body Temperature',
    'weight': 'Weight',
    'oxygen-level': 'Oxygen Level'
  };
  
  const vitalName = vitalTypeMap[reminder.vitalType] || reminder.vitalType;
  const userName = reminder.userId.name || 'there';
  
  // Create email message
  const message = {
    senderAddress: senderAddress,
    content: {
      subject: `Time to track your ${vitalName}`,
      plainText: `Hi ${userName},\n\nThis is a friendly reminder to log your ${vitalName} reading in your health tracker.\n\nStaying consistent with your health tracking helps you and your healthcare provider make better decisions about your care.\n\nSimply open your health app or click the link below to log your reading now:\n${process.env.FRONTEND_URL}/redirect\n\nBest regards,\nYour Health App Team`,
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #3b82f6;">Health Tracker Reminder</h2>
              </div>
              <p>Hi ${userName},</p>
              <p>This is a friendly reminder to log your <strong>${vitalName}</strong> reading in your health tracker.</p>
              <p>Staying consistent with your health tracking helps you and your healthcare provider make better decisions about your care.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://cheetah-humble-dolphin.ngrok-free.app/redirect" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Log Your Reading Now</a>
              </div>
              <p>Best regards,<br>Your Health App Team</p>
            </div>
          </body>
        </html>
      `
    },
    recipients: {
      to: [
        {
          address: reminder.userId.email,
          displayName: reminder.userId.name
        }
      ]
    }
  };
  
  try {
    const poller = await emailClient.beginSend(message);
    const response = await poller.pollUntilDone();
    
    console.log(`Email sent successfully to ${reminder.userId.email}, messageId: ${response.messageId}`);
    return response;
  } catch (error) {
    console.error(`Failed to send email to ${reminder.userId.email}:`, error);
    throw error;
  }
};

// Test endpoint to send a reminder email immediately
export const testReminderEmail = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find reminder and check ownership
    const reminder = await Reminder.findById(id).populate('userId', 'name email phone');
    
    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }
    
    if (reminder.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to test this reminder'
      });
    }
    
    // Send notifications based on specified method
    const notificationMethod = req.query.method || 'email';
    
    if (notificationMethod === 'email') {
      await sendReminderEmail(reminder);
      
      return res.status(200).json({
        success: true,
        message: 'Test reminder email sent successfully'
      });
    } else if (notificationMethod === 'whatsapp') {
      if (!reminder.userId.phone || reminder.userId.phone === '000000000') {
        return res.status(400).json({
          success: false,
          message: 'User does not have a valid phone number for WhatsApp'
        });
      }
      
      await sendReminderWithButtons(reminder);
      
      return res.status(200).json({
        success: true,
        message: 'Test WhatsApp reminder sent successfully'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification method specified'
      });
    }
  } catch (error) {
    console.error('Error sending test reminder:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send test reminder'
    });
  }
};