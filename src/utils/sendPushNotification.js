const { Expo } = require('expo-server-sdk');

// Creamos un objeto Expo
const expo = new Expo();

// Función para enviar una notificación
async function sendPushNotification(pushToken, title, body) {
  if (!Expo.isExpoPushToken(pushToken)) {
    console.error(`Push token no válido: ${pushToken}`);
    return;
  }

  const message = {
    to: pushToken,
    sound: 'default',
    title: title,
    body: body,
    data: { withSome: 'data' },
    channelId: 'default', // 👈 esto es obligatorio para Android
  };

  try {
    const ticketChunk = await expo.sendPushNotificationsAsync([message]);
    console.log('Ticket enviado:', ticketChunk);
  } catch (error) {
    console.error('Error enviando push notification:', error);
  }
}

module.exports = { sendPushNotification };
