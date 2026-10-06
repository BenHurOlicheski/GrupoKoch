const fs = require('fs');
const file = 'datasets/DS_PENALIDADES_FAST.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("t.NUM_SEQ_ESTADO, t.COD_MATR_ATRIB", "p.NUM_SEQ_ESTADO, t.CD_MATRICULA");
content = content.replace('var state = rs.getString("NUM_SEQ_ESTADO") || "";', 'var state = rs.getString("NUM_SEQ_ESTADO") || "";');
content = content.replace('var asg = rs.getString("COD_MATR_ATRIB") || "";', 'var asg = rs.getString("CD_MATRICULA") || "";');

fs.writeFileSync(file, content, 'utf8');
console.log("REPLACED");
