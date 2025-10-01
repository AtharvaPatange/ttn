import express from "express";
import bodyParser from "body-parser";
import admin from "firebase-admin";

const app = express();
app.use(bodyParser.json({ limit: '10mb' }));

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Firebase setup with better error handling
const initializeFirebase = async () => {
  try {
    if (admin.apps.length === 0) {
      if (process.env.NODE_ENV === 'production') {
        console.log('🔥 Initializing Firebase for production...');
        
        // Validate required environment variables
        const requiredEnvVars = [
          'FIREBASE_PROJECT_ID',
          'FIREBASE_PRIVATE_KEY',
          'FIREBASE_CLIENT_EMAIL'
        ];
        
        for (const envVar of requiredEnvVars) {
          if (!process.env[envVar]) {
            throw new Error(`Missing required environment variable: ${envVar}`);
          }
        }

        // Clean and format the private key
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        
        // Remove quotes if they exist
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
          privateKey = privateKey.slice(1, -1);
        }
        
        // Replace literal \n with actual newlines
        privateKey = privateKey.replace(/\\n/g, '\n');
        
        console.log('🔐 Private key format check:', {
          hasBegin: privateKey.includes('-----BEGIN PRIVATE KEY-----'),
          hasEnd: privateKey.includes('-----END PRIVATE KEY-----'),
          length: privateKey.length
        });

        admin.initializeApp({
          credential: admin.credential.cert({
            type: "service_account",
            project_id: process.env.FIREBASE_PROJECT_ID,
            private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || "",
            private_key: privateKey,
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            client_id: process.env.FIREBASE_CLIENT_ID || "",
            auth_uri: "https://accounts.google.com/o/oauth2/auth",
            token_uri: "https://oauth2.googleapis.com/token",
            auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
            client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL || ""
          }),
          databaseURL: process.env.FIREBASE_DATABASE_URL || "https://thethingsnetwork-16c4b-default-rtdb.firebaseio.com/"
        });
        
        console.log('✅ Firebase initialized for production');
      } else {
        console.log('🔥 Initializing Firebase for development...');
        try {
          const serviceAccount = await import("./serviceAccountKey.json", { assert: { type: "json" } });
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount.default),
            databaseURL: "https://thethingsnetwork-16c4b-default-rtdb.firebaseio.com/"
          });
          console.log('✅ Firebase initialized with service account file');
        } catch (error) {
          console.log('⚠️ Service account file not found, falling back to environment variables');
          // Fallback to environment variables even in development
          const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
          admin.initializeApp({
            credential: admin.credential.cert({
              type: "service_account",
              project_id: process.env.FIREBASE_PROJECT_ID,
              private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
              private_key: privateKey,
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
    }
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    throw error;
  }
};

await initializeFirebase();
const db = admin.firestore();

// Test Firebase connection
app.get('/health', async (req, res) => {
  try {
    // Test Firestore connection
    await db.collection('health-check').doc('test').set({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: 'healthy'
    });
    
    res.status(200).json({
      status: 'healthy',
      firebase: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Main TTN Webhook endpoint for multiple devices
app.post("/ttn", async (req, res) => {
  try {
    console.log('📡 Received TTN webhook data');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const data = req.body;
    
    // Validate required fields
    if (!data.end_device_ids || !data.end_device_ids.device_id) {
      return res.status(400).json({
        error: 'Missing device_id',
        message: 'end_device_ids.device_id is required'
      });
    }

    if (!data.uplink_message || !data.uplink_message.decoded_payload) {
      return res.status(400).json({
        error: 'Missing decoded_payload',
        message: 'uplink_message.decoded_payload is required'
      });
    }

    // Extract device information
    const deviceId = data.end_device_ids.device_id;
    const applicationId = data.end_device_ids.application_ids?.application_id || 'unknown-app';
    const receivedAt = data.received_at || new Date().toISOString();
    const payload = data.uplink_message.decoded_payload;

    // Extract metadata
    const metadata = {
      receivedAt,
      deviceId,
      applicationId,
      rssi: data.uplink_message.rx_metadata?.[0]?.rssi || null,
      snr: data.uplink_message.rx_metadata?.[0]?.snr || null,
      gatewayId: data.uplink_message.rx_metadata?.[0]?.gateway_ids?.gateway_id || null,
      frequency: data.uplink_message.settings?.frequency || null,
      dataRate: data.uplink_message.settings?.data_rate || null
    };

    // Create the document entry
    const entry = {
      ...metadata,
      sensorData: payload,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      rawPayload: data // Store complete payload for debugging
    };

    // Store in device-specific collection
    const collectionName = `sensor-data-${deviceId}`;
    
    console.log(`📊 Storing data for device: ${deviceId}`);
    console.log(`📦 Collection: ${collectionName}`);
    console.log(`🔋 Sensor data:`, payload);

    // Store the data
    const docRef = await db.collection(collectionName).add(entry);

    // Also store in a general collection for overview
    await db.collection('all-sensor-data').add({
      ...entry,
      docId: docRef.id,
      collection: collectionName
    });

    console.log(`✅ Data stored successfully:`, {
      deviceId,
      collection: collectionName,
      docId: docRef.id,
      sensorData: payload
    });

    res.status(200).json({
      success: true,
      message: 'Data stored successfully',
      deviceId,
      collection: collectionName,
      docId: docRef.id,
      timestamp: receivedAt
    });

  } catch (error) {
    console.error('❌ Error processing TTN webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process webhook data',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint to get latest data for a specific device
app.get("/device/:deviceId/latest", async (req, res) => {
  try {
    const { deviceId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const snapshot = await db.collection(`sensor-data-${deviceId}`)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    const data = [];
    snapshot.forEach(doc => {
      data.push({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || doc.data().timestamp
      });
    });

    res.status(200).json({
      success: true,
      deviceId,
      count: data.length,
      data
    });

  } catch (error) {
    console.error('Error fetching device data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch device data',
      details: error.message
    });
  }
});

// Endpoint to list all devices
app.get("/devices", async (req, res) => {
  try {
    const snapshot = await db.collection('all-sensor-data')
      .orderBy('timestamp', 'desc')
      .get();

    const devices = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      if (!devices[data.deviceId]) {
        devices[data.deviceId] = {
          deviceId: data.deviceId,
          applicationId: data.applicationId,
          collection: data.collection,
          lastSeen: data.timestamp?.toDate?.() || data.timestamp,
          totalMessages: 1,
          latestData: data.sensorData
        };
      } else {
        devices[data.deviceId].totalMessages++;
      }
    });

    res.status(200).json({
      success: true,
      devices: Object.values(devices),
      totalDevices: Object.keys(devices).length
    });

  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch devices',
      details: error.message
    });
  }
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    service: "TTN to Firebase Webhook",
    status: "running",
    version: "2.0.0",
    endpoints: {
      webhook: "POST /ttn",
      health: "GET /health",
      latestData: "GET /device/:deviceId/latest",
      allDevices: "GET /devices"
    },
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 TTN Webhook Server running on port ${PORT}`);
  console.log(`🔗 Webhook URL: http://localhost:${PORT}/ttn`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
  console.log(`🔗 All Devices: http://localhost:${PORT}/devices`);
});
