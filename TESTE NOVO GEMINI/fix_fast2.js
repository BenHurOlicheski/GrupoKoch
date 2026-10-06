const fs = require('fs');
const file = 'datasets/DS_PENALIDADES_FAST.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("SELECT p.NUM_PROCES, p.START_DATE, p.STATUS, p.COD_MATR_REQUISIT, \" +\n                  \"p.NUM_SEQ_ESTADO, t.CD_MATRICULA, t.DEADLINE_DATE, t.DEADLINE_HOUR, \" +", 
"SELECT p.NUM_PROCES, p.START_DATE, p.STATUS, p.COD_MATR_REQUISIT, \" +\n                  \"h.NUM_SEQ_ESTADO, t.CD_MATRICULA, t.DEADLINE_DATE, t.DEADLINE_HOUR, \" +");

content = content.replace("LEFT JOIN TAR_PROCES t ON p.COD_EMPRESA = t.COD_EMPRESA AND p.NUM_PROCES = t.NUM_PROCES AND t.LOG_ATIV = 1 \" +", 
"LEFT JOIN TAR_PROCES t ON p.COD_EMPRESA = t.COD_EMPRESA AND p.NUM_PROCES = t.NUM_PROCES AND t.LOG_ATIV = 1 \" +\n                  \"LEFT JOIN HISTOR_PROCES h ON h.COD_EMPRESA = t.COD_EMPRESA AND h.NUM_PROCES = t.NUM_PROCES AND h.NUM_SEQ_MOVTO = t.NUM_SEQ_MOVTO AND h.LOG_ATIV = 1 \" +");

fs.writeFileSync(file, content, 'utf8');
console.log("REPLACED");
