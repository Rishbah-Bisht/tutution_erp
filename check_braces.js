const fs = require('fs');
const content = fs.readFileSync('frontend/src/pages/ExamsPage.jsx', 'utf8');
let depth = 0;
const lines = content.split('\n');
lines.forEach((line, i) => {
    const opens = (line.match(/{/g) || []).length;
    const closes = (line.match(/}/g) || []).length;
    depth += opens - closes;
    if (opens !== 0 || closes !== 0) {
        console.log(`Line ${i + 1}: ${opens} { , ${closes} } => Depth: ${depth} | ${line.trim()}`);
    }
});
console.log(`Final Depth: ${depth}`);
