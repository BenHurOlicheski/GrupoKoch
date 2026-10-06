const fs = require('fs');
const fileFast = 'datasets/DS_PENALIDADES_FAST.js';
let contentFast = fs.readFileSync(fileFast, 'utf8');

contentFast = contentFast.replace('var processId = "PENALIDADES";', 'var processId = "";');
contentFast = contentFast.replace('if (constraints[c].fieldName == "status") {', 'if (constraints[c].fieldName == "processId") {\n                processId = constraints[c].initialValue;\n            }\n            if (constraints[c].fieldName == "status") {');

fs.writeFileSync(fileFast, contentFast, 'utf8');

const fileFront = 'wcm/widget/TESTEGEMINI/src/main/webapp/resources/js/TESTEGEMINI.js';
let contentFront = fs.readFileSync(fileFront, 'utf8');

contentFront = contentFront.replace('var constraintsBusca = [];', 'var constraintsBusca = [];\n            if (processId !== "") {\n                constraintsBusca.push(DatasetFactory.createConstraint("processId", processId, processId, ConstraintType.MUST));\n            }');

fs.writeFileSync(fileFront, contentFront, 'utf8');

console.log("FIXED PARAMS");
