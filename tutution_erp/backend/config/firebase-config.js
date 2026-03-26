const admin = require('firebase-admin');
const path = require('path');

let firebaseApp;

try {
    // Try to load service account from environment variable first
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        if (admin.apps.length > 0) {
            firebaseApp = admin.app();
            console.log('[Firebase] Already initialized, reusing existing app.');
        } else {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            firebaseApp = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log('[Firebase] Initialized using environment variable.');
        }
    } else {
        // Fallback to local file
        const serviceAccountPath = path.resolve(__dirname, '../serviceAccountKey.json');
        
        // Check if file exists to avoid crash on startup if not provided yet
        const fs = require('fs');
        if (fs.existsSync(serviceAccountPath)) {
            if (admin.apps.length > 0) {
                firebaseApp = admin.app();
                console.log('[Firebase] Already initialized (local), reusing existing app.');
            } else {
                firebaseApp = admin.initializeApp({
                    credential: admin.credential.cert(serviceAccountPath)
                });
                console.log('[Firebase] Initialized using serviceAccountKey.json');
            }
        } else {
            console.warn('[Firebase] Warning: serviceAccountKey.json not found and FIREBASE_SERVICE_ACCOUNT env var is missing. Push notifications will be in simulation mode.');
            // Initialize with dummy if necessary or handle gracefully in services
        }
    }
} catch (error) {
    console.error('[Firebase] Initialization error:', error.message);
}

const messaging = firebaseApp ? firebaseApp.messaging() : {
    send: (payload) => {
        console.log('[FCM-Simulator] Send Payload:', JSON.stringify(payload, null, 2));
        return Promise.resolve('simulated-message-id');
    },
    sendEach: (payloads) => {
        console.log('[FCM-Simulator] SendBatch Payload count:', payloads.length);
        return Promise.resolve({ successCount: payloads.length, failureCount: 0, responses: [] });
    },
    sendEachForMulticast: (payload) => {
        console.log('[FCM-Simulator] SendMulticast Tokens count:', payload.tokens.length);
        return Promise.resolve({ successCount: payload.tokens.length, failureCount: 0, responses: payload.tokens.map(() => ({ success: true })) });
    },
    subscribeToTopic: (tokens, topic) => {
        console.log(`[FCM-Simulator] Subscribing ${tokens.length} tokens to topic: ${topic}`);
        return Promise.resolve({ successCount: tokens.length, failureCount: 0, errors: [] });
    },
    unsubscribeFromTopic: (tokens, topic) => {
        console.log(`[FCM-Simulator] Unsubscribing ${tokens.length} tokens from topic: ${topic}`);
        return Promise.resolve({ successCount: tokens.length, failureCount: 0, errors: [] });
    }
};

module.exports = { admin, messaging };
