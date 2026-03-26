const http = require('http');

const body = JSON.stringify({ identifier: 'admin@example.com', password: 'password123' });

const req = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': body.length
    }
}, (res) => {
    let raw = '';
    res.on('data', chunk => raw += chunk);
    res.on('end', () => {
        const token = JSON.parse(raw).token;
        if (!token) return console.log("No token:", raw);

        http.get('http://localhost:5000/api/batches', {
            headers: { Authorization: `Bearer ${token}` }
        }, (res2) => {
            let bRaw = '';
            res2.on('data', chunk => bRaw += chunk);
            res2.on('end', () => console.log("Batches response:", bRaw.substring(0, 500)));
        });
    });
});
req.write(body);
req.end();
