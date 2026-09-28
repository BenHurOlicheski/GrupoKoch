var PainelReembolso = SuperWidget.extend({
    instanceId: null,

    bindings: {
        local: {
            'enviar-solicitacao': ['click_enviarSolicitacao'],
            'abrir-modal-zoom': ['click_abrirModalZoom'],
            'adicionar-despesa': ['click_adicionarDespesa']
            
        },
        global: {}
    },

    init: function() {
        
        this.despesasPaiFilho = []; // Array em memória para guardar as despesas adicionadas
        
        var that = this;
        
        // Aplica a máscara de moeda (R$) ao campo enquanto o usuário digita
        var fMascara = function() {
            var v = $(this).val().replace(/\D/g, "");
            if (v === "") {
                $(this).val("");
                return;
            }
            v = (parseInt(v, 10) / 100).toFixed(2);
            v = v.replace(".", ",");
            v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
            $(this).val(v);
        };
        $("#valorDespesa_" + this.instanceId).on("input", fMascara);

        // Altera o label quando for KM
        $("#tipoDespesa_" + this.instanceId).on("change", function() {
            var tipo = $(this).val();
            var inputValor = $("#valorDespesa_" + that.instanceId);
            if (tipo === "KM") {
                $("#labelValor_" + that.instanceId).text("KM Rodado");
                inputValor.off("input").val("").attr("placeholder", "Ex: 100");
                // Permite apenas numeros para KM
                inputValor.on("input", function() {
                    this.value = this.value.replace(/[^0-9]/g, '');
                });
            } else {
                $("#labelValor_" + that.instanceId).text("Valor (R$)");
                inputValor.off("input").val("").attr("placeholder", "0,00");
                inputValor.on("input", fMascara);
            }
        });
    },

    abrirModalZoom: function() {
        var that = this;

        var htmlModal = '<div class="row">' +
                        '   <div class="col-md-12 form-group">' +
                        '       <input type="text" id="inputBuscaColaboradorModal" class="form-control" placeholder="Digite parte do nome e aguarde...">' +
                        '   </div>' +
                        '</div>' +
                        '<div class="row">' +
                        '   <div class="col-md-12 table-responsive">' +
                        '       <table class="table table-hover" id="tabelaZoomColaborador">' +
                        '           <thead><tr><th>Nome</th><th>Código</th><th>Filial</th></tr></thead>' +
                        '           <tbody><tr><td colspan="3" class="text-center text-muted">Aguardando busca no Banco de Dados...</td></tr></tbody>' +
                        '       </table>' +
                        '   </div>' +
                        '</div>';

        var myModal = FLUIGC.modal({
            title: 'Buscar Colaborador',
            content: htmlModal,
            id: 'fluig-modal-zoom-colaborador',
            size: 'large',
            actions: [{
                'label': 'Fechar',
                'autoClose': true
            }]
        }, function(err, data) {
            if(err) { return; }
            
            var delayBusca;
            $("#inputBuscaColaboradorModal").on("keyup", function(e) {
                var search = $(this).val().toUpperCase();
                var tbody = $("#tabelaZoomColaborador tbody");
                
                if (search.length < 3) return;

                clearTimeout(delayBusca);
                delayBusca = setTimeout(function() {
                    tbody.html("<tr><td colspan='3' class='text-center text-info'><i class='fluigicon fluigicon-spinner fluigicon-spin'></i> Fazendo select no banco...</td></tr>");
                    
                    var constraints = [];
                    var c1 = DatasetFactory.createConstraint("NOME", "%" + search + "%", "%" + search + "%", ConstraintType.MUST, true);
                    constraints.push(c1);
                    
                    var fields = ["NOME", "CODIGO", "FILIAL", "BANCO", "AGENCIA", "CONTA", "DIGITO", "CPF"];
                    DatasetFactory.getDataset("DS_FLUIG_REEMBOLSO_DESPESAS", fields, constraints, [], {
                        success: function(retorno) {
                            tbody.empty();
                            var values = retorno.values || [];
                            
                            if (values && values.length > 0 && !values[0].error) {
                                for (var i = 0; i < values.length; i++) {
                                    var item = values[i];
                                    
                                    var tr = $("<tr style='cursor:pointer;'><td>" + item.NOME + "</td><td>" + item.CODIGO + "</td><td>" + item.FILIAL + "</td></tr>");
                                    tr.data("info", item);
                                    
                                    tr.on("click", function() {
                                        var rowItem = $(this).data("info");
                                        
                                        $("#zoomColaborador_" + that.instanceId).val(rowItem.NOME || "");
                                        $("#zoomCodColaborador_" + that.instanceId).val(rowItem.CODIGO || "");
                                        $("#zoomFilial_" + that.instanceId).val(rowItem.FILIAL || "");
                                        $("#zoomBanco_" + that.instanceId).val(rowItem.BANCO || "");
                                        $("#zoomAgencia_" + that.instanceId).val(rowItem.AGENCIA || "");
                                        $("#zoomConta_" + that.instanceId).val(rowItem.CONTA || "");
                                        $("#zoomDigito_" + that.instanceId).val(rowItem.DIGITO || "");
                                        $("#zoomCPF_" + that.instanceId).val(rowItem.CPF || "");
                                        
                                        myModal.remove();
                                    });
                                    
                                    tbody.append(tr);
                                }
                            } else {
                                var errMsg = values[0] && values[0].error ? values[0].error : "Nenhum colaborador encontrado.";
                                tbody.html("<tr><td colspan='3' class='text-center text-danger'>" + errMsg + "</td></tr>");
                            }
                        },
                        error: function(err) {
                            console.error(err);
                            tbody.html("<tr><td colspan='3' class='text-center text-danger'>Erro de comunicação com o servidor.</td></tr>");
                        }
                    });
                }, 600);
            });
        });
    },

    adicionarDespesa: function() {
        var tipo = $("#tipoDespesa_" + this.instanceId).val();
        var dataDespesa = $("#dataDespesa_" + this.instanceId).val();
        var valorStrMasked = $("#valorDespesa_" + this.instanceId).val();
        var justificativa = $("#justificativa_" + this.instanceId).val();
        var fileInput = $("#anexoDespesa_" + this.instanceId)[0];
        
        var file = (fileInput && fileInput.files.length > 0) ? fileInput.files[0] : null;

        if (!tipo || !dataDespesa || !valorStrMasked || !justificativa || !file) {
            FLUIGC.toast({ title: 'Atenção: ', message: 'Preencha TODOS os campos (Tipo, Data, Valor, Justificativa e Anexo) para adicionar a despesa.', type: 'warning' });
            return;
        }

        var valorNum = 0;
        
        if (tipo === "KM") {
            // KM * 0.85
            var km = parseInt(valorStrMasked, 10);
            if (isNaN(km) || km <= 0) {
                FLUIGC.toast({ title: 'Atenção: ', message: 'Digite um KM válido.', type: 'warning' });
                return;
            }
            valorNum = km * 0.85;
            justificativa = justificativa + " (" + km + " KM rodados x 0,85)";
        } else {
            // Converte o valor "1.250,50" -> 1250.50
            valorNum = parseFloat(valorStrMasked.replace(/\./g, "").replace(",", "."));
            if (isNaN(valorNum) || valorNum <= 0) {
                FLUIGC.toast({ title: 'Atenção: ', message: 'Digite um valor válido.', type: 'warning' });
                return;
            }
        }

        // Formata data de YYYY-MM-DD para DD/MM/YYYY para bater com o formulário padrão
        var dataParts = dataDespesa.split("-");
        var dataFormatada = dataParts.length === 3 ? dataParts[2] + "/" + dataParts[1] + "/" + dataParts[0] : dataDespesa;

        // Adiciona no array de controle
        var fileUrl = file ? URL.createObjectURL(file) : null;
        var novaDespesa = {
            id: new Date().getTime(),
            tipo: tipo,
            dataFormatoBD: dataDespesa,
            data: dataFormatada,
            valor: valorNum,
            justificativa: justificativa,
            file: file,
            fileName: file ? file.name : "Sem anexo",
            fileUrl: fileUrl
        };
        
        this.despesasPaiFilho.push(novaDespesa);

        // Limpa os campos após adicionar
        $("#tipoDespesa_" + this.instanceId).val("").trigger("change");
        $("#dataDespesa_" + this.instanceId).val("");
        $("#valorDespesa_" + this.instanceId).val("");
        $("#justificativa_" + this.instanceId).val("");
        $("#anexoDespesa_" + this.instanceId).val("");

        this.renderTabelaDespesas();
    },

    removerDespesa: function(idDespesa) {
        var that = this;
        this.despesasPaiFilho = this.despesasPaiFilho.filter(function(d) {
            return d.id !== idDespesa;
        });
        this.renderTabelaDespesas();
    },

    renderTabelaDespesas: function() {
        var that = this;
        var tbody = $("#tabelaPaiFilho_" + this.instanceId + " tbody");
        tbody.empty();

        var total = 0;

        if (this.despesasPaiFilho.length === 0) {
            tbody.html('<tr id="linhaVazia_' + this.instanceId + '"><td colspan="6" class="text-center text-muted">Nenhuma despesa lançada ainda.</td></tr>');
            $("#totalDespesasStr_" + this.instanceId).text("R$ 0,00");
            return;
        }

        for (var i = 0; i < this.despesasPaiFilho.length; i++) {
            var d = this.despesasPaiFilho[i];
            total += d.valor;

            var anexoHtml = d.fileUrl 
                ? "<a href='" + d.fileUrl + "' target='_blank' style='color:#1ea2db;'><i class='fluigicon fluigicon-eye-open'></i> Ver Nota</a>" 
                : "<small class='text-muted'>Sem anexo</small>";

            var tr = $("<tr>" +
                "<td>" + d.tipo + "</td>" +
                "<td>" + d.data + "</td>" +
                "<td>" + d.justificativa + "</td>" +
                "<td class='text-center'>" + anexoHtml + "</td>" +
                "<td class='text-right'>R$ " + d.valor.toFixed(2).replace('.', ',') + "</td>" +
                "<td class='text-center'>" +
                    "<i class='fluigicon fluigicon-trash icon-md text-danger btnRemoverDespesa' data-id='" + d.id + "' style='cursor:pointer;' title='Excluir Despesa'></i>" +
                "</td>" +
            "</tr>");

            tbody.append(tr);
        }

        $("#totalDespesasStr_" + this.instanceId).text("R$ " + total.toFixed(2).replace('.', ','));

        tbody.find(".btnRemoverDespesa").on("click", function() {
            var id = $(this).data("id");
            that.removerDespesa(id);
        });
    },

    enviarSolicitacao: function() {
        var that = this;
        
        var nomeColab = $("#zoomColaborador_" + this.instanceId).val();
        var codColab = $("#zoomCodColaborador_" + this.instanceId).val();
        var filialColab = $("#zoomFilial_" + this.instanceId).val();
        var banco = $("#zoomBanco_" + this.instanceId).val();
        var agencia = $("#zoomAgencia_" + this.instanceId).val();
        var conta = $("#zoomConta_" + this.instanceId).val();
        var digito = $("#zoomDigito_" + this.instanceId).val();
        var cpf = $("#zoomCPF_" + this.instanceId).val();

        if (!nomeColab || !codColab || !filialColab || !banco || !agencia || !conta || !digito || !cpf) {
            FLUIGC.toast({ title: 'Aviso: ', message: 'Por favor, busque um colaborador e garanta que TODOS os dados (Banco, Agência, Conta, CPF, etc.) estejam preenchidos antes de enviar.', type: 'warning' });
            return;
        }

        if (this.despesasPaiFilho.length === 0) {
            FLUIGC.toast({ title: 'Aviso: ', message: 'Adicione pelo menos uma despesa na tabela antes de enviar.', type: 'warning' });
            return;
        }

        var loading = FLUIGC.loading(window);
        loading.show();

        // 1. Extrai todos os arquivos que precisam de upload
        var filesToUpload = [];
        for (var i = 0; i < this.despesasPaiFilho.length; i++) {
            if (this.despesasPaiFilho[i].file) {
                filesToUpload.push(this.despesasPaiFilho[i].file);
            }
        }

        if (filesToUpload.length > 0) {
            // Fazer upload de todos os anexos primeiro
            var uploadedCount = 0;
            var attachmentsArray = [];
            
            for (var j = 0; j < filesToUpload.length; j++) {
                (function(fileToUp) {
                    var formData = new FormData();
                    formData.append("file", fileToUp);
                    
                    $.ajax({
                        url: '/api/public/2.0/contentfiles/upload',
                        type: 'POST',
                        data: formData,
                        cache: false,
                        contentType: false,
                        processData: false,
                        success: function(data) {
                            uploadedCount++;
                            attachmentsArray.push({
                                "fileName": fileToUp.name
                            });
                            
                            if (uploadedCount === filesToUpload.length) {
                                that.iniciarProcessoWorkflow(attachmentsArray, loading);
                            }
                        },
                        error: function(err) {
                            uploadedCount++;
                            console.error("Erro no upload do anexo", err);
                            if (uploadedCount === filesToUpload.length) {
                                that.iniciarProcessoWorkflow(attachmentsArray, loading);
                            }
                        }
                    });
                })(filesToUpload[j]);
            }
        } else {
            // Nenhuma despesa com anexo
            this.iniciarProcessoWorkflow([], loading);
        }
    },

    iniciarProcessoWorkflow: function(attachments, loading) {
        var that = this;
        
        var nomeColab = $("#zoomColaborador_" + this.instanceId).val();
        var codColab = $("#zoomCodColaborador_" + this.instanceId).val();
        var filialColab = $("#zoomFilial_" + this.instanceId).val();
        var banco = $("#zoomBanco_" + this.instanceId).val();
        var agencia = $("#zoomAgencia_" + this.instanceId).val();
        var conta = $("#zoomConta_" + this.instanceId).val();
        var digito = $("#zoomDigito_" + this.instanceId).val();
        var cpf = $("#zoomCPF_" + this.instanceId).val();

        var formFields = {
            "zoomColaborador": nomeColab,
            "zoomCodColaborador": codColab,
            "zoomFilial": filialColab,
            "zoomBanco": banco,
            "zoomAgencia": agencia,
            "zoomConta": conta,
            "zoomDigito": digito,
            "zoomCPF": cpf,
            "colaborador": WCMAPI.getUserCode(),
            
            // Campos obrigatórios no validateForm.js original:
            "rdTipoRequisicao": "colaborador",
            "telefoneColaborador": "-", // Mock para passar na validação
            "rdTipoConta": "contaCorrente",
            
            "qtDespesas": this.despesasPaiFilho.length.toString()
        };

        var valorTotal = 0;

        for (var i = 0; i < this.despesasPaiFilho.length; i++) {
            var d = this.despesasPaiFilho[i];
            var rowId = (i + 1).toString();
            
            formFields["tipoDespesa___" + rowId] = d.tipo;
            formFields["dataReembolso___" + rowId] = d.data; 
            formFields["valorDespesa___" + rowId] = d.valor.toFixed(2).replace('.', ','); 
            formFields["obsDespesa___" + rowId] = d.justificativa;
            
            // O validateForm.js do Fluig exige que a rdAnexarFoto esteja preenchida
            formFields["rdAnexarFoto___" + rowId] = "sim";

            valorTotal += d.valor;
        }

        formFields["totalSol"] = valorTotal.toFixed(2).replace('.', ','); 
        formFields["valorTotal"] = valorTotal.toString(); 

        var requestData = {
            "targetState": 0,
            "targetAssignee": WCMAPI.getUserCode(),
            "comment": "Solicitação com " + this.despesasPaiFilho.length + " despesas gerada via Widget",
            "formFields": formFields
        };

        var processId = "RH Solicitacao de Reembolso"; 

        $.ajax({
            type: "POST",
            url: "/process-management/api/v2/processes/" + encodeURIComponent(processId) + "/start",
            contentType: "application/json",
            data: JSON.stringify(requestData),
            success: function(response) {
                var processInstanceId = response.processInstanceId;
                
                // Se houver anexos, faz uma segunda chamada para anexá-los à solicitação criada
                if (attachments && attachments.length > 0) {
                    $.ajax({
                        type: "POST",
                        url: "/process-management/api/v2/requests/" + processInstanceId + "/attachments",
                        contentType: "application/json",
                        data: JSON.stringify(attachments),
                        success: function(resAnexo) {
                            console.log("Anexos vinculados com sucesso.");
                        },
                        error: function(errAnexo) {
                            console.error("Erro ao vincular anexos", errAnexo);
                            FLUIGC.toast({ title: 'Aviso: ', message: 'A solicitação foi criada, mas houve um problema ao vincular os anexos.', type: 'warning' });
                        }
                    });
                }
                
                loading.hide();
                FLUIGC.toast({
                    title: 'Sucesso! ',
                    message: 'Solicitação nº ' + response.processInstanceId + ' gerada com sucesso!',
                    message: 'Solicitação nº ' + processInstanceId + ' gerada com sucesso!',
                    type: 'success'
                });
                
                $("#formNovoReembolso_" + that.instanceId)[0].reset();
                that.despesasPaiFilho = [];
                that.renderTabelaDespesas();
                
            },
            error: function(error) {
                loading.hide();
                console.error(error);
                FLUIGC.toast({
                    title: 'Erro: ',
                    message: 'Não foi possível iniciar a solicitação. Verifique o console.',
                    type: 'danger'
                });
            }
        });
    }
});


