const path = require('path');
const dotenv = require('dotenv');

let loaded = false;

function loadBackendEnv() {
    if (loaded) {
        return;
    }

    dotenv.config({ path: path.join(__dirname, '..', '.env') });
    loaded = true;
}

function requireEnv(name) {
    loadBackendEnv();
    const value = process.env[name];

    if (!value || !String(value).trim()) {
        throw new Error(`${name} must be set in the environment.`);
    }

    return String(value).trim();
}

module.exports = {
    loadBackendEnv,
    requireEnv
};
