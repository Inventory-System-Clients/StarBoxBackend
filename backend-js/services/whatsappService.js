// WhatsApp notification service using Twilio
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM; // e.g. 'whatsapp:+14155238886'
const whatsappTo = process.env.WHATSAPP_TO; // e.g. 'whatsapp:+5511995319977'

let client = null;
if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
}

async function sendWhatsAppMessage(body) {
  if (!client || !whatsappFrom || !whatsappTo) {
    console.log('Twilio WhatsApp not configured. Skipping notification.');
    return;
  }
  try {
    await client.messages.create({
      from: whatsappFrom,
      to: whatsappTo,
      body
    });
    console.log('WhatsApp message sent:', body);
  } catch (err) {
    console.error('Failed to send WhatsApp message:', err.message);
  }
}

module.exports = { sendWhatsAppMessage };
