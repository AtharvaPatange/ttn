import express from "express";
import bodyParser from "body-parser";
import admin from "firebase-admin";

const app = express();
app.use(bodyParser.json());

// Firebase setup - using environment variables for production
const initializeFirebase = async () => {
  if (process.env.NODE_ENV === 'production') {
    // For production (Render), use environment variables
    admin.initializeApp({
      credential: admin.credential.cert({
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL || "https://thethingsnetwork-16c4b-default-rtdb.firebaseio.com/"
    });
  } else {
    // For local development, use the service account file
    try {
      const serviceAccount = await import("./serviceAccountKey.json", { assert: { type: "json" } });
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount.default),
        databaseURL: "https://thethingsnetwork-16c4b-default-rtdb.firebaseio.com/"
      });
    } catch (error) {
      console.error("Service account file not found. Using environment variables.");
      admin.initializeApp({
        credential: admin.credential.cert({
          type: "service_account",
          project_id: process.env.FIREBASE_PROJECT_ID,
          private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
          private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          client_id: process.env.FIREBASE_CLIENT_ID,
          auth_uri: "https://accounts.google.com/o/oauth2/auth",
          token_uri: "https://oauth2.googleapis.com/token",
          auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
          client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL || "https://thethingsnetwork-16c4b-default-rtdb.firebaseio.com/"
      });
    }
  }
};

await initializeFirebase();
const db = admin.firestore();

// TTN Webhook endpoint
app.post("/ttn", async (req, res) => {
  try {
    const data = req.body;
    const deviceId = data.end_device_ids.device_id;
    const receivedAt = data.received_at;
    const payload = data.uplink_message.decoded_payload;

    const entry = {
      receivedAt,
      battery: payload.battery,
      distance: payload.distance,
      tilt: payload.tilt
    };

    await db.collection("iot-data")
      .doc(deviceId)
      .collection("messages")
      .add(entry);

    console.log("Stored:", entry);
    res.status(200).send("Data stored in Firebase");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error saving data");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
