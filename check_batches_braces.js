const fs = require('fs');
const content = fs.readFileSync('frontend/src/pages/BatchesPage.jsx', 'utf8');
let depth = 0;
const lines = content.split('\n');
lines.forEach((line, i) => {
    const opens = (line.match(/{/g) || []).length;
    const closes = (line.match(/}/g) || []).length;
    depth += opens - closes;
    if (opens !== 0 || closes !== 0) {
        // Only log if it seems like a component or function boundary
        if (line.includes('const') || line.includes('function') || line.includes('return') || depth < 2) {
            console.log(`Line ${i + 1}: Depth ${depth} | ${line.trim()}`);
        }
    }
});
console.log(`Final Depth: ${depth}`);
