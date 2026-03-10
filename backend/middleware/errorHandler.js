/**
 * Global Error Handling Middleware
 * Categorizes and standardizes error responses for the API.
 */
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log for server-side debugging
    console.error(`[Error] [${new Date().toISOString()}]`);
    console.error('Path:', req.path);
    console.error('Message:', err.message);
    if (process.env.NODE_ENV !== 'production') {
        console.error('Stack:', err.stack);
    }

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = `Resource not found with id of ${err.value}`;
        return res.status(404).json({ success: false, message });
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        const message = `Duplicate field value entered: ${field}. Please use another value.`;
        return res.status(400).json({ success: false, message });
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message).join(', ');
        return res.status(400).json({ success: false, message });
    }

    // Mongo Network/Timeout Errors
    if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
        const message = 'Database connection issue. Please try again later.';
        return res.status(503).json({ success: false, message });
    }

    // JWT Errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ success: false, message: 'Invalid token. Please log in again.' });
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Token expired. Please log in again.' });
    }

    // Default Error
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        // Show stack trace only in development
        stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
    });
};

module.exports = errorHandler;
