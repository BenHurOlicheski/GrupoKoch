const fs = require('fs');
const file = 'datasets/DS_PENALIDADES_FAST.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("h.NUM_SEQ_ESTADO, t.CD_MATRICULA, t.DEADLINE_DATE, t.DEADLINE_HOUR, ", 
"h.NUM_SEQ_ESTADO, t.CD_MATRICULA, t.DEADLINE, ");

content = content.replace("var dd = rs.getString(\"DEADLINE_DATE\") || \"\";", "var dd = rs.getString(\"DEADLINE\") || \"\";");
content = content.replace("var dh = rs.getString(\"DEADLINE_HOUR\") || \"\";", "var dh = \"\"; // DEADLINE já tem a hora no banco");

fs.writeFileSync(file, content, 'utf8');
console.log("REPLACED FAST");

const fileSync = 'datasets/DS_PENALIDADES_SYNC.js';
let contentSync = fs.readFileSync(fileSync, 'utf8');

contentSync = contentSync.replace("h.NUM_SEQ_ESTADO, t.CD_MATRICULA, t.DEADLINE_DATE, t.DEADLINE_HOUR, ", 
"h.NUM_SEQ_ESTADO, t.CD_MATRICULA, t.DEADLINE, ");

contentSync = contentSync.replace("var dd = rs.getString(\"DEADLINE_DATE\") || \"\";", "var dd = rs.getString(\"DEADLINE\") || \"\";");
contentSync = contentSync.replace("var dh = rs.getString(\"DEADLINE_HOUR\") || \"\";", "var dh = \"\";");

fs.writeFileSync(fileSync, contentSync, 'utf8');
console.log("REPLACED SYNC");
