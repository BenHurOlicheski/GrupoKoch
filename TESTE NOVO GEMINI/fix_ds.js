const fs = require('fs');
const file = 'datasets/DS_EXTRAIR_OCORRENCIA_V2.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("var safeIds = cardIdIn.replace(/[^0-9,]/g, '');", "var safeIds = String(cardIdIn).replace(/[^0-9,]/g, '');");
content = content.replace("var safeProcessIds = processInstanceIdIn.replace(/[^0-9,]/g, '');", "var safeProcessIds = String(processInstanceIdIn).replace(/[^0-9,]/g, '');");

fs.writeFileSync(file, content, 'utf8');
console.log("REPLACED");
