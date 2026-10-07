const fs = require('fs');
const fileFront = 'wcm/widget/TESTEGEMINI/src/main/webapp/resources/js/TESTEGEMINI.js';
let contentFront = fs.readFileSync(fileFront, 'utf8');

const regex = /requisicaoPrincipal = \$\.ajax\(\{\s*url: CONFIG\.urlSolicitacoes\(processId, statusParaApi\),\s*type: "GET",\s*data: params,\s*dataType: "json",\s*headers: \{ "Accept": "application\/json" \}\s*\}\);/g;
const replacement = ar constraintsBusca = [];
              if (processId !== "") {
                  constraintsBusca.push(DatasetFactory.createConstraint("processId", processId, processId, ConstraintType.MUST));
              }
              if (statusParaApi !== "") {
                  constraintsBusca.push(DatasetFactory.createConstraint("status", statusParaApi, statusParaApi, ConstraintType.MUST));
              }
              requisicaoPrincipal = $.Deferred();
              DatasetFactory.getDataset("DS_PENALIDADES_FAST", null, constraintsBusca, null, {
                  success: function(ds) {
                      var items = [];
                      if (ds && ds.values && ds.values.length > 0 && ds.values[0].processInstanceId !== "ERRO") {
                          for (var i = 0; i < ds.values.length; i++) {
                              items.push({
                                  processInstanceId: ds.values[i].processInstanceId,
                                  requesterId: ds.values[i].requesterId,
                                  startDate: ds.values[i].startDate,
                                  status: ds.values[i].status,
                                  activeTask: {
                                      sequence: ds.values[i].taskState,
                                      assignee: ds.values[i].assignee,
                                      deadline: ds.values[i].deadline
                                  },
                                  formRecordId: ds.values[i].formRecordId
                              });
                          }
                      } else if (ds && ds.values && ds.values.length > 0 && ds.values[0].processInstanceId === "ERRO") {
                          console.error("Erro JDBC: " + ds.values[0].requesterId);
                      }
                      requisicaoPrincipal.resolve([{ items: items }]);
                  },
                  error: function(e) {
                      console.error("Erro Dataset", e);
                      requisicaoPrincipal.resolve([{ items: [] }]);
                  }
              });;

contentFront = contentFront.replace(regex, replacement);
fs.writeFileSync(fileFront, contentFront, 'utf8');
console.log("FIXED API");
