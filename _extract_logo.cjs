const fs = require('fs');
const path = 'C:\\Users\\Notandi\\.claude\\projects\\C--Users-Notandi-Downloads-slokkvitaeki-source\\143fd222-dbd6-4434-8a0e-88d08e3a97d3\\tool-results\\mcp-6096266f-f538-440e-8c50-fa994374e84a-download_file_content-1777916067001.txt';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));
console.log('Title:', data.title);
console.log('MimeType:', data.mimeType);
console.log('Size:', data.content.length, 'b64 chars');
const buf = Buffer.from(data.content, 'base64');
fs.writeFileSync('C:\\projects\\slokkvitaeki\\_logo2.jpg', buf);
console.log('Wrote', buf.length, 'bytes to _logo2.jpg');
