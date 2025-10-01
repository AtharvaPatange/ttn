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
    console.log('🧪 Testing TTN webhook endpoint on Render...');
    console.log('🌐 URL: https://ttn.onrender.com/ttn');
    console.log('📦 Payload:', JSON.stringify(testPayload, null, 2));
    
    const response = await fetch('https://ttn.onrender.com/ttn', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TTN-Test-Client/1.0'
      },
      body: JSON.stringify(testPayload)
    });

    const responseText = await response.text();
    
    console.log('\n📊 Response Details:');
    console.log('   Status:', response.status);
    console.log('   Status Text:', response.statusText);
    console.log('   Content-Type:', response.headers.get('content-type'));
    console.log('   Response Body:', responseText);
    
    if (response.ok) {
      console.log('\n✅ SUCCESS: Webhook is working correctly!');
      console.log('📝 Data should be stored in Firebase Firestore');
    } else {
      console.log('\n❌ ERROR: Webhook failed');
      if (response.status === 500) {
        console.log('💡 This is likely a Firebase configuration issue.');
        console.log('   Check your Render environment variables:');
        console.log('   - FIREBASE_PROJECT_ID');
        console.log('   - FIREBASE_PRIVATE_KEY');
        console.log('   - FIREBASE_CLIENT_EMAIL');
        console.log('   - All other Firebase environment variables');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Network Error:', error.message);
    console.log('💡 Make sure your Render app is running and accessible');
  }
}

// Test basic connectivity first
async function testConnectivity() {
  try {
    console.log('🔗 Testing basic connectivity to Render app...');
    const response = await fetch('https://ttn.onrender.com/', {
      method: 'GET'
    });
    
    console.log('   Status:', response.status);
    console.log('   App is reachable:', response.status < 500 ? '✅' : '❌');
    
  } catch (error) {
    console.error('❌ Connectivity test failed:', error.message);
  }
}

// Run tests
async function runTests() {
  await testConnectivity();
  console.log('\n' + '='.repeat(50));
  await testWebhook();
}

runTests();