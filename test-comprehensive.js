import fetch from 'node-fetch';

// Sample TTN webhook payload based on your device data
const createTestPayload = (deviceId, sensorData) => ({
  "end_device_ids": {
    "device_id": deviceId,
    "application_ids": {
      "application_id": "smart-waste-management"
    },
    "dev_eui": "70B3D57ED005B234",
    "join_eui": "0000000000000000"
  },
  "correlation_ids": [
    `as:up:01234567-${Date.now()}`
  ],
  "received_at": new Date().toISOString(),
  "uplink_message": {
    "session_key_id": "AY1234567890ABCDEF==",
    "f_port": 1,
    "f_cnt": Math.floor(Math.random() * 1000),
    "frm_payload": "base64_encoded_payload_here",
    "decoded_payload": sensorData,
    "rx_metadata": [
      {
        "gateway_ids": {
          "gateway_id": "test-gateway-001",
          "eui": "0123456789ABCDEF"
        },
        "time": new Date().toISOString(),
        "timestamp": Date.now(),
        "rssi": Math.floor(Math.random() * 50) - 100, // -100 to -50
        "channel_rssi": Math.floor(Math.random() * 50) - 100,
        "snr": Math.random() * 15 - 5, // -5 to 10
        "uplink_token": "test_token_123456",
        "channel_index": 0,
        "gps_time": new Date().toISOString(),
        "received_at": new Date().toISOString()
      }
    ],
    "settings": {
      "data_rate": {
        "lora": {
          "bandwidth": 125000,
          "spreading_factor": 7,
          "coding_rate": "4/5"
        }
      },
      "frequency": "902300000",
      "timestamp": Date.now(),
      "time": new Date().toISOString()
    },
    "received_at": new Date().toISOString(),
    "consumed_airtime": "0.061696s",
    "locations": {
      "user": {
        "latitude": 40.7128,
        "longitude": -74.0060,
        "altitude": 10,
        "source": "SOURCE_REGISTRY"
      }
    },
    "version_ids": {
      "brand_id": "milesight",
      "model_id": "em310-udl",
      "hardware_version": "1.0",
      "firmware_version": "1.0.3"
    }
  }
});

// Test scenarios for different device types
const testScenarios = [
  {
    deviceId: "sortyx-sensor-two",
    name: "Ultrasonic Distance Sensor",
    sensorData: {
      battery: 84,
      distance: 73,
      tilt: "normal"
    }
  },
  {
    deviceId: "bin-sensor-001",
    name: "Smart Waste Bin #1",
    sensorData: {
      battery: 92,
      distance: 45,
      tilt: "normal",
      temperature: 22.5
    }
  },
  {
    deviceId: "bin-sensor-002", 
    name: "Smart Waste Bin #2",
    sensorData: {
      battery: 67,
      distance: 12,
      tilt: "tilted",
      temperature: 24.1
    }
  },
  {
    deviceId: "environmental-sensor-001",
    name: "Environmental Sensor",
    sensorData: {
      battery: 78,
      temperature: 25.3,
      humidity: 65.2,
      pressure: 1013.25
    }
  }
];

async function testWebhookEndpoint(baseUrl) {
  console.log(`🧪 Testing webhook endpoint: ${baseUrl}/ttn\n`);

  for (const scenario of testScenarios) {
    try {
      console.log(`📡 Testing device: ${scenario.deviceId} (${scenario.name})`);
      console.log(`📊 Sensor data:`, JSON.stringify(scenario.sensorData, null, 2));
      
      const payload = createTestPayload(scenario.deviceId, scenario.sensorData);
      
      const response = await fetch(`${baseUrl}/ttn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'TTN-Test-Client/2.0'
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { rawResponse: responseText };
      }

      console.log(`📊 Response Status: ${response.status}`);
      console.log(`📊 Response:`, JSON.stringify(responseData, null, 2));
      
      if (response.ok) {
        console.log(`✅ SUCCESS: Data stored for ${scenario.deviceId}`);
        if (responseData.collection) {
          console.log(`📦 Collection: ${responseData.collection}`);
        }
        if (responseData.docId) {
          console.log(`🆔 Document ID: ${responseData.docId}`);
        }
      } else {
        console.log(`❌ FAILED: ${scenario.deviceId} - Status ${response.status}`);
      }
      
      console.log(`${'─'.repeat(50)}\n`);
      
      // Wait a bit between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error testing ${scenario.deviceId}:`, error.message);
      console.log(`${'─'.repeat(50)}\n`);
    }
  }
}

async function testHealthEndpoint(baseUrl) {
  try {
    console.log(`🔍 Testing health endpoint: ${baseUrl}/health`);
    
    const response = await fetch(`${baseUrl}/health`);
    const data = await response.json();
    
    console.log(`📊 Health Status: ${response.status}`);
    console.log(`📊 Health Data:`, JSON.stringify(data, null, 2));
    
    if (response.ok && data.status === 'healthy') {
      console.log(`✅ Health check passed - Firebase connected`);
    } else {
      console.log(`❌ Health check failed`);
    }
    
  } catch (error) {
    console.error(`❌ Health check error:`, error.message);
  }
  
  console.log(`${'═'.repeat(60)}\n`);
}

async function testDevicesEndpoint(baseUrl) {
  try {
    console.log(`📋 Testing devices list endpoint: ${baseUrl}/devices`);
    
    const response = await fetch(`${baseUrl}/devices`);
    const data = await response.json();
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📊 Devices Data:`, JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log(`✅ Devices list retrieved successfully`);
      if (data.devices) {
        console.log(`📱 Total devices: ${data.devices.length}`);
      }
    } else {
      console.log(`❌ Failed to get devices list`);
    }
    
  } catch (error) {
    console.error(`❌ Devices list error:`, error.message);
  }
}

// Main test function
async function runTests() {
  // Test both local and production
  const testUrls = [
    'http://localhost:3000',  // Local development
    'https://ttn.onrender.com'  // Production
  ];

  for (const baseUrl of testUrls) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🎯 TESTING: ${baseUrl}`);
    console.log(`${'═'.repeat(60)}\n`);

    try {
      // Test basic connectivity
      const connectResponse = await fetch(baseUrl);
      if (connectResponse.ok) {
        console.log(`✅ Server is reachable`);
      } else {
        console.log(`⚠️ Server returned status: ${connectResponse.status}`);
      }
    } catch (error) {
      console.log(`❌ Server not reachable: ${error.message}`);
      console.log(`Skipping tests for ${baseUrl}\n`);
      continue;
    }

    // Run all tests
    await testHealthEndpoint(baseUrl);
    await testWebhookEndpoint(baseUrl);
    await testDevicesEndpoint(baseUrl);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🏁 All tests completed!`);
  console.log(`${'═'.repeat(60)}`);
}

// Run the tests
runTests().catch(console.error);