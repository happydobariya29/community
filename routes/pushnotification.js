const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('../config/push-notification-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const sendnotification = async (notificationData, res) => {
  try {
    const { fcm_token, device_type, moduleName, Title, Description } = notificationData.body;
    console.log(fcm_token)
    if (!fcm_token) {
      return res.status(400).json({ error: 'FCM token is required' });
    }

    // Check if device type is provided
    if (!device_type || (device_type !== 'android' && device_type !== 'ios')) {
      return res.status(400).json({ error: 'Device type must be either "android" or "ios"' });
    }


    const notificationMessage = {
      title: `${Title}`,
      body: `Check out the latest ${moduleName} added. Tap to view details.`,
    };

    const dataPayload = {
      Title: Title,
      moduleName: moduleName,
      Description: Description,
    };

    let message = {
      token: fcm_token,
      notification: notificationMessage,
      data: dataPayload,
    };

    // Handle notification logic based on device type (Android or iOS)
    if (device_type === 'android') {
      message.android = {
        notification: {
          title: notificationMessage.title,
          body: notificationMessage.body,
          sound: "default",
        },
        priority: "high",
      };
    } else if (device_type === 'ios') {
      message.apns = {
        payload: {
          aps: {
            alert: {
              title: notificationMessage.title,
              body: notificationMessage.body,
            },
            sound: "default",
            badge: 1,
          },
        },
      };
    }


    const response = await admin.messaging().send(message);
    return res.status(200).json({ response, message: "Notification successfully sent" });

  } catch (err) {
    console.error("Error sending notification:", err);
    return res.status(500).json({ error: err.message });
  }
};

module.exports = sendnotification;
