const WHATSAPP_API_URL = import.meta.env.VITE_WHATSAPP_API_URL || 'https://id-preview--a6715b30-52a3-42ea-982d-6729ceacd0cb.lovable.app/api/public/v1/57de5312-e9d0-4244-a35d-623aa9e27ae0';
const WHATSAPP_API_KEY = import.meta.env.VITE_WHATSAPP_API_KEY || '';

export const sendWhatsAppNotification = async (phoneNumber: string, message: string) => {
  try {
    const response = await fetch(WHATSAPP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WHATSAPP_API_KEY}`
      },
      body: JSON.stringify({
        to: phoneNumber,
        message: message,
      })
    });

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to send WhatsApp notification:', error);
  }
};
