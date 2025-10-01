import fetch from 'node-fetch';

// Sample TTN webhook payload
const testPayload = {
  "end_device_ids": {
    "device_id": "test-device-001",
    "application_ids": {
      "application_id": "my-test-app"
    }
  },
  "received_at": new Date().toISOString(),
  "uplink_message": {
    "decoded_payload": {
      "battery": 85,
      "distance": 150.5,
      "tilt": 12.3
    },
    "rx_metadata": [
      {
        "gateway_ids": {
          "gateway_id": "test-gateway"
        },
        "rssi": -45,
        "snr": 8.5
      }
    ]
  }
};

async function testWebhook() {
  try {
    console.log('🧪 Testing TTN webhook endpoint...');
    console.log('Sending test payload:', JSON.stringify(testPayload, null, 2));
    
    const response = await fetch('https://ttn.onrender.com/ttn', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    const responseText = await response.text();
    
    console.log('\n📊 Response Status:', response.status);
    console.log('📊 Response Text:', responseText);
    
    if (response.ok) {
      console.log('✅ SUCCESS: Webhook endpoint is working!');
    } else {
      console.log('❌ ERROR: Webhook endpoint failed');
    }
    
  } catch (error) {
    console.error('❌ Failed to test webhook:', error.message);
  }
}

// Run the test
testWebhook();