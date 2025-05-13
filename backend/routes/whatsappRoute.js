import express from 'express';
import { verifyWebhook, processIncomingMessage } from '../utils/whatsappService.js';
import bodyParser from 'body-parser';

const whatsappRouter = express.Router();

// WhatsApp webhook verification
whatsappRouter.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (verifyWebhook(mode, token)) {
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Verification failed');
  }
});

// Process incoming messages
whatsappRouter.post('/webhook', bodyParser.json(), async (req, res) => {
  console.log('Received webhook data:', JSON.stringify(req.body));
  
  try {
    if (req.body.object === 'whatsapp_business_account') {
      // Meta sends batch of entries
      for (const entry of req.body.entry) {
        // Each entry can have multiple changes
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            for (const message of change.value.messages || []) {
              // Process each message
              await processIncomingMessage({
                type: message.type,
                from: message.from,
                text: message.text,
                interactive: message.interactive
              });
            }
          }
        }
      }
      
      // Always return 200 OK to acknowledge receipt
      res.status(200).send('EVENT_RECEIVED');
    } else {
      // Not from WhatsApp
      res.status(404).send('Not Found');
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(200).send('EVENT_RECEIVED');
  }
});

export default whatsappRouter;