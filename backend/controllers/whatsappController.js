import WhatsAppService from '../utils/whatsappService.js';

export const whatsappWebhook = async (req, res) => {
  // Handle GET request for webhook verification
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const challenge = req.query['hub.challenge'];
    const verifyToken = req.query['hub.verify_token'];

    // Check if a token and mode is in the query string of the request
    if (mode === 'subscribe' && verifyToken === process.env.WHATSAPP_VERIFY_TOKEN) {
      // Respond with the challenge token from the request
      console.log('Webhook verified successfully');
      return res.status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      return res.sendStatus(403);
    }
  }

  // Handle POST request with incoming messages
  if (req.method === 'POST') {
    try {
      const data = req.body;

      // Verify this is a WhatsApp message event
      if (data.object === 'whatsapp_business_account') {
        // Process each message
        const messages = data.entry[0].changes[0].value.messages;
        
        if (messages && messages.length > 0) {
          // Process the first message
          await WhatsAppService.processIncomingMessage(data);
        }

        // Send a 200 OK response to acknowledge receipt of the webhook
        return res.sendStatus(200);
      }

      // If not a WhatsApp message, return error
      return res.sendStatus(404);
    } catch (error) {
      console.error('Error in WhatsApp webhook:', error);
      return res.sendStatus(500);
    }
  }

  // Method not allowed
  return res.sendStatus(405);
};

// Modify the existing reminder controller to include WhatsApp sending
export const sendReminderViaWhatsApp = async (reminder) => {
  try {
    return await WhatsAppService.sendReminderWhatsAppMessage(reminder);
  } catch (error) {
    console.error('Error sending WhatsApp reminder:', error);
    return false;
  }
};