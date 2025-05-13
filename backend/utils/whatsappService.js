import axios from 'axios';
import dotenv from 'dotenv';
import Vital from '../models/vitalModel.js';
import User from '../models/userModel.js';

dotenv.config();

// WhatsApp API configuration
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WEBHOOK_VERIFICATION_TOKEN = process.env.WEBHOOK_VERIFICATION_TOKEN;
 
// Send WhatsApp message
export const sendWhatsAppMessage = async (phoneNumber, message) => {
  try {
    // Make sure phone number is in international format (e.g., 919876543210)
    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    const response = await axios.post(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "text",
        text: {
          preview_url: false,
          body: message
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('WhatsApp message sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.response?.data || error.message);
    throw error;
  }
};

// Send WhatsApp interactive message with reply buttons
export const sendReminderWithButtons = async (reminder) => {
  try {
    const user = await User.findById(reminder.userId);
    if (!user.phone || user.phone === '000000000') {
      console.warn(`User ${user._id} has no valid phone number for WhatsApp reminder`);
      return null;
    }

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
    const formattedPhone = formatPhoneNumber(user.phone);

    const response = await axios.post(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "interactive",
        interactive: {
          type: "button",
          body: {
            text: `Hi ${user.name},\n\nIt's time to log your ${vitalName} reading. Would you like to record it now?`
          },
          action: {
            buttons: [
              {
                type: "reply",
                reply: {
                  id: `record_${reminder.vitalType}_${reminder._id}`,
                  title: "Record Now"
                }
              },
              {
                type: "reply",
                reply: {
                  id: `remind_later_${reminder._id}`,
                  title: "Remind Later"
                }
              }
            ]
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('WhatsApp interactive message sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending WhatsApp interactive message:', error.response?.data || error.message);
    throw error;
  }
};

// Format phone number to international format
const formatPhoneNumber = (phone) => {
  // Remove any non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Add '+' if not already present
  if (!cleaned.startsWith('91')) {
    cleaned = '91' + cleaned;
  }
  
  return cleaned;
};

// Process incoming WhatsApp messages
export const processIncomingMessage = async (message) => {
  try {
    const messageType = message.type;
    const from = message.from; // User's phone number
    
    // Find user by phone number
    const user = await User.findOne({ phone: from.replace('91', '') });
    
    if (!user) {
      console.warn(`Received WhatsApp message from unknown user: ${from}`);
      return {
        success: false,
        message: 'User not found'
      };
    }
    
    // Process text messages
    if (messageType === 'text') {
      const text = message.text.body.toLowerCase();
      
      // Check if it's a vital reading
      const vitalPattern = /^(bp|hr|bs|temp|weight|spo2)\s+(\d+)(\s+(\d+))?/i;
      const match = text.match(vitalPattern);
      
      if (match) {
        const vitalTypeMap = {
          'bp': 'blood-pressure',
          'hr': 'heart-rate',
          'bs': 'blood-sugar',
          'temp': 'body-temperature',
          'weight': 'weight',
          'spo2': 'oxygen-level'
        };
        
        const vitalType = vitalTypeMap[match[1].toLowerCase()];
        const primaryValue = parseFloat(match[2]);
        const secondaryValue = match[4] ? parseFloat(match[4]) : 0;
        
        // Create current date and time
        const now = new Date();
        const date = now.toISOString().split('T')[0];
        const time = now.toTimeString().split(' ')[0];
        
        // Save vital
        const vital = new Vital({
          userId: user._id,
          type: vitalType,
          primaryValue,
          secondaryValue,
          date,
          time,
          note: 'Recorded via WhatsApp'
        });
        
        await vital.save();
        
        // Send confirmation
        await sendWhatsAppMessage(from, `✅ Your ${vitalType.replace('-', ' ')} reading has been recorded successfully!`);
        
        return {
          success: true,
          message: 'Vital recorded successfully',
          vital
        };
      }
      
      // If it's not a vital reading pattern, send help message
      await sendWhatsAppMessage(from, 
        "To record your vitals, use one of these formats:\n\n" +
        "BP [systolic] [diastolic] - For blood pressure\n" +
        "HR [value] - For heart rate\n" +
        "BS [value] - For blood sugar\n" +
        "TEMP [value] - For body temperature\n" +
        "WEIGHT [value] - For weight\n" +
        "SPO2 [value] - For oxygen level\n\n" +
        "Example: BP 120 80"
      );
      
      return {
        success: true,
        message: 'Help message sent'
      };
    }
    
    // Process interactive messages (button responses)
    if (messageType === 'interactive') {
      const interactiveType = message.interactive.type;
      
      if (interactiveType === 'button_reply') {
        const buttonId = message.interactive.button_reply.id;
        
        // Handle "Record Now" button
        if (buttonId.startsWith('record_')) {
          const parts = buttonId.split('_');
          const vitalType = parts[1];
          
          await sendWhatsAppMessage(from, 
            `Please send your ${vitalType.replace('-', ' ')} reading in this format:\n\n` +
            (vitalType === 'blood-pressure' ? 
              "BP [systolic] [diastolic]\nExample: BP 120 80" : 
              `${vitalType.substr(0, 2).toUpperCase()} [value]\nExample: ${vitalType.substr(0, 2).toUpperCase()} 98`)
          );
          
          return {
            success: true,
            message: 'Recording instructions sent'
          };
        }
        
        // Handle "Remind Later" button
        if (buttonId.startsWith('remind_later_')) {
          const reminderId = parts[2];
          
          // Update reminder to be sent again in 1 hour
          // This would need additional logic in your reminderModel
          
          await sendWhatsAppMessage(from, "We'll remind you again in 1 hour.");
          
          return {
            success: true,
            message: 'Reminder postponed'
          };
        }
      }
    }
    
    // Default response for unrecognized messages
    await sendWhatsAppMessage(from, 
      "I didn't understand that message. For help recording your vitals, simply reply with 'help'."
    );
    
    return {
      success: true,
      message: 'Default response sent'
    };
    
  } catch (error) {
    console.error('Error processing incoming WhatsApp message:', error);
    return {
      success: false,
      message: error.message || 'Failed to process WhatsApp message'
    };
  }
};

// Verify webhook for WhatsApp
export const verifyWebhook = (mode, token) => {
  if (mode === 'subscribe' && token === WEBHOOK_VERIFICATION_TOKEN) {
    return true;
  }
  return false;
};