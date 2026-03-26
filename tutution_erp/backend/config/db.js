const mongoose = require('mongoose');

// Cache connection state for serverless environments (like Vercel)
let cachedConnection = null;

/**
 * Connects to MongoDB Atlas with retry logic and caching.
 * @param {number} retries - Number of retry attempts.
 * @param {number} delay - Delay between retries in milliseconds.
 */
const connectDB = async (retries = 5, delay = 5000) => {
    // If connection is already established, reuse it
    if (cachedConnection && mongoose.connection.readyState === 1) {
        console.log('Using existing MongoDB connection');
        return cachedConnection;
    }

    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
        console.error('❌ MONGODB_URI is not defined in environment variables');
        process.exit(1);
    }

    const options = {
        serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    };

    while (retries > 0) {
        try {
            console.log(`Connecting to MongoDB... (Attempts remaining: ${retries})`);

            cachedConnection = await mongoose.connect(MONGODB_URI, options);

            console.log('✅ MongoDB Connected Successfully');

            // Setup connection event listeners
            mongoose.connection.on('error', (err) => {
                console.error(`❌ MongoDB connection error: ${err}`);
            });

            mongoose.connection.on('disconnected', () => {
                console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
            });

            return cachedConnection;
        } catch (error) {
            retries -= 1;
            console.error(`❌ MongoDB connection failed: ${error.message}`);

            if (retries === 0) {
                console.error('Max retries reached. Database connection could not be established.');
                // In production, you might not want to exit if it's a serverless function
                // but for a standalone server, exit is often better than running in a broken state.
                if (process.env.NODE_ENV !== 'production') {
                    // process.exit(1);
                }
                throw error;
            }

            console.log(`Retrying in ${delay / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            // Exponential backoff
            delay *= 1.5;
        }
    }
};

module.exports = connectDB;
