const fs = require('fs');
const file = 'wcm/widget/TESTEGEMINI/src/main/webapp/resources/js/TESTEGEMINI.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /requisicaoPrincipal = \$\.ajax\(\{[\s\S]*?url: CONFIG\.urlSolicitacoes\(processId, statusParaApi\),[\s\S]*?dataType: "json"[\s\S]*?\}\)\.done\(function \(response\) \{/m;

const replacement = ar constraintsBusca = [];
            if (statusParaApi !== "") {
                constraintsBusca.push(DatasetFactory.createConstraint("status", statusParaApi, statusParaApi, ConstraintType.MUST));
            }
            
            requisicaoPrincipal = $.Deferred();
            DatasetFactory.getDataset("DS_PENALIDADES_FAST", null, constraintsBusca, null, {
                success: function(responseDs) {
                    var itens = [];
                    if (responseDs && responseDs.values && responseDs.values.length > 0) {
                        $.each(responseDs.values, function(idx, row) {
                            if (row.processInstanceId === "ERRO") return;
                            itens.push({
                                processInstanceId: row.processInstanceId,
                                requester: { name: row.requesterId }, // Será enriquecido depois se precisar
                                startDate: row.startDate,
                                status: row.status,
                                state: row.taskState, // Adicionando state
                                formRecordId: row.formRecordId,
                                activeTask: {
                                    choosedSequence: row.taskState,
                                    colleagueId: row.assignee,
                                    deadlineDate: row.deadline,
                                    deadlineHour: row.deadline
                                }
                            });
                        });
                    }
                    requisicaoPrincipal.resolve({ items: itens });
                },
                error: function(err) {
                    requisicaoPrincipal.reject(err);
                }
            });
            
            requisicaoPrincipal.done(function (response) {;

content = content.replace(regex, replacement);
fs.writeFileSync(file, content, 'utf8');
console.log("REPLACED");
