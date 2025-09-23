# TTN Firebase Webhook

A Node.js webhook server that receives data from The Things Network (TTN) and stores it in Firebase Firestore.

## Features

- Receives TTN webhook POST requests
- Extracts device data (battery, distance, tilt)
- Stores data in Firebase Firestore
- Supports both local development and production deployment

## Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Place your `serviceAccountKey.json` file in the root directory
4. Start the server:
   ```bash
   node index.js
   ```
5. Test the webhook:
   ```bash
   node test-webhook.js
   ```

## Deployment on Render

### Environment Variables

Set the following environment variables in your Render service:

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment type | `production` |
| `FIREBASE_PROJECT_ID` | Firebase project ID | `thethingsnetwork-16c4b` |
| `FIREBASE_PRIVATE_KEY_ID` | Private key ID from service account | `6e97262b94f...` |
| `FIREBASE_PRIVATE_KEY` | Private key from service account | `-----BEGIN PRIVATE KEY-----\n...` |
| `FIREBASE_CLIENT_EMAIL` | Client email from service account | `firebase-adminsdk-...@...iam.gserviceaccount.com` |
| `FIREBASE_CLIENT_ID` | Client ID from service account | `11234567890...` |
| `FIREBASE_CLIENT_CERT_URL` | Client certificate URL | `https://www.googleapis.com/robot/v1/metadata/x509/...` |
| `FIREBASE_DATABASE_URL` | Firebase Realtime Database URL | `https://your-project-default-rtdb.firebaseio.com/` |

### Deployment Steps

1. Push your code to GitHub
2. Create a new Web Service on Render
3. Connect your GitHub repository
4. Set the build command: `npm install`
5. Set the start command: `node index.js`
6. Add all the environment variables listed above
7. Deploy!

### Getting Firebase Service Account Values

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Download the JSON file
4. Extract the values and add them as environment variables:
   - `type` → Not needed (hardcoded)
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `private_key_id` → `FIREBASE_PRIVATE_KEY_ID`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (keep the newlines as `\n`)
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `client_id` → `FIREBASE_CLIENT_ID`
   - `client_x509_cert_url` → `FIREBASE_CLIENT_CERT_URL`

## API Endpoint

- **POST** `/ttn` - Receives TTN webhook data

Expected payload structure:
```json
{
  "end_device_ids": {
    "device_id": "your-device-id"
  },
  "received_at": "2023-01-01T00:00:00.000Z",
  "uplink_message": {
    "decoded_payload": {
      "battery": 85,
      "distance": 150.5,
      "tilt": 12.3
    }
  }
}
```

## Firebase Data Structure

Data is stored in Firestore with the following structure:
```
iot-data/{deviceId}/messages/{auto-generated-id}
```

Each message document contains:
- `receivedAt`: Timestamp when data was received
- `battery`: Battery level
- `distance`: Distance measurement
- `tilt`: Tilt angle