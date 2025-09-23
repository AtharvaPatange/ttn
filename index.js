import express from "express";
import bodyParser from "body-parser";
import admin from "firebase-admin";
import serviceAccount from "./serviceAccountKey.json" assert { type: "json" };

const app = express();
app.use(bodyParser.json());

// Firebase setup
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://thethingsnetwork-16c4b-default-rtdb.firebaseio.com/"
});
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
