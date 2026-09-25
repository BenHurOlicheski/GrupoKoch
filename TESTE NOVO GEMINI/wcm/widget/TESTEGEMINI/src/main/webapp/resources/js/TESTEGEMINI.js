/* ====================================================================
   Widget: Consulta Avançada de Solicitações de Processos - Fluig
   Arquivo: view.js
   Tecnologias: jQuery + FLUIGC (Fluig Style Guide)
   ==================================================================== */
(function ($) {
    "use strict";

    // ------------------------------------------------------------------
    // CONFIGURAÇÕES GERAIS - ajuste conforme o ambiente
    // ------------------------------------------------------------------
    var CONFIG = {
        // Endpoint de listagem de processos (definições de processo disponíveis)
        urlProcessos: "/process-management/api/v2/processes?pageSize=1000",

        // Endpoint de busca de solicitações (instâncias) de um processo específico.
        urlSolicitacoes: function (processId, statusFilter) {
            var url = "/process-management/api/v2/processes/" + encodeURIComponent(processId) +
                "/requests?expand=requester&pageSize=200";
            
            // Se tiver pedindo só abertas (0), finalizadas (2) ou canceladas (1), passa pra API pra não travar o Fluig
            if (statusFilter !== undefined && statusFilter !== null && statusFilter !== "") {
                url += "&status=" + statusFilter;
            }
            return url;
        },

        // ÚNICO endpoint de detalhe/histórico — confirmado na documentação oficial
        // do Swagger (seção "Requests"): GET /v2/processes/{processId}/requests/tasks
        // Cada item retornado é uma TAREFA/MOVIMENTAÇÃO da solicitação, e já traz
        // "formFields" (dados do formulário) e "state"/"assignee" (histórico) juntos.
        urlDetalheSolicitacao: function (processId, processInstanceId) {
            return "/process-management/api/v2/processes/" + encodeURIComponent(processId) +
                "/requests/tasks?processInstanceId=" + processInstanceId + "&pageSize=100";
        },

        // Endpoint de anexos da solicitação no Fluig
        urlAnexosSolicitacao: function (processInstanceId) {
            return "/process-management/api/v2/requests/" + encodeURIComponent(processInstanceId) + "/attachments";
        },

        // Endpoints dedicados para obtenção dos campos do formulário da solicitação
        urlFormFields: function (processInstanceId) {
            return "/process-management/api/v2/requests/" + encodeURIComponent(processInstanceId) + "?expand=formFields,formRecord";
        },
        urlFormRecordDireto: function (processInstanceId) {
            return "/process-management/api/v2/requests/" + encodeURIComponent(processInstanceId) + "/form-record";
        },
        urlCardDataApi: function (documentId, cardId) {
            return "/ecm-forms/api/v2/cardindex/" + encodeURIComponent(documentId) + "/cards/" + encodeURIComponent(cardId);
        },

        // Endpoint alternativo de anexos caso o processo seja obrigatório
        urlAnexosPorProcesso: function (processId, processInstanceId) {
            return "/process-management/api/v2/processes/" + encodeURIComponent(processId) +
                "/requests/" + encodeURIComponent(processInstanceId) + "/attachments";
        },

        // Endpoint de tarefas pendentes atribuídas ao usuário logado na plataforma
        urlMinhasTarefas: "/process-management/api/v2/tasks?pageSize=1000",

        // Endpoints para assumir e transferir atividade
        urlAssumirTarefa: function (processInstanceId) {
            return "/process-management/api/v2/requests/" + encodeURIComponent(processInstanceId) + "/take";
        },
        urlAssumirTarefaMovimento: function (processInstanceId, movementSequence) {
            return "/process-management/api/v2/requests/" + encodeURIComponent(processInstanceId) + "/tasks/" + encodeURIComponent(movementSequence) + "/assignee";
        },
        urlTransferirTarefa: function (processInstanceId, movementSequence) {
            return "/process-management/api/v2/requests/" + encodeURIComponent(processInstanceId) + "/tasks/" + encodeURIComponent(movementSequence) + "/assignee";
        },
        urlColegas: "/api/public/2.0/users/listAll?pageSize=1000",

        formatoDataApi: "YYYY-MM-DD" // formato de data esperado
    };

    // Obtém o código do usuário logado na plataforma Fluig
    function obterUsuarioLogado() {
        if (typeof WCMAPI !== "undefined" && WCMAPI.userCode) {
            return String(WCMAPI.userCode);
        }
        return "";
    }

    var NOME_USUARIO_LOGADO_FULL = "";
    function obterNomeUsuarioLogado() {
        if (NOME_USUARIO_LOGADO_FULL) return NOME_USUARIO_LOGADO_FULL;
        
        var userIdToQuery = (typeof WCMAPI !== "undefined" && WCMAPI.userLogin) ? WCMAPI.userLogin : null;
        if (!userIdToQuery && typeof WCMAPI !== "undefined" && WCMAPI.userCode) userIdToQuery = WCMAPI.userCode;

        if (userIdToQuery && typeof DatasetFactory !== "undefined" && DatasetFactory.getDataset) {
            try {
                var c1 = DatasetFactory.createConstraint("colleaguePK.colleagueId", userIdToQuery, userIdToQuery, ConstraintType.MUST);
                var ds = DatasetFactory.getDataset("colleague", ["colleagueName"], [c1], null);
                if (ds && ds.values && ds.values.length > 0) {
                    NOME_USUARIO_LOGADO_FULL = ds.values[0].colleagueName;
                    return NOME_USUARIO_LOGADO_FULL;
                }
                
                // Fallback: tentar buscar pelo login se colleagueId não bateu
                var c2 = DatasetFactory.createConstraint("login", userIdToQuery, userIdToQuery, ConstraintType.MUST);
                var ds2 = DatasetFactory.getDataset("colleague", ["colleagueName"], [c2], null);
                if (ds2 && ds2.values && ds2.values.length > 0) {
                    NOME_USUARIO_LOGADO_FULL = ds2.values[0].colleagueName;
                    return NOME_USUARIO_LOGADO_FULL;
                }
            } catch(e) { console.error("Erro ds colleague", e); }
        }
        if (typeof WCMAPI !== "undefined" && WCMAPI.user) {
            return String(WCMAPI.user);
        }
        return "";
    }

    function normalizeStr(s) {
        return String(s || "").normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").toLowerCase();
    }

    function obterMovementSequence(sol) {
        if (!sol) return "";
        if (sol.tasks && sol.tasks.length > 0) {
            for (var t = sol.tasks.length - 1; t >= 0; t--) {
                var tk = sol.tasks[t];
                if (tk.active === true || tk.status === "OPEN" || tk.status === 0 || tk.status === "ABERTO" || tk.status === "EM ABERTO" || !tk.endDate || tk.completed === false) {
                    var ms = tk.movementSequence || (tk.processTaskPK ? tk.processTaskPK.movementSequence : "") || tk.taskMovementSequence || tk.sequence || tk.movement;
                    if (ms) return ms;
                }
            }
        }
        if (sol.activeTask && sol.activeTask.movementSequence) return sol.activeTask.movementSequence;
        if (sol.movementSequence) return sol.movementSequence;
        return "";
    }

    var processoSelecionadoId = null; // guarda o processId do processo atualmente pesquisado

    // --- Estado da paginação e ordenação (client-side) ---
    var paginacao = {
        dadosOriginais: [],             // array mestre com TODOS os resultados da busca atual
        dadosCompletos: [],             // array ativo (filtrado ou completo) usado na renderização
        filtrosCriticidadeAtivos: {},   // mapa de criticidades ativas (ex: { ALTA: true, MEDIA: true })
        paginaAtual: 1,
        itensPorPagina: 25,
        campoOrdenacao: "numero",
        direcaoOrdenacao: "desc"        // 'asc' ou 'desc'
    };

    // ------------------------------------------------------------------    // ==================================================================
    // INICIALIZAÇÃO
    // ==================================================================
    var widgetInicializado = false;
    function initWidget() {
        if (widgetInicializado) return;
        widgetInicializado = true;
        
        atualizarMensagemBoasVindas();
        
        carregarProcessos();
        inicializarDatepickers();
        bindEventos();
    }
    
    function atualizarMensagemBoasVindas() {
        var hora = new Date().getHours();
        var saudacao = "Bom dia";
        if (hora >= 12 && hora < 18) {
            saudacao = "Boa tarde";
        } else if (hora >= 18) {
            saudacao = "Boa noite";
        }
        
        // Formatar hora exata
        var now = new Date();
        var hr = now.getHours().toString().padStart(2, '0');
        var mn = now.getMinutes().toString().padStart(2, '0');
        var horario = hr + ":" + mn;
        
        // Pega o nome. Se o primeiro nome for curto (ex: Ana, Rui, Ben), junta com o segundo nome para ficar "Ben Hur".
        var nomeCompleto = typeof obterNomeUsuarioLogado === "function" ? (obterNomeUsuarioLogado() || "Usuário") : "Usuário";
        var partesNome = nomeCompleto.split(" ");
        var primeiroNome = partesNome[0];
        if (primeiroNome.length <= 3 && partesNome.length > 1 && partesNome[1].toLowerCase() !== "da" && partesNome[1].toLowerCase() !== "de") {
            primeiroNome += " " + partesNome[1];
        }
        
        // Formatar no estilo "Boa tarde, Benhur, agora são 16:54 horas"
        $("#boasVindasTitulo").text(saudacao + ", " + primeiroNome + ", agora são " + horario + " horas.");
    }
    
    // Tenta inicializar no ready padrão
    $(document).ready(function() {
        initWidget();
    });
    // Fallback WCM: se o ready já passou, tenta em seguida
    if (document.readyState === "complete" || document.readyState === "interactive") {
        setTimeout(initWidget, 100);
    }

    function bindEventos() {
        initDragDropColunas();
        $(document).off("click", "#btnBuscar").on("click", "#btnBuscar", executarBusca);
        $(document).off("click", "#btnLimpar").on("click", "#btnLimpar", limparFiltros);
        $(document).off("click", "#btnExportarCsv").on("click", "#btnExportarCsv", exportarCsv);

        $(document).off("click", ".btn-baixar-todos-anexos").on("click", ".btn-baixar-todos-anexos", function() {
            var btn = $(this);
            var urlsStr = btn.attr("data-urls");
            var nomeZip = btn.attr("data-zip-name") || "anexos.zip";
            if (!urlsStr) return;
            var urls = JSON.parse(urlsStr);
            if (urls && urls.length > 0) {
                var btnOriginalHtml = btn.html();
                btn.html('<i class="fluigicon fluigicon-spin fluigicon-refresh"></i> Compactando...');
                btn.prop("disabled", true);
                
                if (typeof JSZip === 'undefined') {
                    alert("A biblioteca de compactação (JSZip) não foi carregada corretamente.");
                    btn.html(btnOriginalHtml).prop("disabled", false);
                    return;
                }
                
                var zip = new JSZip();
                var promessas = [];
                
                $.each(urls, function(idx, item) {
                    var p;
                    // Se temos o fallback url (ecmnavigation), então precisamos buscar a real na API primeiro
                    if (item.fallbackUrl && item.fallbackUrl.indexOf("ecmnavigation") !== -1 && item.docId) {
                        p = fetch("/api/public/2.0/documents/getDownloadURL/" + encodeURIComponent(item.docId))
                            .then(function(res) { return res.json(); })
                            .then(function(data) {
                                var realUrl = data.content || data.message || item.fallbackUrl;
                                return fetch(realUrl);
                            });
                    } else {
                        var directUrl = item.fallbackUrl || item.url;
                        p = fetch(directUrl);
                    }
                    
                    p = p.then(function(response) {
                            if (!response.ok) throw new Error("Erro na requisição: " + response.status);
                            return response.blob();
                        })
                        .then(function(blob) {
                            zip.file(item.nome, blob);
                        })
                        .catch(function(err) {
                            console.error("[TESTEGEMINI] Erro ao baixar " + item.nome, err);
                        });
                    promessas.push(p);
                });
                
                Promise.all(promessas).then(function() {
                    btn.html('<i class="fluigicon fluigicon-spin fluigicon-refresh"></i> Gerando arquivo...');
                    zip.generateAsync({ type: "blob" }).then(function(content) {
                        var a = document.createElement("a");
                        var urlBlob = URL.createObjectURL(content);
                        a.href = urlBlob;
                        a.download = nomeZip;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(urlBlob);
                        
                        btn.html(btnOriginalHtml);
                        btn.prop("disabled", false);
                    }).catch(function(e) {
                        console.error("[TESTEGEMINI] Erro JSZip:", e);
                        alert("Ocorreu um erro ao gerar o arquivo ZIP.");
                        btn.html(btnOriginalHtml).prop("disabled", false);
                    });
                });
            }
        });

        $(document).off("click", ".btn-visualizar-anexo").on("click", ".btn-visualizar-anexo", function(e) {
            e.preventDefault();
            var btn = $(this);
            var docId = btn.attr("data-doc-id");
            var docName = btn.attr("data-doc-name");
            if (!docId) return;

            var btnOriginalHtml = btn.html();
            btn.html('<i class="fluigicon fluigicon-spin fluigicon-refresh"></i>');
            btn.prop("disabled", true);

            fetch("/api/public/2.0/documents/getDownloadURL/" + encodeURIComponent(docId))
                .then(function(res) { return res.json(); })
                .then(function(data) {
                    btn.html(btnOriginalHtml);
                    btn.prop("disabled", false);

                    var realUrl = data.content || data.message;
                    if (!realUrl || String(realUrl).indexOf("http") === -1) {
                        // Fallback caso a API falhe, tenta a ecmnavigation normal em nova aba
                        window.open("/portal/p/1/ecmnavigation?app_ecm_navigation_doc=" + encodeURIComponent(docId), '_blank');
                        return;
                    }

                    var ext = (docName || "").split('.').pop().toLowerCase();
                    var htmlContent = '';

                    if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].indexOf(ext) > -1) {
                        htmlContent = '<div style="text-align:center;"><img src="' + escapeHtml(realUrl) + '" style="max-width:100%; max-height: 60vh;" /></div>';
                    } else if (ext === 'pdf') {
                        htmlContent = '<iframe src="' + escapeHtml(realUrl) + '" style="width:100%; height: 70vh; border:none;"></iframe>';
                    } else {
                        htmlContent = '<div class="alert alert-info text-center" style="margin-top:20px;">A visualização direta de arquivos .' + ext + ' na modal não é suportada.<br><br><a href="' + escapeHtml(realUrl) + '" download="' + escapeHtml(docName) + '" class="btn btn-primary"><i class="fluigicon fluigicon-download"></i> Baixar Arquivo</a></div>';
                    }

                    if (typeof FLUIGC !== "undefined" && FLUIGC.modal) {
                        FLUIGC.modal({
                            title: 'Visualizar: ' + escapeHtml(docName),
                            content: htmlContent,
                            id: 'modal-preview-anexo',
                            size: 'large',
                            actions: [
                                {
                                    'label': 'Baixar',
                                    'bind': 'data-download-anexo',
                                    'classType': 'btn-success'
                                },
                                {
                                    'label': 'Fechar',
                                    'autoClose': true
                                }
                            ]
                        }, function(err, data) {
                            if (!err) {
                                $("#modal-preview-anexo").on("click", "[data-download-anexo]", function() {
                                    var a = document.createElement("a");
                                    a.href = realUrl;
                                    a.download = docName;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                });
                            }
                        });
                    } else {
                        window.open(realUrl, '_blank');
                    }
                })
                .catch(function(err) {
                    console.error("[TESTEGEMINI] Erro ao obter URL de visualização", err);
                    // Em caso de erro, tenta fallback
                    window.open("/portal/p/1/ecmnavigation?app_ecm_navigation_doc=" + encodeURIComponent(docId), '_blank');
                    btn.html(btnOriginalHtml);
                    btn.prop("disabled", false);
                });
        });




        $(document).off("click", "#btnToggleBuscaAvancada").on("click", "#btnToggleBuscaAvancada", function() {
            $("#painelFiltrosBusca").slideToggle();
        });

        // Toggle entre Data e Número
        $(document).off("change", "input[name='optTipoFiltro']").on("change", "input[name='optTipoFiltro']", function () {
            if ($(this).val() === "DATA") {
                $("#blocoFiltroData").show();
                $("#blocoFiltroNumero").hide();
                // Limpa os números
                $("#numSolicitacaoInicio, #numSolicitacaoFim").val("");
            } else {
                $("#blocoFiltroData").hide();
                $("#blocoFiltroNumero").show();
                // Limpa as datas
                $("#dtInicio_TESTEGEMINI, #dtFim_TESTEGEMINI").val("");
            }
        });

        // Delegação de clique nas linhas da tabela de resultados: seleciona a linha
        $(document).off("click", "#tblResultadosBody tr.linha-solicitacao").on("click", "#tblResultadosBody tr.linha-solicitacao", function (event) {
            // Se o clique foi em links externos, botão de anexos ou botão de assumir, não interfere
            if ($(event.target).closest("a.btn-abrir-solicitacao, a.btn-ver-anexos, .btn-ver-anexos, .btn-assumir-tarefa").length > 0) {
                return;
            }

            var $tr = $(this);
            $("#tblResultadosBody tr.linha-solicitacao").removeClass("linha-selecionada");
            $tr.addClass("linha-selecionada");
        });

        // Clique no botão "Assumir" tarefa atrelada a Papel / Grupo
        $("#tblResultadosBody").on("click", ".btn-assumir-tarefa", function (event) {
            event.preventDefault();
            event.stopPropagation();
            var $btn = $(this);
            var $tr = $btn.closest("tr");
            var instanceId = $btn.attr("data-instance-id") || $tr.attr("data-instance-id") || $tr.attr("data-numero");
            var movementSequence = $btn.attr("data-movement") || 1;
            var solData = $tr.data("sol-data") || {};
            assumirTarefa(instanceId, movementSequence, $btn, $tr, solData);
        });


        // Clique no botão de Ver Anexos na linha: abre modal com a lista de anexos e link para o processo
        $("#tblResultadosBody").on("click", ".btn-ver-anexos", function (event) {
            event.preventDefault();
            event.stopPropagation();
            var $btn = $(this);
            var $tr = $btn.closest("tr");
            var instanceId = $btn.attr("data-instance-id") || $tr.attr("data-instance-id") || $tr.attr("data-numero");
            var procId = $btn.attr("data-process-id") || $tr.attr("data-process-id") || processoSelecionadoId;
            var solData = $tr.data("sol-data") || {};
            abrirModalAnexos(instanceId, procId, solData);
        });

        // Ordenação por clique nas colunas do cabeçalho
        $("#tblResultados").on("click", "th.col-sortable", function () {
            var campo = $(this).attr("data-sort");
            if (!campo) return;

            if (paginacao.campoOrdenacao === campo) {
                paginacao.direcaoOrdenacao = paginacao.direcaoOrdenacao === "asc" ? "desc" : "asc";
            } else {
                paginacao.campoOrdenacao = campo;
                paginacao.direcaoOrdenacao = "asc";
            }

            atualizarIconesOrdenacao();
            aplicarOrdenacao();
            paginacao.paginaAtual = 1;
            renderizarPagina();
        });

        // Controles de paginação
        $("#selItensPorPagina").on("change", function () {
            paginacao.itensPorPagina = parseInt($(this).val(), 10);
            paginacao.paginaAtual = 1;
            renderizarPagina();
        });

        $("#btnPaginaAnterior").on("click", function () {
            if (paginacao.paginaAtual > 1) {
                paginacao.paginaAtual--;
                renderizarPagina();
            }
        });

        $("#btnPaginaProxima").on("click", function () {
            var totalPaginas = Math.max(1, Math.ceil(paginacao.dadosCompletos.length / paginacao.itensPorPagina));
            if (paginacao.paginaAtual < totalPaginas) {
                paginacao.paginaAtual++;
                renderizarPagina();
            }
        });

        // ---------------------------------------------------------------
        // FILTRO DE CRITICIDADE (Clique nos itens da Legenda)
        // Ao clicar em Alta, Média ou Baixa, filtra as solicitações e
        // atualiza o grid (painelResultados) imediatamente em 1 clique.
        // ---------------------------------------------------------------
        $(document).off("click.filtroCrit").on("click.filtroCrit", ".legenda-criticidades .item-legenda, .filtro-criticidade", function (e) {
            e.preventDefault();
            e.stopPropagation();
            var $target = $(this).closest(".item-legenda, .filtro-criticidade");
            if ($target.length === 0) return;

            var crit = $target.attr("data-filtro-crit");
            if (!crit) {
                var txt = $target.text().toLowerCase();
                if (txt.indexOf("alta") !== -1) crit = "alta";
                else if (txt.indexOf("media") !== -1 || txt.indexOf("média") !== -1) crit = "media";
                else if (txt.indexOf("baixa") !== -1) crit = "baixa";
            }

            if (crit) {
                aplicarFiltroCriticidade(crit, true); // true = toggle ao clicar na mesma
            }
        });

        // Botão para limpar filtro de criticidade
        $(document).off("click.limparFiltroCrit").on("click.limparFiltroCrit", "#btnLimparFiltroCrit, #btnLimparFiltroCritInline", function (e) {
            e.preventDefault();
            e.stopPropagation();
            aplicarFiltroCriticidade("", false);
        });
    }

    // ------------------------------------------------------------------
    // FILTRAR SOLICITAÇÕES POR CRITICIDADE (Alta, Média, Baixa)
    // ------------------------------------------------------------------
    // ------------------------------------------------------------------
    // FILTRAR SOLICITAÇÕES POR CRITICIDADE (Múltipla Seleção)
    // ------------------------------------------------------------------
    function aplicarFiltroCriticidade(nivelCrit, isToggle) {
        if (!paginacao.dadosOriginais || paginacao.dadosOriginais.length === 0) {
            paginacao.dadosOriginais = (paginacao.dadosCompletos || []).slice();
        }

        if (!paginacao.filtrosCriticidadeAtivos) {
            paginacao.filtrosCriticidadeAtivos = {};
        }

        if (!nivelCrit || nivelCrit === "") {
            // Limpa todos os filtros
            paginacao.filtrosCriticidadeAtivos = {};
        } else {
            var normalizado = String(nivelCrit).toUpperCase().trim();
            if (normalizado === "MÉDIA") normalizado = "MEDIA";

            if (paginacao.filtrosCriticidadeAtivos[normalizado]) {
                // Já estava ativo -> desativa
                delete paginacao.filtrosCriticidadeAtivos[normalizado];
            } else {
                // Ativa mais essa criticidade para seleção múltipla
                paginacao.filtrosCriticidadeAtivos[normalizado] = true;
            }
        }

        var chavesAtivas = Object.keys(paginacao.filtrosCriticidadeAtivos);


        if (chavesAtivas.length === 0) {
            // Nenhuma selecionada: restaura todas as solicitações originais
            paginacao.dadosCompletos = paginacao.dadosOriginais.slice();
            $("#avisoFiltroCriticidade").remove();
        } else {
            // Filtra permitindo qualquer uma das criticidades ativas
            paginacao.dadosCompletos = $.grep(paginacao.dadosOriginais, function (sol) {
                var info = identificarCriticidade(sol);
                if (!info || !info.nivel) return false;
                var n = String(info.nivel).toUpperCase();
                if (n === "MÉDIA") n = "MEDIA";
                return paginacao.filtrosCriticidadeAtivos[n] === true;
            });

            // Monta rótulo formatado (ex: "Alta, Média")
            var nomesRotulo = $.map(chavesAtivas, function (k) {
                if (k === "ALTA") return "Alta";
                if (k === "MEDIA") return "Média";
                if (k === "BAIXA") return "Baixa";
                return k;
            }).join(", ");

            if ($("#avisoFiltroCriticidade").length === 0) {
                $("#tblResultados").before(
                    '<div id="avisoFiltroCriticidade" style="background:#fff3cd; border:1px solid #ffeeba; color:#856404; padding:8px 14px; font-size:13px; display:flex; align-items:center; gap:10px; margin-bottom:0;">' +
                    '  <i class="fluigicon fluigicon-filter" style="color:#856404; font-size:16px;"></i>' +
                    '  <span id="textoAvisoCrit">Filtrando por Criticidade: <strong id="textoCritAtiva">' + nomesRotulo + '</strong> (' + paginacao.dadosCompletos.length + ' de ' + paginacao.dadosOriginais.length + ' solicitações)</span>' +
                    '  <button type="button" class="btn btn-default btn-xs" id="btnLimparFiltroCrit" style="margin-left:auto; font-weight:600;"><i class="fluigicon fluigicon-remove"></i> Mostrar todas</button>' +
                    '</div>'
                );
            } else {
                $("#textoCritAtiva").text(nomesRotulo);
                $("#textoAvisoCrit").html('Filtrando por Criticidade: <strong id="textoCritAtiva">' + nomesRotulo + '</strong> (' + paginacao.dadosCompletos.length + ' de ' + paginacao.dadosOriginais.length + ' solicitações)');
            }
        }

        // Atualiza contador de registros encontrados no painelResultados
        $("#badgeTotal").text(paginacao.dadosCompletos.length);

        // Se o painelResultados estiver oculto e houver dados, exibe
        if (paginacao.dadosCompletos.length > 0) {
            $("#painelResultados").show();
            $("#msgSemResultado").hide();
        }

        // Reseta paginação e re-renderiza o grid
        paginacao.paginaAtual = 1;
        aplicarOrdenacao();
        renderizarPagina();
        atualizarVisualLegendaCriticidade();
    }

    // Atualiza o destaque visual na legenda de criticidade
    function atualizarVisualLegendaCriticidade() {
        var ativos = paginacao.filtrosCriticidadeAtivos || {};
        var chavesAtivas = Object.keys(ativos);

        $(".legenda-criticidades .item-legenda, .filtro-criticidade").each(function () {
            var $el = $(this);
            $el.css({ "cursor": "pointer", "user-select": "none", "transition": "all 0.2s ease" });

            var crit = $el.attr("data-filtro-crit");
            if (!crit) {
                var txt = $el.text().toLowerCase();
                if ($el.find(".alta").length || txt.indexOf("alta") !== -1) crit = "alta";
                else if ($el.find(".media").length || txt.indexOf("media") !== -1 || txt.indexOf("média") !== -1) crit = "media";
                else if ($el.find(".baixa").length || txt.indexOf("baixa") !== -1) crit = "baixa";
            }
            if (!crit) return;
            var critUpper = crit.toUpperCase();
            if (critUpper === "MÉDIA") critUpper = "MEDIA";

            if (chavesAtivas.length === 0) {
                // Nenhuma selecionada: todas com 100% de opacidade e estilo normal
                $el.css({
                    "opacity": "1",
                    "background": "transparent",
                    "box-shadow": "none",
                    "border": "1px solid transparent",
                    "border-radius": "3px",
                    "padding": "2px 6px",
                    "font-weight": "normal"
                });
            } else if (ativos[critUpper]) {
                // Esta está selecionada: destaque com borda branca e fundo iluminado
                $el.css({
                    "opacity": "1",
                    "background": "rgba(255, 255, 255, 0.35)",
                    "box-shadow": "0 0 0 2px #ffffff",
                    "border": "1px solid #ffffff",
                    "border-radius": "3px",
                    "padding": "2px 6px",
                    "font-weight": "bold"
                });
            } else {
                // As que não estão selecionadas ficam esmaecidas
                $el.css({
                    "opacity": "0.35",
                    "background": "transparent",
                    "box-shadow": "none",
                    "border": "1px solid transparent",
                    "border-radius": "3px",
                    "padding": "2px 6px",
                    "font-weight": "normal"
                });
            }
        });
    }

    // ------------------------------------------------------------------
    // DATEPICKERS (FLUIGC.calendar)
    // ------------------------------------------------------------------
    function inicializarDatepickers() {
        try {
            if (typeof FLUIGC !== "undefined" && FLUIGC.calendar) {
                FLUIGC.calendar("#dtInicio_TESTEGEMINI", { pickDate: true, pickTime: false, sideBySide: false, locale: "pt-br", format: "DD/MM/YYYY" });
                FLUIGC.calendar("#dtFim_TESTEGEMINI", { pickDate: true, pickTime: false, sideBySide: false, locale: "pt-br", format: "DD/MM/YYYY" });
            } else {
                console.warn("FLUIGC.calendar não encontrado.");
            }
        } catch (e) {
            console.error("Falha ao inicializar FLUIGC.calendar.", e);
        }

        // Garante que clicar no ícone do calendário abra o datepicker
        $("#grpDtInicio_TESTEGEMINI").on("click", ".input-group-addon", function () {
            $("#dtInicio_TESTEGEMINI").focus();
        });
        $("#grpDtFim_TESTEGEMINI").on("click", ".input-group-addon", function () {
            $("#dtFim_TESTEGEMINI").focus();
        });
    }

    // ------------------------------------------------------------------
    // CARREGAR LISTA DE PROCESSOS (combobox)
    // ------------------------------------------------------------------
    // ------------------------------------------------------------------
    // CARREGAR LISTA DE PROCESSOS (combobox) - Filtrado por Papéis / Grupos do Usuário
    // ------------------------------------------------------------------
    function carregarProcessos() {
        exibirLoading(true);

        var usuarioLogado = (obterUsuarioLogado() || "").trim();

        // 1. Obtém todos os papéis e grupos do usuário logado
        obterPapeisEGruposDoUsuario(usuarioLogado, function (infoUsuario) {


            // 2. Busca lista de processos disponíveis
            $.ajax({
                url: CONFIG.urlProcessos,
                type: "GET",
                dataType: "json",
                headers: { "Accept": "application/json" }
            }).done(function (response) {
                var processos = (response && (response.items || response.content || (Array.isArray(response) ? response : []))) || [];

                if (processos.length > 0) {
                    processarEFiltrarProcessos(processos, infoUsuario);
                    return;
                }

                // Se a REST retornou vazio, tenta carregar via Dataset do Fluig
                carregarProcessosViaDataset(infoUsuario);
            }).fail(function (xhr) {
                console.warn("[TESTEGEMINI] Falha ao carregar processos via REST, tentando via Dataset...", xhr);
                carregarProcessosViaDataset(infoUsuario);
            });
        });
    }

    // Identifica os papéis (workflowColleagueRole) e grupos (colleagueGroup) aos quais o usuário pertence
    function obterPapeisEGruposDoUsuario(usuario, callback) {
        var dadosUsuario = {
            usuario: usuario,
            papeis: [],
            grupos: [],
            setIdentificadores: {}
        };

        if (!usuario) {
            callback(dadosUsuario);
            return;
        }

        dadosUsuario.setIdentificadores[usuario.toLowerCase()] = true;

        // Se DatasetFactory estiver disponível diretamente no navegador
        if (typeof DatasetFactory !== "undefined" && DatasetFactory.getDataset) {
            try {
                // Consulta papéis do usuário
                var cRole = DatasetFactory.createConstraint("workflowColleagueRolePK.colleagueId", usuario, usuario, ConstraintType.MUST);
                var dsRoles = DatasetFactory.getDataset("workflowColleagueRole", null, [cRole], null);
                if (dsRoles && dsRoles.values) {
                    $.each(dsRoles.values, function (i, r) {
                        var roleId = r.roleId || r["workflowColleagueRolePK.roleId"];
                        if (roleId) {
                            dadosUsuario.papeis.push(roleId);
                            dadosUsuario.setIdentificadores[String(roleId).toLowerCase()] = true;
                            dadosUsuario.setIdentificadores["pool:role:" + String(roleId).toLowerCase()] = true;
                        }
                    });
                }
            } catch (eR) {
                console.warn("[TESTEGEMINI] Erro ao consultar workflowColleagueRole via DatasetFactory:", eR);
            }

            try {
                // Consulta grupos do usuário
                var cGroup = DatasetFactory.createConstraint("colleagueGroupPK.colleagueId", usuario, usuario, ConstraintType.MUST);
                var dsGroups = DatasetFactory.getDataset("colleagueGroup", null, [cGroup], null);
                if (dsGroups && dsGroups.values) {
                    $.each(dsGroups.values, function (i, g) {
                        var groupId = g.groupId || g["colleagueGroupPK.groupId"];
                        if (groupId) {
                            dadosUsuario.grupos.push(groupId);
                            dadosUsuario.setIdentificadores[String(groupId).toLowerCase()] = true;
                            dadosUsuario.setIdentificadores["pool:group:" + String(groupId).toLowerCase()] = true;
                        }
                    });
                }
            } catch (eG) {
                console.warn("[TESTEGEMINI] Erro ao consultar colleagueGroup via DatasetFactory:", eG);
            }

            callback(dadosUsuario);
            return;
        }

        // Fallback: busca via API pública de dataset do Fluig
        var pRoles = $.ajax({
            url: "/api/public/ecm/dataset/search",
            type: "POST",
            contentType: "application/json",
            dataType: "json",
            data: JSON.stringify({
                datasetId: "workflowColleagueRole",
                searchField: "workflowColleagueRolePK.colleagueId",
                searchValue: usuario
            })
        });

        var pGroups = $.ajax({
            url: "/api/public/ecm/dataset/search",
            type: "POST",
            contentType: "application/json",
            dataType: "json",
            data: JSON.stringify({
                datasetId: "colleagueGroup",
                searchField: "colleagueGroupPK.colleagueId",
                searchValue: usuario
            })
        });

        $.when(pRoles, pGroups).always(function (resRoles, resGroups) {
            try {
                var listR = (resRoles && resRoles[0] && resRoles[0].content && resRoles[0].content.values) || [];
                $.each(listR, function (i, r) {
                    var roleId = r.roleId || r["workflowColleagueRolePK.roleId"];
                    if (roleId) {
                        dadosUsuario.papeis.push(roleId);
                        dadosUsuario.setIdentificadores[String(roleId).toLowerCase()] = true;
                        dadosUsuario.setIdentificadores["pool:role:" + String(roleId).toLowerCase()] = true;
                    }
                });
            } catch (errR) { }

            try {
                var listG = (resGroups && resGroups[0] && resGroups[0].content && resGroups[0].content.values) || [];
                $.each(listG, function (i, g) {
                    var groupId = g.groupId || g["colleagueGroupPK.groupId"];
                    if (groupId) {
                        dadosUsuario.grupos.push(groupId);
                        dadosUsuario.setIdentificadores[String(groupId).toLowerCase()] = true;
                        dadosUsuario.setIdentificadores["pool:group:" + String(groupId).toLowerCase()] = true;
                    }
                });
            } catch (errG) { }

            callback(dadosUsuario);
        });
    }

    // Filtra os processos verificando se o usuário, seus papéis ou seus grupos têm acesso/atribuição nele
    function processarEFiltrarProcessos(processos, infoUsuario) {
        if (!processos || processos.length === 0) {
            preencherSelectProcessos([]);
            exibirLoading(false);
            return;
        }

        // Se não identificou usuário ou não há papéis/grupos carregados, renderiza a lista completa
        if (!infoUsuario || (!infoUsuario.papeis.length && !infoUsuario.grupos.length)) {
            preencherSelectProcessos(processos);
            exibirLoading(false);
            return;
        }

        // Consulta os processos que possuem mecanismo de atribuição ou segurança associados aos papéis/grupos do usuário
        obterProcessosVinculados(infoUsuario, function (mapaProcessosPermitidos) {
            var filtrados = [];

            $.each(processos, function (i, p) {
                var id = p.processId || p.id || p.code || p.processDescriptionPK;
                if (!id) return;

                var idStr = String(id).toLowerCase();

                // Se o processo foi mapeado nos papéis/grupos do usuário
                if (mapaProcessosPermitidos[idStr]) {
                    filtrados.push(p);
                    return;
                }

                // Verificação direta no próprio objeto do processo se retornado pela API REST
                var achou = false;
                if (p.roles || p.groups || p.assignees) {
                    var membros = [].concat(p.roles || [], p.groups || [], p.assignees || []);
                    for (var m = 0; m < membros.length; m++) {
                        var mb = String(membros[m].code || membros[m].id || membros[m] || "").toLowerCase();
                        if (infoUsuario.setIdentificadores[mb]) {
                            achou = true;
                            break;
                        }
                    }
                }

                if (achou) {
                    filtrados.push(p);
                }
            });

            // Se o filtro estrito encontrou os processos onde o usuário tem papel/grupo, usa eles
            if (filtrados.length > 0) {
                preencherSelectProcessos(filtrados);
            } else {
                // Se nenhum processo foi mapeado pelos datasets de permissão, mantém os processos encontrados

                preencherSelectProcessos(processos);
            }
            exibirLoading(false);
        });
    }

    // Mapeia os processos vinculados aos papéis e grupos do usuário nos datasets de segurança e tarefas do Fluig
    function obterProcessosVinculados(infoUsuario, callback) {
        var mapaPermitidos = {};

        // 1. Tenta via Dataset processSecurity (permissões de processos por papel/grupo/usuário)
        if (typeof DatasetFactory !== "undefined" && DatasetFactory.getDataset) {
            try {
                var dsSec = DatasetFactory.getDataset("processSecurity", null, null, null);
                if (dsSec && dsSec.values && dsSec.values.length > 0) {
                    $.each(dsSec.values, function (i, row) {
                        var procId = row.processId || row["processSecurityPK.processId"];
                        var secType = row.type || row["processSecurityPK.type"]; // 1 = user, 2 = group, 3 = role
                        var secCode = row.code || row["processSecurityPK.code"] || row.colleagueId || row.roleId || row.groupId;

                        if (procId && secCode && infoUsuario.setIdentificadores[String(secCode).toLowerCase()]) {
                            mapaPermitidos[String(procId).toLowerCase()] = true;
                        }
                    });
                }
            } catch (eSec) { }

            // 2. Tenta via Dataset processTask / state (atividades dos processos atribuídas a papéis ou grupos)
            try {
                var dsTask = DatasetFactory.getDataset("processTask", null, null, null);
                if (dsTask && dsTask.values && dsTask.values.length > 0) {
                    $.each(dsTask.values, function (i, row) {
                        var procId = row.processId || row["processTaskPK.processId"];
                        var resp = row.assigneeCode || row.colleagueId || row.roleId || row.groupId || row.assignee;
                        if (procId && resp && infoUsuario.setIdentificadores[String(resp).toLowerCase()]) {
                            mapaPermitidos[String(procId).toLowerCase()] = true;
                        }
                    });
                }
            } catch (eTsk) { }
        }

        // 3. Tenta complementar com as tarefas ativas do próprio usuário (v2/tasks)
        $.ajax({
            url: CONFIG.urlMinhasTarefas,
            type: "GET",
            dataType: "json",
            headers: { "Accept": "application/json" }
        }).done(function (resTasks) {
            var items = (resTasks && (resTasks.items || resTasks.content || resTasks)) || [];
            if (Array.isArray(items)) {
                $.each(items, function (i, t) {
                    var pId = t.processId || (t.process && t.process.id);
                    if (pId) {
                        mapaPermitidos[String(pId).toLowerCase()] = true;
                    }
                });
            }
            callback(mapaPermitidos);
        }).fail(function () {
            callback(mapaPermitidos);
        });
    }

    // Fallback de alta disponibilidade: consulta o dataset padrão de processos do Fluig
    function carregarProcessosViaDataset(infoUsuario) {
        if (typeof DatasetFactory !== "undefined" && DatasetFactory.getDataset) {
            try {
                var ds = DatasetFactory.getDataset("processDefinition", null, null, ["processDescription"]);
                if (ds && ds.values && ds.values.length > 0) {
                    var lista = ds.values.map(function (row) {
                        return {
                            processId: row.processId || row["processDefinitionPK.processId"] || row.processCode,
                            name: row.processDescription || row.processName || row.processId
                        };
                    });
                    processarEFiltrarProcessos(lista, infoUsuario);
                    return;
                }
            } catch (e) {
                console.warn("[TESTEGEMINI] Erro ao consultar DatasetFactory processDefinition:", e);
            }
        }

        // Tenta via endpoint público de Dataset
        $.ajax({
            url: "/api/public/ecm/dataset/search",
            type: "POST",
            contentType: "application/json",
            dataType: "json",
            data: JSON.stringify({
                datasetId: "processDefinition",
                resultFields: ["processId", "processDescription"]
            })
        }).done(function (resDs) {
            var listaDs = (resDs && resDs.content && resDs.content.values) || [];
            if (listaDs.length > 0) {
                var listaProc = listaDs.map(function (row) {
                    return {
                        processId: row.processId || row["processDefinitionPK.processId"],
                        name: row.processDescription || row.processId
                    };
                });
                processarEFiltrarProcessos(listaProc, infoUsuario);
            } else {
                $("#selProcesso").html('<option value="">Nenhum processo encontrado</option>');
                exibirLoading(false);
            }
        }).fail(function (errDs) {
            exibirErro("Não foi possível carregar a lista de processos nem via API REST nem via Dataset.", errDs, CONFIG.urlProcessos);
            $("#selProcesso").html('<option value="">Erro ao carregar processos</option>');
            exibirLoading(false);
        });
    }

    function preencherSelectProcessos(lista) {
        var $select = $("#selProcesso");
        $select.empty();
        $select.append('<option value="">Selecione um processo...</option>');

        if (!lista || lista.length === 0) {
            $select.append('<option value="">Nenhum processo encontrado</option>');
            return;
        }

        // Elimina possíveis duplicatas de versões do processo
        var unicos = {};
        $.each(lista, function (i, p) {
            var id = p.processId || p.id;
            if (id && !unicos[id]) {
                unicos[id] = p.name || p.processDescription || id;
            }
        });

        var chaves = Object.keys(unicos).sort(function (a, b) {
            return unicos[a].localeCompare(unicos[b]);
        });

        var defaultProcessId = "";
        $.each(chaves, function (i, id) {
            var nomeProcesso = unicos[id];
            if (nomeProcesso && nomeProcesso.toUpperCase().indexOf("JUR") > -1 && nomeProcesso.toUpperCase().indexOf("PENALIDADES") > -1) {
                defaultProcessId = id;
            }
            $select.append('<option value="' + escapeHtml(id) + '">' + escapeHtml(nomeProcesso) + '</option>');
        });

        // Seleciona automaticamente o processo "Jurdico - Penalidades para colaboradores" se existir e bloqueia
        if (defaultProcessId) {
            $select.val(defaultProcessId);
            $select.prop("disabled", true);
            $select.attr("title", "Processo fixo para este painel");
        }

        // --- BUSCA AUTOMÁTICA AO ABRIR O SISTEMA ---
        // Limpa as datas para trazer TODO o histórico de abertas sem obrigar filtro
        $("#dtInicio_TESTEGEMINI").val("");
        $("#dtFim_TESTEGEMINI").val("");
        
        setTimeout(executarBusca, 300);
    }

    // ------------------------------------------------------------------
    // ENRIQUECER E FILTRAR (LOTE / PERFORMANCE)
    // ------------------------------------------------------------------
    function enriquecerEFiltrarAnalisarJuridico(solicitacoes, processId, callback) {
        $("#textoLoadingOverlay").text("Identificando Jurídico...");
        
        var solicitacoesJuridico = [];
        
        $.ajax({
            url: "/api/public/ecm/dataset/datasets",
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify({
                name: "DS_ATIVIDADES_PROCESSO",
                constraints: [
                    { _field: "processId", _initialValue: processId, _finalValue: processId, _type: 1 }
                ]
            }),
            success: function(res) {
                var valores = (res && res.content && res.content.values) ? res.content.values : [];
                var mapaAtividades = {};
                
                $.each(valores, function(i, row) {
                    if (row.processInstanceId) {
                        mapaAtividades[String(row.processInstanceId)] = String(row.atividade || "");
                    }
                });

                $.each(solicitacoes, function(i, sol) {
                    var atv = mapaAtividades[String(sol.processInstanceId)] || "";
                    if (atv.toUpperCase().indexOf("JURIDICO") > -1) {
                        // Injeta fake task para que extrairNomeAtividade continue funcionando no grid
                        sol.tasks = [{
                            active: true,
                            status: "OPEN",
                            state: { stateName: atv }
                        }];
                        solicitacoesJuridico.push(sol);
                    }
                });

                buscarOcorrenciasParaCriticidade(solicitacoesJuridico, callback);
            },
            error: function() {
                // Se der erro no dataset, cai pro fluxo sem filtro e as solicitações são devolvidas integralmente
                buscarOcorrenciasParaCriticidade(solicitacoes, callback);
            }
        });
    }

    function buscarOcorrenciasParaCriticidade(lista, callback) {
        $("#textoLoadingOverlay").text("Calculando criticidades...");
        var BATCH_DS = 100;
        var promessasDs = [];

        for (var i = 0; i < lista.length; i += BATCH_DS) {
            var loteDs = lista.slice(i, i + BATCH_DS);
            var ids = [];
            $.each(loteDs, function(idx, s) {
                var docId = s.formRecordId || s.cardDocumentId || s.documentId;
                if (docId) ids.push(docId);
            });

            if (ids.length > 0) {
                var p = $.Deferred();
                var cardIdIn = ids.join(",");
                $.ajax({
                    url: "/api/public/ecm/dataset/datasets",
                    type: "POST",
                    contentType: "application/json",
                    data: JSON.stringify({
                        name: "DS_EXTRAIR_OCORRENCIA_V2",
                        constraints: [
                            { _field: "cardIdIn", _initialValue: cardIdIn, _finalValue: cardIdIn, _type: 1 }
                        ]
                    }),
                    success: function(res) {
                        var valores = (res && res.content && res.content.values) ? res.content.values : [];
                        $.each(valores, function(k, row) {
                            if (row.cardId && row.ocorrencia) {
                                $.each(lista, function(idx, solItem) {
                                    var dId = solItem.formRecordId || solItem.cardDocumentId || solItem.documentId;
                                    if (String(dId) === String(row.cardId)) {
                                        solItem.ocorrenciaExtraidaParaResumo = row.ocorrencia;
                                        // Setamos também as tags para que renderizarResultados use
                                        solItem.infoCriticidade = identificarCriticidade(solItem);
                                    }
                                });
                            }
                        });
                        p.resolve();
                    },
                    error: function() { p.resolve(); }
                });
                promessasDs.push(p);
            }
        }

        if (promessasDs.length === 0) {
            callback(lista);
        } else {
            $.when.apply($, promessasDs).always(function() {
                callback(lista);
            });
        }
    }

    // ------------------------------------------------------------------
    // EXECUTAR BUSCA DE SOLICITAÇÕES
    // ------------------------------------------------------------------
    function executarBusca() {
        var dtInicio = $("#dtInicio_TESTEGEMINI").val();
        var dtFim = $("#dtFim_TESTEGEMINI").val();
        var processId = $("#selProcesso").val();
        
        var txtInicio = $.trim($("#numSolicitacaoInicio").val());
        var txtFim = $.trim($("#numSolicitacaoFim").val());
        
        // Verifica se tem vírgulas pra identificar busca multi-id
        var isMultiId = txtInicio.indexOf(",") > -1 || txtFim.indexOf(",") > -1;
        var arrayMultiIds = [];
        
        var numSolInicio = NaN;
        var numSolFim = NaN;
        
        if (isMultiId) {
            var txtJunto = (txtInicio + "," + txtFim).replace(/,+/g, ",");
            arrayMultiIds = txtJunto.split(",").map(function(s) { return parseInt($.trim(s), 10); }).filter(function(n) { return !isNaN(n); });
        } else {
            numSolInicio = parseInt(txtInicio, 10);
            numSolFim = parseInt(txtFim, 10);
        }
        
        var tipoFiltro = $("input[name='optTipoFiltro']:checked").val();

        var statusAbertas = $("#chkStatusAbertas").is(":checked");
        var statusFinalizadas = $("#chkStatusFinalizadas").is(":checked");
        var statusCanceladas = $("#chkStatusCanceladas").is(":checked");

        var filtroAtividade = $.trim($("#txtFiltroAtividade").val() || "").toLowerCase();
        var escopoSolicitacao = $("input[name='optEscopoSolicitacao']:checked").val() || "TODAS";

        // --------- Validações ---------
        var isPesquisaExataIdSemProcesso = false;
        var idsExatosParaBuscar = [];

        if (tipoFiltro === "NUMERO") {
            if (isMultiId && arrayMultiIds.length > 0) {
                idsExatosParaBuscar = arrayMultiIds.slice();
            } else if (!isNaN(numSolInicio) && numSolInicio > 0 && (isNaN(numSolFim) || numSolInicio === numSolFim)) {
                idsExatosParaBuscar = [numSolInicio];
            } else if (isNaN(numSolInicio) && !isNaN(numSolFim) && numSolFim > 0) {
                idsExatosParaBuscar = [numSolFim];
            }
        }

        if (!processId) {
            if (idsExatosParaBuscar.length > 0) {
                isPesquisaExataIdSemProcesso = true;
            } else {
                exibirAlerta("Selecione um processo para realizar a consulta, ou informe um Número de Solicitação específico.", "warning");
                return;
            }
        }

        if (tipoFiltro === "DATA") {
            if (dtInicio && dtFim) {
                if (converterParaDate(dtInicio) > converterParaDate(dtFim)) {
                    exibirAlerta("A Data Inicial não pode ser maior que a Data Final.", "warning");
                    return;
                }
            }
        } else if (tipoFiltro === "NUMERO") {
            if (!isMultiId && isNaN(numSolInicio) && isNaN(numSolFim)) {
                exibirAlerta("Informe pelo menos um Número de Solicitação (ou lista separada por vírgula) para a consulta.", "warning");
                return;
            }
            if (!isMultiId && !isNaN(numSolInicio) && !isNaN(numSolFim) && numSolInicio > numSolFim) {
                exibirAlerta("O número inicial não pode ser maior que o final.", "warning");
                return;
            }
        }

        if (!statusAbertas && !statusFinalizadas && !statusCanceladas) {
            exibirAlerta("Selecione pelo menos um Status (Abertas, Finalizadas ou Canceladas).", "warning");
            return;
        }

        processoSelecionadoId = processId;

        var params = {};
        if (tipoFiltro === "DATA") {
            params.startDate = converterDataParaApi(dtInicio);
            params.endDate = converterDataParaApi(dtFim);
        }

        exibirLoading(true);

        var usuarioLogado = obterUsuarioLogado().toLowerCase();

        // Se o usuário selecionou qualquer escopo restrito ao seu usuário (Participou, Inicializou, Gerenciou)
        var precisaTarefasUsuario = (escopoSolicitacao !== "TODAS");

        var requisicaoTarefas = precisaTarefasUsuario ?
            $.ajax({
                url: CONFIG.urlMinhasTarefas,
                type: "GET",
                dataType: "json",
                headers: { "Accept": "application/json" }
            }).catch(function() { return [{ items: [] }]; }) :
            $.Deferred().resolve([{ items: [] }]);

        var requisicaoPrincipal = null;
        // Identifica se pode passar status pra API pra aliviar
        var statusParaApi = "";
        if (statusAbertas && !statusFinalizadas && !statusCanceladas) statusParaApi = "0"; // 0 = OPEN na V2
        else if (!statusAbertas && statusFinalizadas && !statusCanceladas) statusParaApi = "2"; // 2 = COMPLETED
        else if (!statusAbertas && !statusFinalizadas && statusCanceladas) statusParaApi = "1"; // 1 = CANCELED

        if (isPesquisaExataIdSemProcesso) {
            // Busca apenas os IDs exatos
            var proms = idsExatosParaBuscar.map(function(id) {
                return $.ajax({
                    url: "/process-management/api/v2/requests/" + id + "?expand=requester",
                    type: "GET",
                    dataType: "json",
                    headers: { "Accept": "application/json" }
                }).catch(function() { return null; });
            });
            requisicaoPrincipal = $.when.apply($, proms).then(function() {
                var resultados = Array.prototype.slice.call(arguments).map(function(r) { return r ? r[0] : null; });
                var validos = resultados.filter(function(r) { return r !== null; });
                return [{ items: validos }]; 
            });
        } else {
            // ==== SOLUÇÃO AVANÇADA MAP-REDUCE: Utiliza o Dataset Fast ====
            requisicaoPrincipal = $.Deferred();
            try {
                var c1 = DatasetFactory.createConstraint("processId", processId, processId, ConstraintType.MUST);
                var constraintsDataset = [c1];
                if (statusParaApi !== "") {
                    constraintsDataset.push(DatasetFactory.createConstraint("status", statusParaApi, statusParaApi, ConstraintType.MUST));
                }

                DatasetFactory.getDataset("DS_PENALIDADES_FAST", null, constraintsDataset, null, {
                    success: function(retorno) {
                        if (!retorno || !retorno.values) {
                            requisicaoPrincipal.resolve([{ items: [] }]);
                            return;
                        }

                        // Mapeia o retorno do Dataset para o formato que a API V2 entregava,
                        // para não quebrar o resto do código da Widget!
                        var items = retorno.values.map(function(row) {
                            // O status precisa voltar ao padrão da API V2 ("OPEN", "CANCELED", "COMPLETED")
                            var apiStatus = "OPEN";
                            if (row.status == "1") apiStatus = "CANCELED";
                            else if (row.status == "2") apiStatus = "COMPLETED";
                            
                            // Cria objeto simulando o requester expandido
                            var requester = null;
                            if (row.requesterId && row.requesterId !== "null" && row.requesterId !== "") {
                                requester = { code: row.requesterId, name: row.requesterId };
                            }

                            // Cria o Active Task
                            var activeTasks = [];
                            if (row.taskState && row.taskState !== "" && row.taskState !== "null") {
                                activeTasks.push({
                                    stateId: row.taskState,
                                    choosedSequence: row.taskState,
                                    assignee: row.assignee && row.assignee !== "null" ? { code: row.assignee, name: row.assignee } : null,
                                    deadlineDate: row.deadline && row.deadline !== "null" ? row.deadline : null
                                });
                            }

                            return {
                                processInstanceId: row.processInstanceId,
                                startDate: row.startDate !== "null" ? row.startDate : null,
                                status: apiStatus,
                                requester: requester,
                                activeTasks: activeTasks,
                                processId: row.processId !== "null" ? row.processId : processId
                            };
                        });

                        requisicaoPrincipal.resolve([{ items: items }]);
                    },
                    error: function(err) {
                        console.error("[TESTEGEMINI] Erro no DS_PENALIDADES_FAST:", err);
                        requisicaoPrincipal.resolve([{ items: [] }]);
                    }
                });
            } catch (e) {
                console.error("[TESTEGEMINI] Exceção ao chamar DS_PENALIDADES_FAST:", e);
                requisicaoPrincipal.resolve([{ items: [] }]);
            }
        }

        $.when(requisicaoPrincipal, requisicaoTarefas).done(function (respSol, respTasks) {
            var response = respSol[0] || {};
            var solicitacoes = response.items || response.content || response || [];
            if (solicitacoes.length > 0) {

            }
            console.log("[TESTEGEMINI] Total recebido da API:", solicitacoes.length);

            // 1. Filtro por número de solicitação (faixa ou lista de IDs)
            var idsBuscadosEspecificos = [];
            if (isMultiId && arrayMultiIds.length > 0) {
                idsBuscadosEspecificos = arrayMultiIds.slice();
                solicitacoes = $.grep(solicitacoes, function (s) {
                    var n = parseInt(s.processInstanceId, 10);
                    return arrayMultiIds.indexOf(n) > -1;
                });
            } else {
                if (!isNaN(numSolInicio) && numSolInicio > 0) {
                    idsBuscadosEspecificos.push(numSolInicio);
                    solicitacoes = $.grep(solicitacoes, function (s) {
                        var n = parseInt(s.processInstanceId, 10);
                        return n >= numSolInicio;
                    });
                }
                if (!isNaN(numSolFim) && numSolFim > 0) {
                    if (idsBuscadosEspecificos.indexOf(numSolFim) === -1) {
                        idsBuscadosEspecificos.push(numSolFim);
                    }
                    solicitacoes = $.grep(solicitacoes, function (s) {
                        var n = parseInt(s.processInstanceId, 10);
                        return n <= numSolFim;
                    });
                }
            }
            console.log("[TESTEGEMINI] Após filtro ID:", solicitacoes.length);

            // Verifica se o usuário pesquisou por um ID específico que pertence a outro processo
            if (idsBuscadosEspecificos.length > 0 && !isPesquisaExataIdSemProcesso) {
                validarIdsFaltantes(idsBuscadosEspecificos, solicitacoes, processId);
            }

            // 1.1. Filtro estrito de Data no cliente (a API v2 do Fluig muitas vezes ignora ou faz busca ampla nos parâmetros de data)
            if (tipoFiltro === "DATA" && dtInicio && dtFim) {
                var dateInicioObj = converterParaDate(dtInicio);
                dateInicioObj.setHours(0, 0, 0, 0);
                var timeInicio = dateInicioObj.getTime();

                var dateFimObj = converterParaDate(dtFim);
                dateFimObj.setHours(23, 59, 59, 999);
                var timeFim = dateFimObj.getTime();

                solicitacoes = $.grep(solicitacoes, function (s) {
                    if (!s.startDate) return true;
                    var dtSol = new Date(s.startDate).getTime();
                    if (isNaN(dtSol)) return true;
                    return dtSol >= timeInicio && dtSol <= timeFim;
                });
                console.log("[TESTEGEMINI] Após filtro DATA:", solicitacoes.length);
            }

            // 2. Filtro por Status (Abertas / Finalizadas / Canceladas)
            solicitacoes = $.grep(solicitacoes, function (sol) {
                var st = normalizarStatus(sol.status || sol.state).chaveFiltro;
                var condAberta = statusAbertas && st === "ABERTO";
                var condFinalizada = statusFinalizadas && st === "FINALIZADO";
                var condCancelada = statusCanceladas && st === "CANCELADO";
                return condAberta || condFinalizada || condCancelada;
            });
            console.log("[TESTEGEMINI] Após filtro STATUS:", solicitacoes.length);

            // 3. Filtro por Escopo de Solicitações
            if (precisaTarefasUsuario) {
                var mapaTarefasUsuario = {};
                var tarefas = (respTasks[0] && (respTasks[0].items || respTasks[0].content || respTasks[0])) || [];
                if (Array.isArray(tarefas)) {
                    $.each(tarefas, function (idx, t) {
                        var pId = t.processInstanceId || t.processId;
                        if (pId) {
                            mapaTarefasUsuario[pId] = t;
                        }
                    });
                }

                solicitacoes = $.grep(solicitacoes, function (sol) {
                    var instId = sol.processInstanceId;
                    var solicitanteCode = "";
                    if (sol.requester) {
                        solicitanteCode = String(sol.requester.userId || sol.requester.login || sol.requester.code || sol.requester.name || "").toLowerCase();
                    }

                    if (escopoSolicitacao === "INICIALIZEI") {
                        return solicitanteCode === usuarioLogado;
                    }
                    if (escopoSolicitacao === "PARTICIPEI") {
                        if (solicitanteCode === usuarioLogado) return true;
                        
                        var respAtual = (sol.assignee && (sol.assignee.code || sol.assignee.name)) || "";
                        if (String(respAtual).toLowerCase() === usuarioLogado) return true;
                        
                        // Verifica se existe tarefa pendente *diretamente* para o usuário (ignorando pool)
                        if (mapaTarefasUsuario[instId]) {
                            var t = mapaTarefasUsuario[instId];
                            var tAssignee = (t.assignee && (t.assignee.code || t.assignee.name)) || "";
                            if (String(tAssignee).toLowerCase() === usuarioLogado) return true;
                        }
                        
                        return false;
                    }
                    if (escopoSolicitacao === "GESTOR" || escopoSolicitacao === "MINHA_GERENCIA") {
                        // Verifica indicação de gerência ou participação de gestão
                        return mapaTarefasUsuario[instId] || solicitanteCode === usuarioLogado;
                    }
                    return true;
                });
            }

            // Se o usuário preencheu o filtro de atividade atual, enriquecemos as solicitações
            // antes de filtrar para garantir que atividades como "Notificação" sejam encontradas
            if (filtroAtividade) {
                enriquecerEFiltrarPorAtividade(solicitacoes, processId, filtroAtividade, function (solicitacoesFiltradas) {
                    renderizarResultados(solicitacoesFiltradas, processId);
                    exibirLoading(false);
                });
                return; // O loading será fechado no callback
            }

            renderizarResultados(solicitacoes, processId);
        }).fail(function (xhr) {
            exibirErro("Erro ao buscar solicitações do processo selecionado.", xhr, CONFIG.urlSolicitacoes(processId));
            $("#painelResultados").hide();
            $("#msgSemResultado").hide();
        }).always(function () {
            // Se o filtro de atividade foi preenchido, o loading é gerenciado pelo callback assíncrono
            if (!filtroAtividade) {
                exibirLoading(false);
            }
        });
    }

    function enriquecerEFiltrarPorAtividade(solicitacoes, processId, filtroTexto, callback) {
        if (!solicitacoes || solicitacoes.length === 0) {
            callback([]);
            return;
        }

        function normalizarTexto(txt) {
            if (!txt) return "";
            return String(txt)
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");
        }

        var filtroTextoNorm = normalizarTexto(filtroTexto);
        var abertasParaEnriquecer = [];

        $.each(solicitacoes, function (i, sol) {
            var stChave = normalizarStatus(sol.status || sol.state).chaveFiltro;
            if (stChave !== "FINALIZADO") {
                abertasParaEnriquecer.push(sol);
            }
        });

        if (abertasParaEnriquecer.length === 0) {
            callback([]);
            return;
        }

        var promessas = $.map(abertasParaEnriquecer, function (sol) {
            var instId = sol.processInstanceId;
            var defer = $.Deferred();

            if (cacheTarefasSolicitacao[instId]) {
                sol.tasks = cacheTarefasSolicitacao[instId].tasks;
                defer.resolve(sol);
                return defer.promise();
            }

            $.ajax({
                url: CONFIG.urlDetalheSolicitacao(processId, instId),
                type: "GET",
                dataType: "json",
                headers: { "Accept": "application/json" }
            }).done(function (resp) {
                var tasks = (resp && (resp.items || resp.content || resp)) || [];
                if (!Array.isArray(tasks)) tasks = [];
                sol.tasks = tasks;
                
                cacheTarefasSolicitacao[instId] = {
                    atividade: extrairNomeAtividade(sol),
                    responsavel: extrairResponsavel(sol),
                    tasks: tasks
                };
                
                defer.resolve(sol);
            }).fail(function () {
                sol.tasks = [];
                defer.resolve(sol);
            });

            return defer.promise();
        });

        $.when.apply($, promessas).done(function () {
            var solicitacoesAbertasFiltradas = $.grep(abertasParaEnriquecer, function (sol) {
                var descAtividade = extrairNomeAtividade(sol);
                var idAtividade = (sol.currentState && sol.currentState.stateSequence) ||
                                  (sol.state && sol.state.stateSequence) || "";
                var textoParaComparar = normalizarTexto(descAtividade + " " + idAtividade);
                return textoParaComparar.indexOf(filtroTextoNorm) !== -1;
            });

            var resultadoFinal = [];
            $.each(solicitacoes, function (i, sol) {
                var stChave = normalizarStatus(sol.status || sol.state).chaveFiltro;
                if (stChave === "FINALIZADO") {
                    resultadoFinal.push(sol);
                } else if (solicitacoesAbertasFiltradas.indexOf(sol) !== -1) {
                    resultadoFinal.push(sol);
                }
            });

            callback(resultadoFinal);
        });
    }

    // ------------------------------------------------------------------
    // RENDERIZAR TABELA DE RESULTADOS
    // ------------------------------------------------------------------
    function renderizarResultados(solicitacoes, processId) {
        if (!solicitacoes || solicitacoes.length === 0) {
            $("#painelResultados").hide();
            $("#msgSemResultado").show();
            paginacao.dadosCompletos = [];
            return;
        }

        $("#msgSemResultado").hide();
        $("#badgeTotal").text(solicitacoes.length);

        paginacao.dadosOriginais = solicitacoes.slice();
        paginacao.filtrosCriticidadeAtivos = {};
        paginacao.dadosCompletos = solicitacoes.slice();
        paginacao.processId = processId;
        paginacao.paginaAtual = 1;

        $("#avisoFiltroCriticidade").remove();
        atualizarVisualLegendaCriticidade();

        aplicarOrdenacao();
        atualizarIconesOrdenacao();

        $("#painelResultados").show();
        renderizarPagina();
    }

    // Aplica a ordenação no array paginacao.dadosCompletos
    function aplicarOrdenacao() {
        if (!paginacao.dadosCompletos || paginacao.dadosCompletos.length === 0) return;

        var campo = paginacao.campoOrdenacao;
        var dir = paginacao.direcaoOrdenacao === "asc" ? 1 : -1;

        // Peso da criticidade: quanto maior, mais prioritária no topo da listagem
        function pesoCriticidade(sol) {
            var info = identificarCriticidade(sol);
            if (!info || !info.nivel) return 0;
            var niv = String(info.nivel).toUpperCase();
            if (niv === "ALTA") return 3;
            if (niv === "MEDIA" || niv === "MÉDIA") return 2;
            if (niv === "BAIXA") return 1;
            return 0;
        }

        paginacao.dadosCompletos.sort(function (a, b) {
            // Regra principal: ordena SEMPRE pela criticidade mais alta primeiro
            // (ex: Alta vem antes de Média, Média vem antes de Baixa)
            var pA = pesoCriticidade(a);
            var pB = pesoCriticidade(b);
            if (pA !== pB) {
                return pB - pA; // decrescente por peso: 3 (Alta) > 2 (Média) > 1 (Baixa) > 0
            }

            // Em caso de mesma criticidade, aplica o critério da coluna selecionada
            var valA = "";
            var valB = "";

            if (campo === "numero") {
                var numA = parseInt(a.processInstanceId, 10) || 0;
                var numB = parseInt(b.processInstanceId, 10) || 0;
                return (numA - numB) * dir;
            } else if (campo === "descricao") {
                valA = (a.processDescription || "").toLowerCase();
                valB = (b.processDescription || "").toLowerCase();
            } else if (campo === "solicitante") {
                valA = extrairSolicitante(a).toLowerCase();
                valB = extrairSolicitante(b).toLowerCase();
            } else if (campo === "atividade") {
                valA = extrairNomeAtividade(a).toLowerCase();
                valB = extrairNomeAtividade(b).toLowerCase();
            } else if (campo === "responsavel") {
                valA = extrairResponsavel(a).toLowerCase();
                valB = extrairResponsavel(b).toLowerCase();
            } else if (campo === "dataInicial") {
                var dA = a.startDate ? new Date(a.startDate).getTime() : 0;
                var dB = b.startDate ? new Date(b.startDate).getTime() : 0;
                return (dA - dB) * dir;
            } else if (campo === "prazoJuridico") {
                var numA = a.processInstanceId || a.workflowProcessPK.processInstanceId;
                var numB = b.processInstanceId || b.workflowProcessPK.processInstanceId;
                
                var pA = cachePrazos[numA] || "";
                var pB = cachePrazos[numB] || "";
                
                var parsePrazo = function(p) {
                    if (!p || p === "Sem prazo definido" || p.indexOf("/") === -1) {
                        return dir === 1 ? 9999999999999 : -1;
                    }
                    var parts = p.split(" ");
                    var dateParts = parts[0].split("/"); 
                    var hora = parts[1] || "00:00";
                    var timeParts = hora.split(":");
                    if (dateParts.length === 3) {
                        return new Date(dateParts[2], dateParts[1] - 1, dateParts[0], timeParts[0] || 0, timeParts[1] || 0).getTime();
                    }
                    return dir === 1 ? 9999999999999 : -1;
                };
                
                var vA = parsePrazo(pA);
                var vB = parsePrazo(pB);
                
                return (vA - vB) * dir;
            } else if (campo === "status") {
                valA = normalizarStatus(a.status || a.state).rotulo.toLowerCase();
                valB = normalizarStatus(b.status || b.state).rotulo.toLowerCase();
            }

            if (valA < valB) return -1 * dir;
            if (valA > valB) return 1 * dir;
            return 0;
        });
    }

    function extrairNomeAtividade(sol) {
        if (!sol) return "-";

        if (sol.activeTask && sol.activeTask.state) {
            var atNome = sol.activeTask.state.stateDescription || sol.activeTask.state.stateName || sol.activeTask.state.description || sol.activeTask.state.name;
            if (atNome) return atNome;
        }

        // 1. tasks (array expandido de tarefas da solicitação)
        if (sol.tasks && sol.tasks.length > 0) {
            var tarefaAtiva = null;
            // Procura a tarefa ativa/pendente primeiro
            for (var t = 0; t < sol.tasks.length; t++) {
                var tk = sol.tasks[t];
                if (tk.active === true || tk.status === 0 || !tk.endDate || tk.completed === false) {
                    tarefaAtiva = tk;
                    break;
                }
            }
            if (!tarefaAtiva) {
                tarefaAtiva = sol.tasks[sol.tasks.length - 1];
            }
            if (tarefaAtiva) {
                var tkNome = (tarefaAtiva.state && (tarefaAtiva.state.stateDescription || tarefaAtiva.state.stateName || tarefaAtiva.state.description || tarefaAtiva.state.name)) ||
                             tarefaAtiva.stateDescription || tarefaAtiva.stateName || tarefaAtiva.description || tarefaAtiva.name;
                if (tkNome) return tkNome;
            }
        }

        // 2. currentState
        if (sol.currentState) {
            var csNome = sol.currentState.stateDescription || sol.currentState.stateName || sol.currentState.description || sol.currentState.name;
            if (csNome) return csNome;
        }

        // 3. state
        if (sol.state) {
            var stNome = sol.state.stateDescription || sol.state.stateName || sol.state.description || sol.state.name;
            if (stNome) return stNome;
        }

        // 4. currentTask
        if (sol.currentTask) {
            var ctNome = sol.currentTask.stateDescription || sol.currentTask.stateName || sol.currentTask.description || sol.currentTask.name;
            if (ctNome) return ctNome;
        }

        // 5. Propriedades diretas
        if (sol.stateDescription || sol.stateName || sol.activityName || sol.currentStep || sol.taskName) {
            return sol.stateDescription || sol.stateName || sol.activityName || sol.currentStep || sol.taskName;
        }

        if (sol.activeState) {
            return sol.activeState.stateDescription || sol.activeState.stateName || String(sol.activeState);
        }

        if (normalizarStatus(sol.status || sol.state).chaveFiltro === "FINALIZADO") {
            return "Fim / Finalizada";
        }

        return "-";
    }

    function extrairResponsavel(sol) {
        if (!sol) return "Sem responsável";

        // 1. Se tiver activeTask (via api v2 requests)
        if (sol.activeTask && sol.activeTask.assignee) {
            var aNome = sol.activeTask.assignee.name || sol.activeTask.assignee.code || sol.activeTask.assignee.userId;
            if (aNome) return aNome;
        }

        // 2. Se houver tasks, pega o assignee da tarefa ativa
        if (sol.tasks && sol.tasks.length > 0) {
            var tarefaAtiva = null;
            for (var t = 0; t < sol.tasks.length; t++) {
                var tk = sol.tasks[t];
                if (tk.active === true || tk.status === 0 || !tk.endDate || tk.completed === false) {
                    tarefaAtiva = tk;
                    break;
                }
            }
            if (!tarefaAtiva) tarefaAtiva = sol.tasks[sol.tasks.length - 1];
            if (tarefaAtiva) {
                var rNome = (tarefaAtiva.assignee && (tarefaAtiva.assignee.name || tarefaAtiva.assignee.code || tarefaAtiva.assignee.userId)) ||
                            tarefaAtiva.assigneeName || tarefaAtiva.assigneeCode || tarefaAtiva.colleagueName || tarefaAtiva.colleagueId;
                if (rNome) return rNome;
            }
        }

        // 2. Propriedades diretas
        var resp = (sol.assignee && (sol.assignee.name || sol.assignee.code || sol.assignee.userId)) ||
                   (sol.currentAssignee && (sol.currentAssignee.name || sol.currentAssignee.code)) ||
                   sol.assigneeName || sol.colleagueName || sol.colleagueId || sol.responsible || sol.assigneeCode;

        return resp || "Sem responsável";
    }

    function extrairCodigoResponsavel(sol) {
        if (!sol) return "";
        if (sol.tasks && sol.tasks.length > 0) {
            var tarefaAtiva = null;
            for (var t = 0; t < sol.tasks.length; t++) {
                var tk = sol.tasks[t];
                if (tk.active === true || tk.status === 0 || !tk.endDate || tk.completed === false) {
                    tarefaAtiva = tk;
                    break;
                }
            }
            if (!tarefaAtiva) tarefaAtiva = sol.tasks[sol.tasks.length - 1];
            if (tarefaAtiva) {
                var code = (tarefaAtiva.assignee && (tarefaAtiva.assignee.code || tarefaAtiva.assignee.userId)) || tarefaAtiva.assigneeCode || tarefaAtiva.colleagueId;
                if (code) return String(code);
            }
        }
        var codeResp = (sol.assignee && (sol.assignee.code || sol.assignee.userId)) || (sol.currentAssignee && sol.currentAssignee.code) || sol.colleagueId || sol.assigneeCode || sol.responsible;
        return codeResp ? String(codeResp) : "";
    }

    // Identifica se a solicitação possui atividade ativa atribuída a um Papel ou Grupo (Pool)
    function identificarTarefaPapel(sol) {
        if (!sol) return null;

        var st = normalizarStatus(sol.status || sol.state).chaveFiltro;
        if (st !== "ABERTO") return null;

        var userLogado = normalizeStr(obterUsuarioLogado());
        var nomeUsuarioLogado = normalizeStr(obterNomeUsuarioLogado());

        var resp = extrairResponsavel(sol);
        if (!resp || resp === "Sem responsável") return null;

        var respLower = normalizeStr(resp);

        // 1. Se o responsável já for o usuário logado (por login ou nome completo), NÃO É PAPEL/POOL
        if (userLogado && respLower === userLogado) return null;
        if (nomeUsuarioLogado && respLower === nomeUsuarioLogado) return null;
        if (userLogado && userLogado.length > 2 && respLower.indexOf(userLogado) !== -1) return null;
        if (nomeUsuarioLogado && nomeUsuarioLogado.length > 3 && respLower.indexOf(nomeUsuarioLogado) !== -1) return null;

        var movSeq = 1;
        var assigneeCode = "";
        var assigneeName = "";
        var assigneeType = null;
        var isPool = false;

        // 2. Se tiver o array de tarefas ativas
        if (sol.tasks && sol.tasks.length > 0) {
            var tarefaAtiva = null;
            for (var t = 0; t < sol.tasks.length; t++) {
                var tk = sol.tasks[t];
                if (tk.active === true || tk.status === 0 || !tk.endDate || tk.completed === false) {
                    tarefaAtiva = tk;
                    break;
                }
            }
            if (!tarefaAtiva) tarefaAtiva = sol.tasks[sol.tasks.length - 1];
            if (tarefaAtiva) {
                movSeq = tarefaAtiva.movementSequence || tarefaAtiva.processInstanceId || 1;
                if (tarefaAtiva.assignee) {
                    assigneeCode = tarefaAtiva.assignee.code || tarefaAtiva.assignee.userId || "";
                    assigneeName = tarefaAtiva.assignee.name || tarefaAtiva.assignee.fullName || "";
                    assigneeType = tarefaAtiva.assignee.type || tarefaAtiva.assignee.assigneeType;
                }
                if (tarefaAtiva.isPool !== undefined) {
                    isPool = !!tarefaAtiva.isPool;
                }
            }
        }

        var codeLower = String(assigneeCode).toLowerCase().trim();
        var nameLower = String(assigneeName).toLowerCase().trim();

        // 3. Se a tarefa ativa estiver atribuída ao usuário logado, NÃO É PAPEL/POOL
        if (userLogado && codeLower === userLogado) return null;
        if (nomeUsuarioLogado && nameLower === nomeUsuarioLogado) return null;
        if (userLogado && userLogado.length > 2 && codeLower.indexOf(userLogado) !== -1) return null;
        if (nomeUsuarioLogado && nomeUsuarioLogado.length > 3 && nameLower.indexOf(nomeUsuarioLogado) !== -1) return null;

        // 4. Se o tipo for 1 (Usuário individual) e não for explicitamente Pool, NÃO É PAPEL/POOL
        if (assigneeType === 1 && !isPool) {
            return null;
        }

        // 5. Critérios estritos que confirmam que a atividade está em um Papel ou Grupo (Pool)
        var ePapelOuGrupo = isPool === true ||
            assigneeType === 2 || assigneeType === 3 ||
            codeLower.indexOf("pool:role:") !== -1 ||
            codeLower.indexOf("pool:group:") !== -1 ||
            codeLower.indexOf("pool:") !== -1 ||
            respLower.indexOf("pool:") !== -1 ||
            respLower.indexOf("papel") !== -1 ||
            respLower.indexOf("grupo") !== -1 ||
            respLower.indexOf("criticidade alta") !== -1 ||
            respLower.indexOf("criticidade media") !== -1 ||
            respLower.indexOf("criticidade média") !== -1 ||
            respLower.indexOf("criticidade baixa") !== -1;

        if (ePapelOuGrupo) {
            return {
                ehPapel: true,
                responsavel: resp,
                movementSequence: movSeq,
                assigneeCode: assigneeCode
            };
        }

        return null;
    }

    // Identifica o nível de criticidade (ALTA, MEDIA, BAIXA) da solicitação (por Papel, formulário ou campos)
    function identificarCriticidade(sol) {
        if (!sol) return null;

        var textoParaAnalise = "";

        // 1. Analisa os campos extras extraídos (Alta performance no carregamento)
        if (sol.ocorrenciaExtraidaParaResumo) {
            textoParaAnalise += " " + String(sol.ocorrenciaExtraidaParaResumo);
        }

        // 2. Analisa o Responsável / Papel atual
        var resp = extrairResponsavel(sol);
        if (resp) {
            textoParaAnalise += " " + String(resp);
        }

        // 2. Analisa as tarefas e assignees
        if (sol.tasks && sol.tasks.length > 0) {
            $.each(sol.tasks, function (idx, tk) {
                if (tk.assignee) {
                    textoParaAnalise += " " + String(tk.assignee.code || "") + " " + String(tk.assignee.name || "");
                }
                if (tk.state) {
                    textoParaAnalise += " " + String(tk.state.stateName || "") + " " + String(tk.state.stateDescription || "");
                }
            });
        }

        // 3. Analisa propriedades diretas de assignee e formFields se existirem
        if (sol.assignee) {
            textoParaAnalise += " " + String(sol.assignee.code || "") + " " + String(sol.assignee.name || "");
        }
        if (sol.formFields) {
            textoParaAnalise += " " + JSON.stringify(sol.formFields);
        }
        if (sol.rdOcorrencia) {
            textoParaAnalise += " " + String(sol.rdOcorrencia);
        }

        // Normalização de texto sem acentos em maiúsculas
        var norm = String(textoParaAnalise)
            .toUpperCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

        // Detecção de ALTA (papel juridicopenalidadecriticidadealta, ou menção a ALTA ou ASSEDIO)
        if (norm.indexOf("CRITICIDADEALTA") !== -1 ||
            norm.indexOf("CRITICIDADE ALTA") !== -1 ||
            norm.indexOf("JURIDICOPENALIDADEASSEDIO") !== -1 ||
            norm.indexOf("ASSEDIO") !== -1 ||
            norm.indexOf("ALTA ") !== -1 ||
            norm.indexOf(" ALTA") !== -1) {
            return {
                nivel: "ALTA",
                classeLinha: "linha-criticidade-alta",
                classeTag: "tag-criticidade-alta",
                rotulo: "Alta"
            };
        }

        // Detecção de MEDIA (papel juridicopenalidadecriticidademedia ou menção a MEDIA)
        if (norm.indexOf("CRITICIDADEMEDIA") !== -1 ||
            norm.indexOf("CRITICIDADE MEDIA") !== -1 ||
            norm.indexOf("MEDIA ") !== -1 ||
            norm.indexOf(" MEDIA") !== -1) {
            return {
                nivel: "MEDIA",
                classeLinha: "linha-criticidade-media",
                classeTag: "tag-criticidade-media",
                rotulo: "Média"
            };
        }

        // Detecção de BAIXA (papel juridicopenalidadecriticidadebaixa ou menção a BAIXA)
        if (norm.indexOf("CRITICIDADEBAIXA") !== -1 ||
            norm.indexOf("CRITICIDADE BAIXA") !== -1 ||
            norm.indexOf("BAIXA ") !== -1 ||
            norm.indexOf(" BAIXA") !== -1) {
            return {
                nivel: "BAIXA",
                classeLinha: "linha-criticidade-baixa",
                classeTag: "tag-criticidade-baixa",
                rotulo: "Baixa"
            };
        }

        return null;
    }

    function atualizarIconesOrdenacao() {
        $("#tblResultados th.col-sortable").each(function () {
            var col = $(this).attr("data-sort");
            var $icon = $(this).find("i");
            if (col === paginacao.campoOrdenacao) {
                if (paginacao.direcaoOrdenacao === "asc") {
                    $icon.attr("class", "fluigicon fluigicon-chevron-up text-primary");
                } else {
                    $icon.attr("class", "fluigicon fluigicon-chevron-down text-primary");
                }
            } else {
                $icon.attr("class", "fluigicon fluigicon-sort text-muted");
            }
        });
    }

    function extrairSolicitante(sol) {
        if (!sol) return "-";
        if (sol.requester) {
            if (typeof sol.requester === "object") {
                return sol.requester.name || sol.requester.fullName || sol.requester.userId || sol.requester.login || sol.requester.code || "-";
            }
            return String(sol.requester);
        }
        return sol.requesterName || sol.colleagueName || sol.userName || sol.user || sol.requesterCode || sol.requesterId || sol.requesterLogin || "-";
    }

    function extrairOcorrencia(sol) {
        if (!sol) return "-";
        var campos = extrairCamposDeQualquerFonte(sol);
        var oco = "-";
        $.each(campos, function(i, c) {
            if (c.nome === "rdOcorrencia" || c.nome === "ocorrencia") {
                oco = c.valor;
                return false; // break
            }
        });
        if (oco && oco !== "-") {
            var limpa = String(oco).replace(/^(RH\s+)?(ALTA|MEDIA|MÉDIA|BAIXA)\s+/i, "");
            return $.trim(limpa) || "-";
        }
        return "-";
    }

    // Desenha apenas a "fatia" de resultados correspondente à página atual
    function renderizarPagina() {
        var $tbody = $("#tblResultadosBody");
        $tbody.empty();

        var total = paginacao.dadosCompletos.length;
        var totalPaginas = Math.max(1, Math.ceil(total / paginacao.itensPorPagina));

        if (paginacao.paginaAtual > totalPaginas) { paginacao.paginaAtual = totalPaginas; }
        if (paginacao.paginaAtual < 1)             { paginacao.paginaAtual = 1; }

        var inicio = (paginacao.paginaAtual - 1) * paginacao.itensPorPagina;
        var fim = inicio + paginacao.itensPorPagina;
        var itensDaPagina = paginacao.dadosCompletos.slice(inicio, fim);

        var isJuridico = (paginacao.processId && paginacao.processId.toLowerCase().indexOf("penalidades") > -1);
        if (isJuridico) {
            $(".col-prazo-juridico").show();
        } else {
            $(".col-prazo-juridico").hide();
        }

        $.each(itensDaPagina, function (i, sol) {
            var numero = sol.processInstanceId;
            var solicitante = extrairSolicitante(sol);
            var ocorrencia = sol.ocorrenciaExtracao || extrairOcorrencia(sol);
            var atividade = extrairNomeAtividade(sol);
            var responsavel = extrairResponsavel(sol);

            var dataInicial = formatarDataExibicao(sol.startDate, true);
            var dataFinal = sol.endDate ? formatarDataExibicao(sol.endDate, true) : "-";
            var status = normalizarStatus(sol.status || sol.state);

            var infoPapel = identificarTarefaPapel(sol);
            var infoCriticidade = identificarCriticidade(sol);

            var tr = $('<tr>')
                .addClass("linha-solicitacao")
                .attr("data-instance-id", numero)
                .attr("data-process-id", paginacao.processId)
                .attr("data-numero", numero)
                .data("sol-data", sol);

            if (infoCriticidade) {
                tr.addClass(infoCriticidade.classeLinha);
            }

            // URL padrão do Fluig que abre a solicitação com sucesso para qualquer usuário
            var urlSolicitacao = "/portal/p/1/pageworkflowview?app_ecm_workflowview_detailsProcessInstanceID=" + encodeURIComponent(numero);

            // Coluna Solicitação (apenas o número em destaque)
            var tdSolicitacao = '<td><strong>' + escapeHtml(String(numero)) + '</strong></td>';

            var htmlResponsavel = '<div>' + escapeHtml(responsavel) + '</div>';
            if (infoCriticidade) {
                htmlResponsavel += ' <span class="tag-criticidade ' + infoCriticidade.classeTag + '">' + infoCriticidade.rotulo + '</span>';
            }
            if (infoPapel) {
                htmlResponsavel += ' <span class="tag-responsavel-papel"><i class="fluigicon fluigicon-group"></i> Papel / Pool</span>';
            }

            var isOpen = (status.chaveFiltro === "ABERTO");
            var responsavelCode = normalizeStr(extrairCodigoResponsavel(sol));
            var responsavelNome = normalizeStr(extrairResponsavel(sol));
            var userLogado = normalizeStr(obterUsuarioLogado());
            var nomeUsuarioLogado = normalizeStr(obterNomeUsuarioLogado());
            
            var ehDonoDaTarefaAberta = false;
            if (!infoPapel && isOpen) {
                if (responsavelCode && userLogado && responsavelCode === userLogado) {
                    ehDonoDaTarefaAberta = true;
                } else if (responsavelNome && nomeUsuarioLogado && responsavelNome === nomeUsuarioLogado) {
                    ehDonoDaTarefaAberta = true;
                } else if (responsavelNome && userLogado && responsavelNome === userLogado) {
                    ehDonoDaTarefaAberta = true;
                }
            }
            if (isOpen) {

            }
            var urlMovimentar = "/portal/p/1/pageworkflowview?app_ecm_workflowview_processInstanceId=" + encodeURIComponent(numero);
            var movSeq = obterMovementSequence(sol);
            if (movSeq) {
                urlMovimentar += "&app_ecm_workflowview_currentMovto=" + encodeURIComponent(movSeq);
            }
            urlMovimentar += "&app_ecm_workflowview_taskUserId=" + encodeURIComponent(obterUsuarioLogado()) + "&app_ecm_workflowview_managerMode=false";
            
            var htmlAcoes = '<td class="col-celula-acoes" style="text-align: center; white-space: nowrap;">';
            if (infoPapel) {
                htmlAcoes += '<button type="button" class="btn btn-success btn-xs btn-assumir-tarefa" data-instance-id="' + numero + '" data-movement="' + infoPapel.movementSequence + '" style="margin-right: 4px;" title="Assumir esta atividade para você"><i class="fluigicon fluigicon-user-check"></i> Assumir</button>';
                htmlAcoes += '<a href="' + urlSolicitacao + '" target="_blank" class="btn btn-default btn-xs btn-abrir-solicitacao" title="Abrir solicitação ' + numero + ' em nova aba"><i class="fluigicon fluigicon-external-link"></i> Abrir</a>';
            } else if (ehDonoDaTarefaAberta) {
                htmlAcoes += '<a href="' + urlMovimentar + '" target="_blank" class="btn btn-primary btn-xs btn-movimentar-tarefa btn-movimentar" style="background-color: #4579E3; border-color: #4579E3; margin-right: 4px;" title="Movimentar solicitação ' + numero + ' em nova aba">Movimentar</a>';
                htmlAcoes += '<a href="' + urlSolicitacao + '" target="_blank" class="btn btn-default btn-xs btn-abrir-solicitacao" title="Abrir solicitação ' + numero + ' em nova aba">Abrir</a>';
            } else {
                htmlAcoes += '<a href="' + urlSolicitacao + '" target="_blank" class="btn btn-default btn-xs btn-abrir-solicitacao" title="Abrir solicitação ' + numero + ' em nova aba"><i class="fluigicon fluigicon-external-link"></i> Abrir</a>';
            }
            htmlAcoes += '</td>';

            var tds = [];
            tds[0] = tdSolicitacao;
            tds[1] = '<td>' + escapeHtml(solicitante) + '</td>';
            tds[2] = '<td class="col-celula-ocorrencia">' + escapeHtml(ocorrencia) + '</td>';
            tds[3] = '<td class="col-celula-atividade">' + escapeHtml(atividade) + '</td>';
            tds[4] = '<td class="col-celula-responsavel">' + htmlResponsavel + '</td>';
            tds[5] = '<td>' + dataInicial + '</td>';
            
            if (isJuridico) {
                tds[6] = '<td id="prazo-juridico-' + numero + '" class="col-prazo-juridico" style="font-size:12px; color:#555;"><i class="fluigicon fluigicon-refresh fluigicon-spin"></i></td>';
            } else {
                tds[6] = '<td class="col-prazo-juridico" style="display:none;">-</td>';
            }

            tds[7] = '<td><span class="status-tag ' + status.classe + '">' + status.rotulo + '</span></td>';
            tds[8] = '<td style="text-align: center;"><a href="' + urlSolicitacao + '" target="_blank" class="btn btn-default btn-xs btn-ver-anexos" data-instance-id="' + numero + '" data-process-id="' + escapeHtml(paginacao.processId) + '" title="Ver anexos da solicitação ' + numero + ' na plataforma"><i class="fluigicon fluigicon-paperclip"></i> Anexos</a></td>';
            tds[9] = htmlAcoes;

            if (!window.colOrder) {
                window.colOrder = [0,1,2,3,4,5,6,7,8,9];
            }
            
            for (var c = 0; c < window.colOrder.length; c++) {
                tr.append(tds[window.colOrder[c]]);
            }

            $tbody.append(tr);
            
            if (isJuridico) {
                // Tenta achar o prazo diretamente no objeto (se a API v2 já trouxe)
                var prazoEncontrado = false;
                var tarefasParaBusca = sol.activeTasks || sol.tasks || [];
                if (tarefasParaBusca.length > 0) {
                    for (var t = 0; t < tarefasParaBusca.length; t++) {
                        var task = tarefasParaBusca[t];
                        // Procura pela tarefa 10 ou nome Analisar Juridico
                        if (String(task.stateId) === "10" || String(task.choosedSequence) === "10" || (task.stateName && task.stateName.toUpperCase().indexOf("JURIDICO") > -1)) {
                            var dt = task.deadline || task.deadlineDate;
                            if (dt) {
                                var dataFormatada = formatarDataExibicao(dt, false);
                                var hora = task.deadlineHour ? task.deadlineHour : "";
                                // as vezes a API v2 já traz hora na string de deadline (ex: 2026-09-24T10:01:11)
                                if (!hora && typeof dt === "string" && dt.indexOf("T") > -1) {
                                    hora = dt.split("T")[1].substring(0, 5); // pega HH:mm
                                } else if (!hora && typeof dt === "string" && dt.indexOf(" ") > -1) {
                                    hora = dt.split(" ")[1].substring(0, 5);
                                }
                                var textoPrazo = $.trim(dataFormatada + " " + hora);
                                $("#prazo-juridico-" + numero).text(textoPrazo);
                                prazoEncontrado = true;
                                break;
                            }
                        }
                    }
                }

                if (!prazoEncontrado) {
                    // Dispara busca do prazo no dataset
                    buscarPrazoJuridico(numero);
                }
            }
        });

        // Atualiza rótulo e estado dos botões de navegação
        $("#lblInfoPagina").text("Página " + paginacao.paginaAtual + " de " + totalPaginas + " (" + total + " registros)");
        $("#btnPaginaAnterior").prop("disabled", paginacao.paginaAtual <= 1);
        $("#btnPaginaProxima").prop("disabled", paginacao.paginaAtual >= totalPaginas);

        // Enriquecimento de alto desempenho: busca assíncrona com cache apenas para os itens da página atual
        enriquecerLinhasVisiveis(itensDaPagina, paginacao.processId);
    }

    var cachePrazos = {};

    function buscarPrazoJuridico(instanceId) {
        var $td = $("#prazo-juridico-" + instanceId);
        if (cachePrazos[instanceId]) {
            $td.text(cachePrazos[instanceId]);
            return;
        }

        // A API da Central de Tarefas sempre retorna o prazo correto (o mesmo que aparece na tela da Central)
        var urlApiTarefas = "/process-management/api/v2/tasks?processInstanceId=" + instanceId;
        
        $.ajax({
            url: urlApiTarefas,
            type: "GET",
            dataType: "json",
            headers: { "Accept": "application/json" }
        }).done(function (resp) {
            var tasks = (resp && (resp.items || resp.content || resp)) || [];
            if (!Array.isArray(tasks)) tasks = [];
            

            
            var achouPrazo = false;
            // Varre de trás pra frente, para pegar a tarefa MAIS RECENTE primeiro!
            for (var t = tasks.length - 1; t >= 0; t--) {
                var task = tasks[t];
                // Busca a tarefa Analisar Juridico (10) ou apenas a última tarefa que esteja EM ABERTO
                var isTask10 = String(task.stateId) === "10" || String(task.choosedSequence) === "10" || 
                               (task.state && (String(task.state.stateSequence) === "10" || String(task.state.sequence) === "10")) ||
                               (task.stateName && task.stateName.toUpperCase().indexOf("JURIDICO") > -1);
                var isOpen = task.status === "OPEN" || task.status === 0 || task.active === true;
                
                if (isTask10 || isOpen) {
                    var dt = task.deadline || task.deadlineDate || task.dueDate || task.expectedCompletionDate;
                    if (dt) {
                        var dataFormatada = formatarDataExibicao(dt, false);
                        var hora = task.deadlineHour ? task.deadlineHour : "";
                        if (!hora && typeof dt === "string" && dt.indexOf("T") > -1) {
                            hora = dt.split("T")[1].substring(0, 5);
                        } else if (!hora && typeof dt === "string" && dt.indexOf(" ") > -1) {
                            hora = dt.split(" ")[1].substring(0, 5);
                        }
                        var textoPrazo = $.trim(dataFormatada + " " + hora);
                        cachePrazos[instanceId] = textoPrazo;
                        $td.text(textoPrazo);
                        achouPrazo = true;
                        break; 
                    }
                }
            }

            if (!achouPrazo) {
                cachePrazos[instanceId] = "Sem prazo definido";
                $td.text("Sem prazo definido");
            }

        }).fail(function () {
            buscarPrazoJuridicoViaDataset(instanceId, $td);
        });
    }

    function buscarPrazoJuridicoViaDataset(instanceId, $td) {
        if (typeof DatasetFactory === "undefined" || !DatasetFactory.getDataset) {
            $td.text("Sem prazo");
            return;
        }

        setTimeout(function() {
            try {
                var c1 = DatasetFactory.createConstraint("processTaskPK.processInstanceId", String(instanceId), String(instanceId), 1);
                var ds = DatasetFactory.getDataset("processTask", ["processTaskPK.movementSequence", "choosedSequence", "deadlineDate", "deadlineHour", "deadline"], [c1], ["processTaskPK.movementSequence"]);
                
                var prazoText = "Sem prazo";
                if (ds && ds.values && ds.values.length > 0) {
                    var lastTask = null;
                    for (var i = ds.values.length - 1; i >= 0; i--) {
                        var row = ds.values[i];
                        if (String(row.choosedSequence) === "10") {
                            lastTask = row;
                            break;
                        }
                    }

                    if (lastTask) {
                        var dt = lastTask.deadlineDate || lastTask.deadline;
                        if (dt) {
                            var dataFormatada = formatarDataExibicao(dt, false);
                            var hora = lastTask.deadlineHour ? lastTask.deadlineHour : "";
                            prazoText = $.trim(dataFormatada + " " + hora);
                        }
                    }
                }
                cachePrazos[instanceId] = prazoText;
                $td.text(prazoText);
            } catch (e) {
                console.error("[TESTEGEMINI] Erro ao buscar prazo via DatasetFactory", e);
                $td.text("Erro");
            }
        }, 10);
    }

    // Cache em memória para não repetir requisições de solicitações já carregadas
    var cacheTarefasSolicitacao = {};

    // Alterna a exibição dos campos do formulário abaixo da linha da solicitação
    function alternarCamposFormulario($tr, $btn, instanceId, processId) {
        var $linhaDetalhes = $tr.next("tr.linha-detalhes-campos");

        if ($linhaDetalhes.length > 0) {
            // Se já existe no DOM, alterna visibilidade
            if ($linhaDetalhes.is(":visible")) {
                $linhaDetalhes.slideUp(200, function () {
                    $linhaDetalhes.remove();
                });
                $btn.removeClass("aberto");
                $btn.attr("title", "Ver campos do formulário");
            } else {
                $linhaDetalhes.show();
                $btn.addClass("aberto");
                $btn.attr("title", "Ocultar campos do formulário");
            }
            return;
        }

        // Fecha e remove qualquer outra linha expansora aberta anteriormente para não misturar solicitações
        $tr.siblings("tr.linha-detalhes-campos").slideUp(150, function () {
            $(this).remove();
        });
        $tr.siblings("tr").find(".btn-toggle-detalhes").removeClass("aberto").attr("title", "Ver campos do formulário");

        // Criar linha expansora no DOM com estado de carregando
        $btn.addClass("aberto");
        $btn.attr("title", "Ocultar campos do formulário");

        var totalColunas = $tr.children("td").length || 10;

        // URL nativa e universal do Fluig que abre os detalhes da solicitação para qualquer usuário e qualquer estado
        var urlFormularioFluig = "/portal/p/1/pageworkflowview?app_ecm_workflowview_detailsProcessInstanceID=" + encodeURIComponent(instanceId);

        var cabecalhoHtml = '' +
            '<div class="cabecalho-abas-form">' +
            '  <ul class="nav-tabs-formulario">' +
            '    <li><button type="button" class="btn-aba-form ativo" data-tab="cards"><i class="fluigicon fluigicon-form"></i> Campos do Formulário</button></li>' +
            '    <li><button type="button" class="btn-aba-form" data-tab="completo"><i class="fluigicon fluigicon-fileedit"></i> Formulário Completo (Processo)</button></li>' +
            '  </ul>' +
            '  <div class="acoes-cabecalho-form">' +
            '    <a href="' + urlFormularioFluig + '" target="_blank" rel="noopener noreferrer" class="btn btn-default btn-xs" title="Abrir formulário em nova aba">' +
            '      <i class="fluigicon fluigicon-external-link"></i> Abrir Solicitação #' + escapeHtml(instanceId) + ' em nova aba' +
            '    </a>' +
            '  </div>' +
            '</div>' +
            '<div class="painel-conteudo-aba aba-cards-container">' +
            '  <div class="conteudo-campos-formulario text-center" style="padding: 15px 0;">' +
            '    <i class="fa fa-spinner fa-spin text-primary" style="font-size: 18px; margin-right: 6px;"></i> Carregando campos do formulário da solicitação #' + escapeHtml(instanceId) + '...' +
            '  </div>' +
            '</div>' +
            '<div class="painel-conteudo-aba aba-completo-container" style="display: none;">' +
            '  <div class="wrapper-iframe-formulario">' +
            '    <iframe class="iframe-formulario-fluig" src="" data-src="' + urlFormularioFluig + '" frameborder="0"></iframe>' +
            '  </div>' +
            '</div>';

        var $novaLinha = $('<tr class="linha-detalhes-campos" data-instance-id="' + instanceId + '">' +
            '<td colspan="' + totalColunas + '">' +
            '  <div class="container-campos-formulario">' +
            cabecalhoHtml +
            '  </div>' +
            '</td>' +
            '</tr>');

        // Tratamento de clique nas abas
        $novaLinha.on("click", ".btn-aba-form", function (e) {
            e.preventDefault();
            var $abaBtn = $(this);
            var tab = $abaBtn.attr("data-tab");
            $novaLinha.find(".btn-aba-form").removeClass("ativo");
            $abaBtn.addClass("ativo");

            if (tab === "cards") {
                $novaLinha.find(".aba-cards-container").show();
                $novaLinha.find(".aba-completo-container").hide();
            } else {
                $novaLinha.find(".aba-cards-container").hide();
                var $compCont = $novaLinha.find(".aba-completo-container");
                $compCont.show();
                var $iframe = $compCont.find("iframe");
                if (!$iframe.attr("src") || $iframe.attr("src") !== $iframe.attr("data-src")) {
                    $iframe.attr("src", $iframe.attr("data-src"));
                }
            }
        });

        // Quando o iframe carregar, remove cabeçalho, barra lateral, menus e deixa somente o formulário visível
        $novaLinha.find(".iframe-formulario-fluig").on("load", function () {
            var iframeEl = this;
            function limparElementosFluig() {
                try {
                    var iframeDoc = iframeEl.contentDocument || (iframeEl.contentWindow && iframeEl.contentWindow.document);
                    if (!iframeDoc) return;

                    // Oculta elementos conhecidos da estrutura do portal via seletor direto
                    var seletoresParaRemover = [
                        "#header", "header", ".navbar", ".header", "#main-navbar", ".fluig-navbar",
                        "#navigation-bar", ".navigation-bar", "#page-header", ".page-header",
                        ".wcm-all-content > header", "#sidebar", ".sidebar", "#menu", ".menu",
                        "#breadcrumb", ".breadcrumb", ".page-breadcrumb", ".wcm_breadcrumb",
                        "#workflow-header", ".workflow-view-header",
                        "#workflowActions", ".workflow-actions-wrapper",
                        ".btn-workflow-back", ".page-title",
                        ".task-process-info", ".workflow-info-bar", "footer", "#footer"
                    ];

                    for (var s = 0; s < seletoresParaRemover.length; s++) {
                        var elements = iframeDoc.querySelectorAll(seletoresParaRemover[s]);
                        for (var el = 0; el < elements.length; el++) {
                            elements[el].style.setProperty("display", "none", "important");
                        }
                    }

                    // Se não tiver inserido nossa tag style com !important, insere
                    if (!iframeDoc.getElementById("style-custom-clean-fluig")) {
                        var styleClean = iframeDoc.createElement("style");
                        styleClean.id = "style-custom-clean-fluig";
                        styleClean.type = "text/css";
                        styleClean.innerHTML = "" +
                            "#header, header, .navbar, .header, #main-navbar, .fluig-navbar, " +
                            "#navigation-bar, .navigation-bar, #page-header, .page-header, " +
                            ".wcm-all-content > header, #sidebar, .sidebar, #menu, .menu, " +
                            "#breadcrumb, .breadcrumb, .page-breadcrumb, .wcm_breadcrumb, " +
                            "#workflow-header, .workflow-view-header, " +
                            "#workflowActions, .workflow-actions-wrapper, " +
                            ".btn-workflow-back, .page-title, " +
                            ".task-process-info, .workflow-info-bar, footer, #footer { " +
                            "  display: none !important; " +
                            "} " +
                            "html, body, #main, #content, .wcm-all-content, .page-content, .panel, .panel-body { " +
                            "  padding: 0 !important; margin: 0 !important; border: none !important; " +
                            "  background: #ffffff !important; " +
                            "}";
                        (iframeDoc.head || iframeDoc.body).appendChild(styleClean);
                    }
                } catch (eCross) {
                    console.warn("[TESTEGEMINI] Ajuste visual do iframe:", eCross);
                }
            }

            limparElementosFluig();
            // Executa também após pequenos intervalos para pegar componentes do Fluig montados assincronamente
            setTimeout(limparElementosFluig, 300);
            setTimeout(limparElementosFluig, 1000);
            setTimeout(limparElementosFluig, 2500);
        });

        $tr.after($novaLinha);

        // Verifica se já temos em cache os campos prontos
        if (cacheTarefasSolicitacao[instanceId] && cacheTarefasSolicitacao[instanceId].camposFormulario) {
            renderizarPainelCamposFormulario($novaLinha, instanceId, cacheTarefasSolicitacao[instanceId].camposFormulario);
            return;
        }

        // Função para concluir e renderizar os campos
        function finalizarSucesso(campos) {
            if (!cacheTarefasSolicitacao[instanceId]) {
                cacheTarefasSolicitacao[instanceId] = {};
            }
            cacheTarefasSolicitacao[instanceId].camposFormulario = campos;
            renderizarPainelCamposFormulario($novaLinha, instanceId, campos);
        }

        // 1ª Tentativa: GET /process-management/api/v2/requests/{id}?expand=formFields,formRecord
        $.ajax({
            url: CONFIG.urlFormFields(instanceId),
            type: "GET",
            dataType: "json",
            headers: { "Accept": "application/json" }
        }).done(function (respReq) {


            var formRecordId = (respReq && (respReq.formRecordId || (respReq.formRecord && respReq.formRecord.id))) || null;
            var formIdReal = (respReq && (respReq.formId || (respReq.formRecord && respReq.formRecord.documentId))) || null;

            // Procura estritamente por propriedades internas de formulário primeiro
            var fonteCampos = (respReq && (respReq.formFields || respReq.formData || (respReq.formRecord && (respReq.formRecord.fields || respReq.formRecord.values)))) || null;
            var campos = extrairCamposDeQualquerFonte(fonteCampos);

            if (campos && campos.length > 0) {
                finalizarSucesso(campos);
                return;
            }

            // Se formRecord for objeto direto mas não trouxe campos internos
            tentarEndpointFormRecord(formRecordId, formIdReal);
        }).fail(function (errReq) {
            console.warn("[TESTEGEMINI] Falha ao consultar /requests?expand=formFields:", errReq);
            tentarEndpointFormRecord(null, null);
        });

        // 2ª Tentativa: GET /process-management/api/v2/requests/{id}/form-record
        function tentarEndpointFormRecord(formRecordId, formIdReal) {
            $.ajax({
                url: CONFIG.urlFormRecordDireto(instanceId),
                type: "GET",
                dataType: "json",
                headers: { "Accept": "application/json" }
            }).done(function (respRecord) {

                var fonteCampos = (respRecord && (respRecord.fields || respRecord.values || respRecord.formFields || respRecord.formData)) || null;
                var campos = extrairCamposDeQualquerFonte(fonteCampos);
                if (campos && campos.length > 0) {
                    finalizarSucesso(campos);
                    return;
                }
                tentarTasksEHistorico(formRecordId, formIdReal);
            }).fail(function () {
                tentarTasksEHistorico(formRecordId, formIdReal);
            });
        }

        // 3ª Tentativa: GET /process-management/api/v2/processes/{processId}/requests/tasks
        function tentarTasksEHistorico(formRecordId, formIdReal) {
            if (cacheTarefasSolicitacao[instanceId] && cacheTarefasSolicitacao[instanceId].tasks) {
                var campos = extrairCamposDeQualquerFonte(cacheTarefasSolicitacao[instanceId].tasks);
                if (campos && campos.length > 0) {
                    finalizarSucesso(campos);
                    return;
                }
                tentarDatasetWorkflowProcess(formRecordId, formIdReal);
                return;
            }

            $.ajax({
                url: CONFIG.urlDetalheSolicitacao(processId, instanceId),
                type: "GET",
                dataType: "json",
                headers: { "Accept": "application/json" }
            }).done(function (respTasks) {
                var tasks = (respTasks && (respTasks.items || respTasks.content || respTasks)) || [];
                if (!Array.isArray(tasks)) tasks = [];
                if (!cacheTarefasSolicitacao[instanceId]) cacheTarefasSolicitacao[instanceId] = {};
                cacheTarefasSolicitacao[instanceId].tasks = tasks;

                var campos = extrairCamposDeQualquerFonte(tasks);
                if (campos && campos.length > 0) {
                    finalizarSucesso(campos);
                    return;
                }
                tentarDatasetWorkflowProcess(formRecordId, formIdReal);
            }).fail(function () {
                tentarDatasetWorkflowProcess(formRecordId, formIdReal);
            });
        }

        // 4ª Tentativa: Dataset workflowProcess -> cardDocumentId -> Dataset do Formulário
        function tentarDatasetWorkflowProcess(formRecordId, formIdReal) {
            consultarFormularioViaDataset(instanceId, processId, formRecordId, formIdReal, function (camposDs) {
                if (camposDs && camposDs.length > 0) {
                    finalizarSucesso(camposDs);
                } else {

                    // Alterna automaticamente para a aba do formulário completo para o usuário ver o formulário preenchido
                    $novaLinha.find('.btn-aba-form[data-tab="completo"]').trigger("click");
                    $novaLinha.find(".conteudo-campos-formulario").html(
                        '<div class="alert alert-info text-left" style="margin-bottom: 0;">' +
                        '  <i class="fluigicon fluigicon-info-sign"></i> O formulário completo da solicitação foi carregado na aba <strong>Formulário Completo (Processo)</strong> ao lado.' +
                        '</div>'
                    );
                }
            });
        }
    }

    // Extrai e normaliza os pares chave/valor de qualquer payload do Fluig (Requests, FormRecord, Tasks ou Dataset)
    function extrairCamposDeQualquerFonte(fonte) {
        if (!fonte) return [];
        var camposDict = {};

        function processarObjetoOuArray(obj) {
            if (!obj) return;

            // Se for array de campos: [{ name: "campo1", value: "x" }] ou [{ fieldId: "campo1", value: "x" }]
            if (Array.isArray(obj)) {
                $.each(obj, function (k, f) {
                    if (!f) return;
                    if (typeof f === "object" && (f.name || f.fieldId || f.id || f.key)) {
                        var nome = f.name || f.fieldId || f.id || f.key;
                        var valor = f.value !== undefined ? f.value : (f.fieldValue !== undefined ? f.fieldValue : "");
                        if (valor !== null && valor !== undefined && String(valor).trim() !== "") {
                            camposDict[nome] = valor;
                        }
                    } else if (f.formFields || f.formData || f.fields || (f.state && f.state.formFields)) {
                        // Se for array de tasks/movimentações
                        processarObjetoOuArray(f.formFields || f.formData || f.fields || (f.state && f.state.formFields));
                    }
                });
                return;
            }

            // Se for um objeto com formFields, formData, fields ou values
            if (typeof obj === "object") {
                if (obj.formFields && typeof obj.formFields === "object") {
                    processarObjetoOuArray(obj.formFields);
                }
                if (obj.formData && typeof obj.formData === "object") {
                    processarObjetoOuArray(obj.formData);
                }
                if (obj.fields && typeof obj.fields === "object") {
                    processarObjetoOuArray(obj.fields);
                }
                if (obj.values && typeof obj.values === "object") {
                    processarObjetoOuArray(obj.values);
                }
                if (obj.formRecord && typeof obj.formRecord === "object") {
                    processarObjetoOuArray(obj.formRecord);
                }

                // Chave/valor direto do objeto
                $.each(obj, function (key, val) {
                    // Ignora objetos aninhados complexos e propriedades de sistema
                    if (val === null || val === undefined || typeof val === "function") return;
                    if (typeof val === "object") return;
                    var strVal = String(val).trim();
                    if (strVal === "") return;

                    camposDict[key] = val;
                });
            }
        }

        processarObjetoOuArray(fonte);

        // Converte objeto para array ordenado, filtrando campos técnicos internos do Fluig
        var resultado = [];
        var camposIgnorados = [
            "WKNumState", "WKNumProces", "WKCompany", "WKUser", "WKDef", "WKVersDef",
            "processInstanceId", "processId", "version", "companyId", "colleagueId",
            "sourceProcess", "movementSequence", "targetState", "targetAssignee",
            "status", "state", "requester", "assignee", "startDate", "endDate",
            "formRecordId", "id", "tenantId", "active", "parentDocumentId",
            "documentType", "documentDescription", "comments", "taskUserId",
            "colleagueName", "processDescription", "currentStep", "activityName",
            "formId", "periodId", "processVersion", "slaStatus", "deadline",
            "metadata#id", "metadata#version", "metadata#status", "metadata#active",
            "cardDocumentId", "cardVersion", "documentPK.documentId", "documentPK.companyId",
            "documentPK.version", "table_name", "sql_limit", "sql_offset"
        ];

        $.each(camposDict, function (chave, valor) {
            // Ignora campos internos técnicos e metadados
            if (chave.indexOf("___") === 0 || chave.indexOf("metadata#") === 0 || chave.indexOf("table_") === 0) {
                return;
            }
            if ($.inArray(chave, camposIgnorados) !== -1) {
                return;
            }
            // Ignora strings longas de JSON ou HTML cru
            var strVal = String(valor);
            if (strVal.indexOf("<html") !== -1 || strVal.indexOf("<!DOCTYPE") !== -1) {
                return;
            }

            resultado.push({
                nome: chave,
                rotulo: formatarRotuloCampo(chave),
                valor: valor
            });
        });

        // Ordenar por rótulo amigável
        resultado.sort(function (a, b) {
            return a.rotulo.localeCompare(b.rotulo);
        });

        return resultado;
    }

    // Consulta os campos via Dataset workflowProcess -> cardDocumentId -> Dataset de formulário
    function consultarFormularioViaDataset(instanceId, processId, formRecordId, formIdReal, callback) {
        var docIdAlvo = formRecordId;
        console.log("[TESTEGEMINI] consultarFormularioViaDataset instId=" + instanceId + " docIdAlvo=" + docIdAlvo);

        // Se já temos o formRecordId, vai direto
        if (docIdAlvo) {
            buscarDadosPorCardDocumentId(docIdAlvo, callback, formIdReal);
            return;
        }

        // OTIMIZAÇÃO: O Dataset workflowProcess estava demorando até 2.5s por linha.
        // Vamos direto para a API /v2/requests que é muito mais rápida (70ms).
        // Se falhar, tenta via V2 requests API
        $.ajax({
            url: "/process-management/api/v2/requests/" + instanceId,
            type: "GET",
            dataType: "json"
        }).done(function (resReq) {
            var docId = (resReq && (resReq.formRecordId || resReq.cardDocumentId || resReq.documentId)) || null;
            console.log("[TESTEGEMINI] Found docId from /v2/requests API: " + docId);
            if (docId) {
                buscarDadosPorCardDocumentId(docId, callback, formIdReal);
            } else {
                callback([]);
            }
        }).fail(function () {
            console.warn("[TESTEGEMINI] Falha ao buscar docId via /v2/requests API");
            callback([]);
        });

        function buscarDadosPorCardDocumentId(cardIdEncontrado, cbFinal, cardIndexFormResolvido) {
            console.log("[TESTEGEMINI] buscarDadosPorCardDocumentId cardIdEncontrado=" + cardIdEncontrado);
            var cardIndexForm = cardIndexFormResolvido || (processId === "Jurídico - Penalidades" || String(processId).indexOf("Penalidades") !== -1 ? "43271" : null);
            console.log("[TESTEGEMINI] cardIndexForm resolvido: " + cardIndexForm);
            
            // OTIMIZAÇÃO: Bypassar as APIs que estão retornando erro 500 (que causam lentidão) e ir direto no Dataset JDBC!
            tentarDatasetFactory(cardIdEncontrado, cbFinal, cardIndexForm);
        }

        function tentarGetCardValue(cardId, cbFinal, cardIndexForm) {
            // (Função mantida como fallback secundário, caso o DatasetFactory falhe)
            console.log("[TESTEGEMINI] Chamando tentarGetCardValue para cardId: " + cardId);
            $.ajax({
                url: "/api/public/ecm/document/getCardValue/" + encodeURIComponent(cardId),
                type: "GET",
                dataType: "json"
            }).done(function (resCard) {
                var campos = extrairCamposDeQualquerFonte(resCard && (resCard.content || resCard));
                if (campos && campos.length > 0) {
                    cbFinal(campos);
                    return;
                }
                cbFinal([]);
            }).fail(function (err) {
                console.warn("[TESTEGEMINI] tentarGetCardValue falhou", err);
                cbFinal([]);
            });
        }

        function tentarDatasetFactory(cardId, cbFinal, cardIndexForm) {
            console.log("[TESTEGEMINI] Chamando tentarDatasetFactory para cardId: " + cardId);
            if (typeof DatasetFactory !== "undefined" && DatasetFactory.getDataset) {
                try {
                    console.log("[TESTEGEMINI] Chamando DS_EXTRAIR_OCORRENCIA_V2 via JDBC backend...");
                    var c1 = DatasetFactory.createConstraint("cardId", String(cardId), String(cardId), ConstraintType.MUST);
                    var dsEx = DatasetFactory.getDataset("DS_EXTRAIR_OCORRENCIA_V2", null, [c1], null);
                    
                    if (dsEx && dsEx.values && dsEx.values.length > 0) {
                        var row = dsEx.values[0];
                        console.log("[TESTEGEMINI] Retorno do DS_EXTRAIR_OCORRENCIA_V2:", row);
                        if (row.error && row.error !== "") {
                            console.warn("[TESTEGEMINI] DS_EXTRAIR_OCORRENCIA_V2 erro: " + row.error + " | nmDataset: " + row.nmDataset + " | debug: " + row.debug);
                        } else {
                            var ocorrenciaExtraida = row.ocorrencia;
                            console.log("[TESTEGEMINI] DS_EXTRAIR_OCORRENCIA_V2 sucesso! Valor: " + ocorrenciaExtraida + " | via: " + row.debug);
                            if (ocorrenciaExtraida && ocorrenciaExtraida !== "") {
                                cbFinal([{ nome: "rdOcorrencia", rotulo: "Ocorrência", valor: ocorrenciaExtraida }]);
                                return;
                            }
                        }
                    } else {
                        console.warn("[TESTEGEMINI] DS_EXTRAIR_OCORRENCIA_V2 retornou vazio no frontend.");
                    }
                } catch (eDsEx) {
                    console.warn("[TESTEGEMINI] Erro ao chamar DS_EXTRAIR_OCORRENCIA_V2:", eDsEx);
                }
            }
            // Se falhou ou retornou vazio, tenta as APIs antigas como ultimo recurso
            tentarGetCardValue(cardId, cbFinal, cardIndexForm);
        }
    }

    // Dicionário com os rótulos fiéis aos do formulário HTML (Formulário_de_Jurídico_-_Penalidades.html)
    var MAPA_ROTULOS_FORMULARIO = {
        "rdGrupoSetor": "Setor da Ocorrência",
        "rdOcorrencia": "Tipo de Ocorrência",
        "zoomLoja": "Loja Ocorrência",
        "hidden_zoomLoja": "ID Loja",
        "nomeOcorrencia": "Registrado Por",
        "rdAudRemota": "Identificada por Aud. Remota?",
        "nomeQuemAudRemota": "Auditora Remota",
        "hidden_nomeQuemAudRemota": "ID Auditora Remota",
        "zoomColaborador": "Colaborador",
        "hidden_zoomColaborador": "ID Colaborador",
        "descOcorrencia": "Descrição da Ocorrência",
        "rdValorOcorrenc": "Gerou Prejuízo?",
        "dataOcorrencia": "Data/Hora da Ocorrência",
        "valorOcorrencia": "Valor da Ocorrência",
        "caminhoArquivo": "Caminho da Pasta",
        "rdProximaEtapa": "Definição do Fluxo Jurídico",
        "observacaoJUR": "Observação Jurídico",
        "comboAlinea": "Alínea CLT (Art. 482)",
        "rdFinalizar": "Demanda Finalizada?",
        "tipoPenalidade": "Penalidade a ser Aplicada",
        "rdAplicada": "Penalidade Aplicada?",
        "justificativa": "Justificativa",
        "usuarioChamado": "Usuário da Movimentação",
        "descricaoChamado": "Descrição da Movimentação",
        "codigoSolicitante": "Cód. Solicitante",
        "nomeSolicitante": "Nome Solicitante",
        "dataSolicitacao": "Data da Solicitação",
        "zoomUserRH": "Responsável RH",
        "hidden_zoomUserRH": "ID Responsável RH",
        "zoomGerente": "Gerente da Loja",
        "hidden_zoomGerente": "ID Gerente",
        "codigoAtendente": "Cód. Atendente",
        "nomeAtendente": "Nome Atendente",
        "dataHoraPenalidadeAplicada": "Data/Hora Penalidade Aplicada",
        "retornoGerente": "Retorno do Gerente",
        "dataRetornoGerente": "Data Retorno Gerente",
        "dataHoraRetornoRH": "Data Retorno RH",
        "retornoRH": "Retorno do RH"
    };

    // Formata o nome técnico da variável do formulário para o rótulo do formulário HTML
    function formatarRotuloCampo(nomeTecnico) {
        if (!nomeTecnico) return "";

        // Trata campos Pai x Filho (ex: zoomColaboradorTabela___1, tipoPenalidadeTabela___1)
        var nomeBase = nomeTecnico;
        var indicePf = "";
        var matchPf = nomeTecnico.match(/^(.+?)___(\d+)$/);
        if (matchPf) {
            nomeBase = matchPf[1];
            indicePf = " #" + matchPf[2];
        }

        // Sub-mapeamento para tabelas Pai x Filho
        if (nomeBase === "zoomColaboradorTabela" || nomeBase === "hidden_zoomColaboradorTabela") {
            return "Colaborador Penalizado" + indicePf;
        }
        if (nomeBase === "tipoPenalidadeTabela") {
            return "Penalidade a ser Aplicada" + indicePf;
        }
        if (nomeBase === "rdAplicadaTabela") {
            return "Penalidade Aplicada?" + indicePf;
        }
        if (nomeBase === "justificativa") {
            return "Justificativa" + indicePf;
        }
        if (nomeBase === "usuarioHistorico") {
            return "Histórico - Usuário" + indicePf;
        }
        if (nomeBase === "dataHistorico") {
            return "Histórico - Data" + indicePf;
        }
        if (nomeBase === "descricaoHistorico") {
            return "Histórico - Descrição" + indicePf;
        }

        if (MAPA_ROTULOS_FORMULARIO[nomeBase]) {
            return MAPA_ROTULOS_FORMULARIO[nomeBase] + indicePf;
        }

        var formatado = nomeBase
            .replace(/^txt_|^campo_|^input_|^sel_|^cb_|^dt_|^hidden_/i, "")
            .replace(/([a-z])([A-Z])/g, "$1 $2")
            .replace(/_/g, " ");
        return (formatado.charAt(0).toUpperCase() + formatado.slice(1)) + indicePf;
    }

    // Monta o grid responsivo de cards com os campos do formulário
    function renderizarPainelCamposFormulario($linhaDetalhes, instanceId, campos) {
        var $container = $linhaDetalhes.find(".conteudo-campos-formulario");
        $container.empty().removeClass("text-center").css("padding", "0");

        if (!campos || campos.length === 0) {
            $container.html(
                '<div class="alert alert-info text-left" style="margin-bottom: 0;">' +
                '  <i class="fluigicon fluigicon-info-sign"></i> Nenhum campo de formulário preenchido encontrado para esta solicitação.' +
                '</div>'
            );
            return;
        }

        var html = '<div class="grid-campos-formulario">';
        $.each(campos, function (i, c) {
            html += '<div class="campo-card-grid">';
            html += '  <div class="campo-card-conteudo" title="' + escapeHtml(c.nome) + ': ' + escapeHtml(String(c.valor)) + '">';
            html += '    <label>' + escapeHtml(c.rotulo) + '</label>';
            html += '    <span>' + escapeHtml(String(c.valor)) + '</span>';
            html += '  </div>';
            html += '</div>';
        });
        html += '</div>';

        $container.html(html);
    }

    // Busca assíncrona sob demanda apenas para as solicitações abertas da página atual (máximo desempenho)
    function enriquecerLinhasVisiveis(itens, processId) {
        if (!itens || itens.length === 0 || !processId) return;

        $.each(itens, function (i, sol) {
            var instId = sol.processInstanceId;
            var stChave = normalizarStatus(sol.status || sol.state).chaveFiltro;

            // Dispara form para extrair a ocorrencia independentemente do status se não tiver sido extraído ainda
            if (!sol.dadosFormularioVerificados) {
                sol.dadosFormularioVerificados = true;
                var possivelFormId = sol.formRecordId; // OTIMIZADO: Passa o formRecordId correto!
                
                consultarFormularioViaDataset(instId, processId, possivelFormId, null, function(camposDs) {
                    if (camposDs && camposDs.length > 0) {
                        var rdOco = "-";
                        $.each(camposDs, function(idx, c) {
                            if (c.nome === "rdOcorrencia" || c.nome === "ocorrencia") {
                                rdOco = c.valor;
                                return false;
                            }
                        });
                        if (rdOco && rdOco !== "-") {
                            var limpa = String(rdOco).replace(/^(RH\s+)?(ALTA|MEDIA|MÉDIA|BAIXA)\s+/i, "");
                            sol.ocorrenciaExtracao = $.trim(limpa) || "-";
                            var $tr = $("#tblResultadosBody tr[data-instance-id='" + instId + "']");
                            $tr.find(".col-celula-ocorrencia").text(sol.ocorrenciaExtracao);
                        }
                    }
                });
            }

            // --- A PARTIR DAQUI: LÓGICA ORIGINAL DE TAREFAS/CORES INTOCADA ---
            // Se for finalizado ou cancelado, já temos o status resolvido
            if (stChave === "FINALIZADO") {
                return;
            }

            // Se o objeto da solicitação já veio com atividade e responsável preenchidos
            var atvAtual = extrairNomeAtividade(sol);
            var respAtual = extrairResponsavel(sol);
            if (atvAtual !== "-" && respAtual !== "Sem responsável") {
                return;
            }

            // Verifica se já temos em cache
            if (cacheTarefasSolicitacao[instId]) {
                aplicarDadosNaLinha(instId, cacheTarefasSolicitacao[instId]);
                return;
            }

            // Dispara chamada sob demanda apenas para esta solicitação visível
            $.ajax({
                url: CONFIG.urlDetalheSolicitacao(processId, instId),
                type: "GET",
                dataType: "json",
                headers: { "Accept": "application/json" }
            }).done(function (resp) {
                var tasks = (resp && (resp.items || resp.content || resp)) || [];
                if (!Array.isArray(tasks)) tasks = [];

                // Atualiza o objeto da solicitação em memória para filtros e ordenação
                sol.tasks = tasks;

                var atv = extrairNomeAtividade(sol);
                var respNome = extrairResponsavel(sol);

                cacheTarefasSolicitacao[instId] = {
                    atividade: atv,
                    responsavel: respNome,
                    tasks: tasks
                };

                aplicarDadosNaLinha(instId, cacheTarefasSolicitacao[instId]);
            }).fail(function (err) {
                console.warn("[TESTEGEMINI] Não foi possível obter tarefas da solicitação " + instId, err);
            });
            // --- FIM DA LÓGICA DE TAREFAS INTOCADA ---
        });
    }

    function aplicarDadosNaLinha(instId, dados) {
        var $tr = $("#tblResultadosBody tr[data-instance-id='" + instId + "']");
        if ($tr.length > 0 && dados) {
            if (dados.atividade && dados.atividade !== "-") {
                $tr.find(".col-celula-atividade").text(dados.atividade);
            }
            if (dados.responsavel && dados.responsavel !== "Sem responsável") {
                // Recupera objeto da solicitação salvo no tr ou monta objeto para inspeção
                var sol = $tr.data("sol-data") || { processInstanceId: instId, status: "OPEN" };
                sol.tasks = dados.tasks || [];
                sol.responsible = dados.responsavel;

                var infoPapel = identificarTarefaPapel(sol);
                var infoCriticidade = identificarCriticidade(sol);
                var $tdResp = $tr.find(".col-celula-responsavel");
                var $tdAcoes = $tr.find(".col-celula-acoes");

                // Remove classes anteriores de criticidade e aplica a nova se detectada
                $tr.removeClass("linha-criticidade-alta linha-criticidade-media linha-criticidade-baixa");
                if (infoCriticidade) {
                    $tr.addClass(infoCriticidade.classeLinha);
                }

                var htmlResp = '<div>' + escapeHtml(dados.responsavel) + '</div>';
                if (infoCriticidade) {
                    htmlResp += ' <span class="tag-criticidade ' + infoCriticidade.classeTag + '">' + infoCriticidade.rotulo + '</span>';
                }
                if (infoPapel) {
                    htmlResp += ' <span class="tag-responsavel-papel"><i class="fluigicon fluigicon-group"></i> Papel / Pool</span>';
                    // Se ainda não tiver o botão de assumir na célula de ações, insere antes de "Abrir"
                    if ($tdAcoes.find(".btn-assumir-tarefa").length === 0) {
                        var btnAssumir = $('<button type="button" class="btn btn-success btn-xs btn-assumir-tarefa" data-instance-id="' + instId + '" data-movement="' + infoPapel.movementSequence + '" style="margin-right: 4px;" title="Assumir esta atividade para você"><i class="fluigicon fluigicon-user-check"></i> Assumir</button>');
                        $tdAcoes.prepend(btnAssumir);
                    }
                } else {
                    $tdAcoes.find(".btn-assumir-tarefa").remove();
                    
                    var rCode = normalizeStr(extrairCodigoResponsavel(sol));
                    var rNome = normalizeStr(dados.responsavel);
                    var uLog = normalizeStr(obterUsuarioLogado());
                    var nLog = normalizeStr(obterNomeUsuarioLogado());
                    var ehDono = (rCode && uLog && rCode === uLog) || (rNome && nLog && rNome === nLog) || (rNome && uLog && rNome === uLog);
                    
                    var isOpenState = (sol.status === "OPEN" || sol.status === "ABERTO" || normalizarStatus(sol.status || sol.state).chaveFiltro === "ABERTO");
                    
                    if (ehDono && isOpenState) {
                        var btnAbrir = $tdAcoes.find(".btn-abrir-solicitacao");
                        if (btnAbrir.length > 0) {
                            var urlMovimentar = "/portal/p/1/pageworkflowview?app_ecm_workflowview_processInstanceId=" + encodeURIComponent(instId);
                            var movSeq = obterMovementSequence(sol);
                            if (movSeq) {
                                urlMovimentar += "&app_ecm_workflowview_currentMovto=" + encodeURIComponent(movSeq);
                            }
                            urlMovimentar += "&app_ecm_workflowview_taskUserId=" + encodeURIComponent(obterUsuarioLogado()) + "&app_ecm_workflowview_managerMode=false";
                            var btnMovimentarExistente = $tdAcoes.find(".btn-movimentar");
                            if (btnMovimentarExistente.length === 0) {
                                var btnMovimentar = $('<a href="' + urlMovimentar + '" target="_blank" class="btn btn-primary btn-xs btn-movimentar" style="background-color: #4579E3; border-color: #4579E3; color: white; margin-right: 4px;" title="Movimentar solicitação">Movimentar</a>');
                                btnAbrir.before(btnMovimentar);
                            } else {
                                btnMovimentarExistente.attr("href", urlMovimentar);
                            }
                        }
                    }
                }

                $tdResp.html(htmlResp);

                // Tenta atualizar a coluna de prazo se houver
                var $tdPrazo = $tr.find(".col-prazo-juridico");
                if ($tdPrazo.length > 0 && $tdPrazo.is(":visible") && dados.tasks && dados.tasks.length > 0) {
                    for (var t = dados.tasks.length - 1; t >= 0; t--) {
                        var task = dados.tasks[t];
                        var isTask10 = String(task.stateId) === "10" || String(task.choosedSequence) === "10" || 
                                       (task.state && (String(task.state.stateSequence) === "10" || String(task.state.sequence) === "10")) ||
                                       (task.stateName && task.stateName.toUpperCase().indexOf("JURIDICO") > -1);
                        var isOpen = task.status === "OPEN" || task.status === 0 || task.active === true;
                        
                        if (isTask10 || isOpen) {
                            var dt = task.deadline || task.deadlineDate || task.dueDate || task.expectedCompletionDate;
                            if (dt) {
                                var dataFormatada = formatarDataExibicao(dt, false);
                                var hora = task.deadlineHour ? task.deadlineHour : "";
                                if (!hora && typeof dt === "string" && dt.indexOf("T") > -1) {
                                    hora = dt.split("T")[1].substring(0, 5);
                                } else if (!hora && typeof dt === "string" && dt.indexOf(" ") > -1) {
                                    hora = dt.split(" ")[1].substring(0, 5);
                                }
                                var textoPrazo = $.trim(dataFormatada + " " + hora);
                                $tdPrazo.text(textoPrazo);
                                cachePrazos[instId] = textoPrazo;
                                break;
                            } else {
                                $tdPrazo.text("Sem prazo definido");
                                cachePrazos[instId] = "Sem prazo definido";
                                break;
                            }
                        }
                    }
                }
            }
        }
    }

    // ------------------------------------------------------------------
    // MODAL DE ANEXOS DA SOLICITAÇÃO
    // ------------------------------------------------------------------

    // Identifica o ícone mais adequado de acordo com a extensão do anexo
    function obterIconeAnexo(nomeArquivo) {
        var nome = String(nomeArquivo || "").toLowerCase();
        if (/\.(pdf)$/i.test(nome)) return "fluigicon-file-pdf";
        if (/\.(xlsx?|csv|xlsm)$/i.test(nome)) return "fluigicon-file-xls";
        if (/\.(docx?|rtf|odt)$/i.test(nome)) return "fluigicon-file-doc";
        if (/\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(nome)) return "fluigicon-picture";
        if (/\.(zip|rar|7z|tar|gz)$/i.test(nome)) return "fluigicon-file-zip";
        return "fluigicon-file";
    }

    // Formata o tamanho do arquivo em KB/MB se informado
    function formatarTamanhoAnexo(bytes) {
        if (!bytes || isNaN(bytes) || Number(bytes) <= 0) return "";
        var k = 1024;
        var tamanhos = ["B", "KB", "MB", "GB"];
        var i = Math.floor(Math.log(bytes) / Math.log(k));
        if (i < 0) i = 0;
        if (i >= tamanhos.length) i = tamanhos.length - 1;
        return " (" + parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + tamanhos[i] + ")";
    }

    // Filtra para exibir SOMENTE arquivos anexos reais da solicitação,
    // eliminando a ficha do formulário (documentType 4), formulários (documentType 3) e pastas
    function filtrarAnexosReais(listaAnexos, formRecordIdConhecido) {
        if (!Array.isArray(listaAnexos)) return [];

        return listaAnexos.filter(function (anexo) {
            if (!anexo) return false;

            var docId = anexo.documentId || anexo.id;

            // 1. Desconsidera se o ID for idêntico ao da ficha de formulário do processo
            if (formRecordIdConhecido && String(docId) === String(formRecordIdConhecido)) {
                return false;
            }

            // 2. documentType no ECM do Fluig:
            // 1 = Pasta
            // 2 = Documento (arquivo físico real: PDF, imagem, Word, Excel, etc.)
            // 3 = Formulário (HTML de definição)
            // 4 = Ficha de Formulário (registro de dados do processo)
            // 5 = Atalho
            var docType = anexo.documentType !== undefined ? anexo.documentType : (anexo.type !== undefined ? anexo.type : null);
            if (docType === 4 || docType === "4" || docType === 3 || docType === "3" || docType === 1 || docType === "1") {
                return false;
            }

            // 3. Flags booleanas que indicam ficha/formulário
            if (anexo.isCard === true || anexo.card === true || anexo.formRecord === true || anexo.isForm === true) {
                return false;
            }

            // 4. Se a flag de anexo físico vier explicitamente como falsa
            if (anexo.attachment === false || anexo.attachedArchive === false) {
                return false;
            }

            var nome = String(anexo.description || anexo.documentDescription || anexo.fileName || anexo.name || "").trim();
            var nomeFisico = String(anexo.physicalFileName || anexo.logicalFileName || "").trim();

            // 5. Padrão nativo do Fluig para títulos automáticos de ficha de formulário
            // Exemplo: "20 Agosto, 2026 - Ben Hur Olicheski da Silveira" ou "20/08/2026 - ..."
            var ehPadraoTituloFormulario = /^\d{1,2}\s+[A-Za-zçÇãÃõÕéÉêÊíÍóÓúÚ]+,?\s+\d{4}\s*-\s*/i.test(nome) ||
                                           /^\d{1,2}\/\d{1,2}\/\d{4}\s*-\s*/i.test(nome);

            // 6. Verifica extensão de arquivo comum
            var regexExtensao = /\.(pdf|png|jpe?g|gif|bmp|webp|svg|xlsx?|xlsm|csv|docx?|txt|rtf|zip|rar|7z|tar|gz|xml|json|msg|eml|html?|pptx?)$/i;
            var temExtensaoValida = regexExtensao.test(nome) || regexExtensao.test(nomeFisico);

            // Se tem padrão de título de formulário e não tem extensão de arquivo físico, é a ficha do processo
            if (ehPadraoTituloFormulario && !temExtensaoValida) {
                return false;
            }

            // Se o documentType for explicitamente 2 (documento/arquivo físico no Fluig)
            if (docType === 2 || docType === "2") {
                // Se o nome não tiver extensão mas for documento tipo 2 e não for título de formulário, aceita
                return true;
            }

            // Se tiver extensão de arquivo válida no nome ou nome físico, aceita como anexo real
            if (temExtensaoValida) {
                return true;
            }

            // Se não tiver extensão alguma e não for documentType 2, descarta para não exibir fichas sem extensão
            var temQualquerExtensao = /\.[a-zA-Z0-9]{2,5}$/i.test(nome) || /\.[a-zA-Z0-9]{2,5}$/i.test(nomeFisico);
            if (!temQualquerExtensao) {
                return false;
            }

            return true;
        });
    }

    function abrirModalAnexos(processInstanceId, processId, solData) {
        if (!processInstanceId) {
            console.error("[TESTEGEMINI] ID da solicitação não informado para abrir anexos.");
            return;
        }

        // Tenta descobrir o formRecordId da solicitação para reforçar a filtragem
        var formRecordId = (solData && (solData.cardDocumentId || solData.formRecordId || solData.cardId || solData.documentId)) || null;
        if (!formRecordId && cacheTarefasSolicitacao[processInstanceId]) {
            formRecordId = cacheTarefasSolicitacao[processInstanceId].cardDocumentId || cacheTarefasSolicitacao[processInstanceId].formRecordId || null;
        }

        exibirLoading(true);

        function buscarPorProcesso() {
            if (processId) {
                return $.ajax({
                    url: CONFIG.urlAnexosPorProcesso(processId, processInstanceId),
                    type: "GET",
                    dataType: "json",
                    headers: { "Accept": "application/json" }
                });
            }
            return $.Deferred().reject().promise();
        }

        $.ajax({
            url: CONFIG.urlAnexosSolicitacao(processInstanceId),
            type: "GET",
            dataType: "json",
            headers: { "Accept": "application/json" }
        }).then(
            function (response) {
                return response;
            },
            function () {
                // Se a primeira falhar, tenta rota pelo processo
                return buscarPorProcesso();
            }
        ).done(function (response) {
            exibirLoading(false);
            var todosAnexos = (response && (response.items || response.content || response)) || [];
            if (!Array.isArray(todosAnexos)) {
                todosAnexos = [];
            }


            // Filtra rigorosamente para exibir apenas arquivos anexos reais
            var anexosReais = filtrarAnexosReais(todosAnexos, formRecordId);


            renderizarModalAnexos(processInstanceId, anexosReais, false);
        }).fail(function (xhr) {
            exibirLoading(false);
            renderizarModalAnexos(processInstanceId, [], true, xhr);
        });
    }

    function renderizarModalAnexos(processInstanceId, anexos, erro, xhr) {
        var html = '<div class="fluig-style-guide" style="padding: 10px;">';
        var tenantId = (typeof WCMAPI !== "undefined" && (WCMAPI.tenantCode || WCMAPI.organizationId)) || "1";

        if (erro) {
            html += '<div class="alert alert-warning">';
            html += '  <i class="fluigicon fluigicon-warning-sign"></i> Não foi possível carregar os anexos diretamente pela API ou esta solicitação não possui anexos cadastrados.';
            html += '</div>';
        } else if (!anexos || anexos.length === 0) {
            html += '<div class="alert alert-info text-center" style="padding: 25px 15px; margin-bottom: 0; background-color: #f4f9fd; border: 1px solid #bce8f1; border-radius: 4px;">';
            html += '  <div style="font-size: 32px; color: #31708f; margin-bottom: 8px;">';
            html += '    <i class="fluigicon fluigicon-paperclip"></i>';
            html += '  </div>';
            html += '  <h4 style="margin: 0 0 6px 0; color: #31708f; font-weight: bold;">Nenhum anexo encontrado para a solicitação #' + escapeHtml(processInstanceId) + '</h4>';
            html += '  <p style="color: #666; margin-bottom: 0; font-size: 13px;">Esta solicitação não possui arquivos físicos anexados (PDFs, imagens, planilhas ou documentos).</p>';
            html += '</div>';
        } else {
            var urlsParaDownload = [];
            
            html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">';
            html += '  <p style="margin-bottom: 0; color: #555;">Foram encontrados <strong>' + anexos.length + '</strong> arquivo(s) anexo(s) nesta solicitação:</p>';
            
            // Loop para processar os anexos
            var tbodyHtml = '';
            $.each(anexos, function (idx, anexo) {
                var nome = anexo.description || anexo.documentDescription || anexo.fileName || anexo.physicalFileName || anexo.name || ("Anexo " + (idx + 1));
                var versao = anexo.version || anexo.documentVersion || "1000";
                var docId = anexo.documentId || anexo.id;
                var data = anexo.date || anexo.createDate || anexo.uploadDate || anexo.attachDate || "";
                var dataFormatada = data ? formatarDataExibicao(data, true) : "-";
                var icone = obterIconeAnexo(nome);
                var tamanho = formatarTamanhoAnexo(anexo.size || anexo.fileSize);

                var urlVisualizar = "/portal/p/" + tenantId + "/ecmnavigation?app_ecm_navigation_doc=" + encodeURIComponent(docId);
                var urlArquivo = anexo.downloadURL || anexo.fileURL || anexo.attachUrl || "";
                
                // Se a API não retornou uma URL direta de download (volume/stream), usamos a navegação padrão
                var urlDownloadReal = urlArquivo;
                if (!urlDownloadReal || urlDownloadReal.indexOf("ecmnavigation") !== -1 || urlDownloadReal.indexOf("downloadDocument") !== -1) {
                    // Fallback seguro: se não temos a URL real do volume, usamos a mesma do visualizar
                    urlDownloadReal = urlVisualizar;
                }
                
                if (docId) {
                    urlsParaDownload.push({ nome: nome, docId: docId, fallbackUrl: urlDownloadReal });
                }

                tbodyHtml += '      <tr>';
                tbodyHtml += '        <td style="vertical-align: middle;"><i class="fluigicon ' + icone + '"></i> <strong>' + escapeHtml(nome) + '</strong><span style="color: #888; font-size: 11px;">' + tamanho + '</span></td>';
                tbodyHtml += '        <td style="text-align: center; vertical-align: middle;">' + escapeHtml(String(versao)) + '</td>';
                tbodyHtml += '        <td style="vertical-align: middle;">' + escapeHtml(dataFormatada) + '</td>';
                tbodyHtml += '        <td style="text-align: center; white-space: nowrap; vertical-align: middle;">';
                if (docId) {
                    tbodyHtml += '          <button type="button" class="btn btn-default btn-sm btn-visualizar-anexo" data-doc-id="' + encodeURIComponent(docId) + '" data-doc-name="' + escapeHtml(nome) + '" style="min-width: 105px; padding: 6px 14px; font-size: 12px; font-weight: 600; margin-right: 8px; line-height: 1.5; display: inline-block; box-shadow: 0 1px 2px rgba(0,0,0,0.05);" title="Visualizar documento ' + escapeHtml(nome) + '"><i class="fluigicon fluigicon-eye-open"></i> Visualizar</button>';
                    tbodyHtml += '          <a href="' + urlDownloadReal + '" target="_blank" download="' + escapeHtml(nome) + '" class="btn btn-success btn-sm" style="min-width: 95px; padding: 6px 14px; font-size: 12px; font-weight: 600; line-height: 1.5; display: inline-block; box-shadow: 0 1px 2px rgba(0,0,0,0.05);" title="Baixar arquivo ' + escapeHtml(nome) + '"><i class="fluigicon fluigicon-download"></i> Baixar</a>';
                }
                tbodyHtml += '        </td>';
                tbodyHtml += '      </tr>';
            });
            
            if (urlsParaDownload.length > 1) {
                var jsonUrls = JSON.stringify(urlsParaDownload).replace(/"/g, "&quot;");
                html += '  <button type="button" class="btn btn-primary btn-sm btn-baixar-todos-anexos" data-urls="' + jsonUrls + '" data-zip-name="Anexos_Solicitacao_' + escapeHtml(processInstanceId) + '.zip" style="font-weight: bold;"><i class="fluigicon fluigicon-download"></i> Baixar Todos</button>';
            }
            html += '</div>';

            html += '<div class="table-responsive">';
            html += '  <table class="table table-hover table-striped" style="margin-bottom: 0;">';
            html += '    <thead>';
            html += '      <tr>';
            html += '        <th>Arquivo</th>';
            html += '        <th style="width: 80px; text-align: center;">Versão</th>';
            html += '        <th style="width: 140px;">Data Envio</th>';
            html += '        <th style="text-align: center; width: 260px; min-width: 260px;">Ações</th>';
            html += '      </tr>';
            html += '    </thead>';
            html += '    <tbody>';
            html += tbodyHtml;

            html += '    </tbody>';
            html += '  </table>';
            html += '</div>';
        }

        html += '</div>';

        if (typeof FLUIGC !== "undefined" && FLUIGC.modal) {
            FLUIGC.modal({
                title: 'Anexos da Solicitação #' + (processInstanceId || ""),
                content: html,
                id: 'modal-anexos-solicitacao',
                size: 'large',
                actions: [
                    {
                        'label': 'Fechar',
                        'autoClose': true
                    }
                ]
            });
        } else {
            alert('Anexos da solicitação #' + processInstanceId + ':\n' + (anexos && anexos.length ? anexos.map(function(a){ return a.description || a.fileName; }).join('\n') : 'Nenhum anexo encontrado.'));
        }
    }

    // ------------------------------------------------------------------
    // ASSUMIR ATIVIDADE (TAKE TASK / POOL DE PAPEL OU GRUPO)
    // ------------------------------------------------------------------
    function assumirTarefa(instanceId, movementSequence, $btn, $tr, solData) {
        var userLogado = obterUsuarioLogado();
        if (!userLogado) {
            exibirAlerta("Não foi possível identificar o usuário logado para assumir a atividade.", "warning");
            return;
        }

        var tenantId = "1";
        if (typeof WCMAPI !== "undefined" && WCMAPI.tenantId) {
            tenantId = String(WCMAPI.tenantId);
        } else {
            var pathMatch = window.location.pathname.match(/\/portal\/p\/(\d+)\//);
            if (pathMatch && pathMatch[1]) { tenantId = pathMatch[1]; }
        }

        function executarAssumir() {
            var $icon = $btn.find("i");
            $btn.prop("disabled", true).addClass("disabled");
            $icon.attr("class", "fa fa-spinner fa-spin");

            // 1. Busca os dados oficiais completos da solicitação e o assignee original (Pool)
            obterMovimentoAtivo(instanceId, movementSequence, solData, function (seqFinal, taskIdFinal, stateIdFinal, procIdFinal, procVerFinal, originalAssignee) {
                var seq = parseInt(seqFinal, 10) || parseInt(movementSequence, 10) || 1;
                var colleagueId = originalAssignee || userLogado; // Se for Pool, precisa ser o nome do Pool/Role!



                // Chamada GET direta nativa identificada na plataforma Fluig
                var urlTakeTask = "/ecm/api/rest/ecm/workflowView/takeTask";
                urlTakeTask += "?processInstanceId=" + encodeURIComponent(instanceId);
                urlTakeTask += "&taskUserId=" + encodeURIComponent(userLogado);
                urlTakeTask += "&currentMovto=" + seq;
                urlTakeTask += "&threadSequence=0";
                urlTakeTask += "&colleagueId=" + encodeURIComponent(colleagueId);

                $.ajax({
                    url: urlTakeTask,
                    type: "GET",
                    cache: false
                }).done(function (res) {

                    concluirSucessoAssumir();
                }).fail(function (xhr, status, err) {
                    console.warn("[TESTEGEMINI] takeTask GET falhou:", xhr && xhr.status, err, xhr && xhr.responseText);
                    falhaAoAssumir();
                });

                function falhaAoAssumir() {
                    $btn.prop("disabled", false).removeClass("disabled");
                    $icon.attr("class", "fluigicon fluigicon-user-check");

                    var urlFluigDireta = "/portal/p/" + tenantId + "/pageworkflowview?app_ecm_workflowview_detailsProcessInstanceID=" + encodeURIComponent(instanceId);
                    var msgErro = "Não foi possível assumir a atividade da solicitação #" + instanceId + " via API em segundo plano.";

                    if (typeof FLUIGC !== "undefined" && FLUIGC.modal) {
                        FLUIGC.modal({
                            title: "Assumir Solicitação #" + instanceId,
                            content: '<div class="alert alert-warning" style="margin-bottom:0;">' +
                                     '  <p><strong>' + escapeHtml(msgErro) + '</strong></p>' +
                                     '  <p style="margin-top:10px;">Clique no botão abaixo para abrir a tela da solicitação e assumi-la diretamente na plataforma Fluig:</p>' +
                                     '</div>',
                            id: "modal-erro-assumir",
                            size: "normal",
                            actions: [
                                {
                                    label: "Abrir Solicitação no Fluig",
                                    classType: "btn-primary",
                                    bind: "data-abrir-sol-direta",
                                    autoClose: true
                                },
                                {
                                    label: "Fechar",
                                    autoClose: true
                                }
                            ]
                        });

                        $(document).off("click.abrirSolDireta", "#modal-erro-assumir [data-abrir-sol-direta]")
                                   .on("click.abrirSolDireta", "#modal-erro-assumir [data-abrir-sol-direta]", function () {
                            window.open(urlFluigDireta, "_blank");
                        });
                    } else {
                        if (confirm(msgErro + "\n\nDeseja abrir a solicitação no Fluig agora para assumir?")) {
                            window.open(urlFluigDireta, "_blank");
                        }
                    }
                }
            });
        }

        function concluirSucessoAssumir() {
            if (typeof FLUIGC !== "undefined" && FLUIGC.toast) {
                FLUIGC.toast({
                    title: "Atividade Assumida!",
                    message: "Você assumiu com sucesso a solicitação #" + instanceId + ".",
                    type: "success"
                });
            } else {
                alert("Você assumiu com sucesso a solicitação #" + instanceId + "!");
            }

            // Atualiza a célula do responsável mantendo as tags de criticidade
            var $colResp = $tr.find(".col-celula-responsavel");
            var $divResp = $colResp.find("div");
            if ($divResp.length > 0) {
                $divResp.first().text(userLogado);
            } else {
                $colResp.prepend('<div>' + escapeHtml(userLogado) + '</div>');
            }
            $colResp.find(".tag-responsavel-papel").remove();

            // Atualiza os dados internos em memória da linha
            var sol = $tr.data("sol-data");
            if (sol) {
                sol.responsible = userLogado;
                if (sol.assignee) {
                    sol.assignee.code = userLogado;
                    sol.assignee.name = userLogado;
                }
                if (sol.tasks && sol.tasks.length > 0) {
                    $.each(sol.tasks, function (idx, tk) {
                        if (tk.active || tk.status === 0 || !tk.endDate) {
                            tk.isPool = false;
                            tk.assignee = { code: userLogado, name: userLogado, type: 1 };
                        }
                    });
                }
            }

            var $btnAbrir = $tr.find(".btn-abrir-solicitacao");
            if ($btnAbrir.length > 0) {
                var urlMovimentar = "/portal/p/1/pageworkflowview?app_ecm_workflowview_processInstanceId=" + encodeURIComponent(instanceId);
                if (movementSequence) {
                    urlMovimentar += "&app_ecm_workflowview_currentMovto=" + encodeURIComponent(movementSequence);
                }
                urlMovimentar += "&app_ecm_workflowview_taskUserId=" + encodeURIComponent(userLogado) + "&app_ecm_workflowview_managerMode=false";
                var btnMovimentarHtml = '<a href="' + urlMovimentar + '" target="_blank" class="btn btn-primary btn-xs btn-movimentar-tarefa btn-movimentar" style="background-color: #4579E3; border-color: #4579E3; margin-right: 4px;" title="Movimentar solicitação ' + instanceId + ' em nova aba">Movimentar</a>';
                
                $btn.fadeOut(200, function () {
                    $(this).remove();
                    if ($tr.find(".btn-movimentar").length === 0) {
                        $btnAbrir.before(btnMovimentarHtml);
                    }
                });
            } else {
                $btn.fadeOut(200, function () {
                    $(this).remove();
                });
            }

            if (cacheTarefasSolicitacao[instanceId]) {
                cacheTarefasSolicitacao[instanceId].responsavel = userLogado;
            }
        }

        // Confirmação com o usuário antes de assumir
        var mensagemConfirmacao = "Deseja assumir a atividade da solicitação #" + instanceId + " para o seu usuário (" + userLogado + ")?";
        if (typeof FLUIGC !== "undefined" && FLUIGC.message && FLUIGC.message.confirm) {
            FLUIGC.message.confirm({
                message: mensagemConfirmacao,
                title: "Assumir Atividade",
                labelYes: "Sim, assumir",
                labelNo: "Cancelar"
            }, function (result) {
                if (result) {
                    executarAssumir();
                }
            });
        } else {
            if (confirm(mensagemConfirmacao)) {
                executarAssumir();
            }
        }
    }

    function obterMovimentoAtivo(instanceId, fallbackSeq, solData, callback) {
        // 1. Busca os dados oficiais da solicitação diretamente na API do Fluig
        $.ajax({
            url: "/process-management/api/v2/requests/" + encodeURIComponent(instanceId) + "?_=" + new Date().getTime(),
            type: "GET",
            dataType: "json",
            cache: false
        }).done(function (reqData) {
            var procId = (reqData && reqData.processId) || (solData && solData.processId) || paginacao.processId || processoSelecionadoId || "";
            var procVer = (reqData && (reqData.version || reqData.processVersion)) || (solData && (solData.version || solData.processVersion)) || 1;
            var seq = (reqData && reqData.movementSequence) || fallbackSeq || 1;
            var stId = null;

            if (reqData && reqData.state) {
                stId = reqData.state.sequence || reqData.state.stateId || reqData.state.id;
            }

            // 2. Busca também as tarefas para obter o stateId e taskId ativos
            $.ajax({
                url: "/process-management/api/v2/requests/" + encodeURIComponent(instanceId) + "/tasks?_=" + new Date().getTime(),
                type: "GET",
                dataType: "json",
                cache: false
            }).done(function (res) {
                var tasks = (res && (res.items || res.content || (Array.isArray(res) ? res : []))) || [];



                var tkId = seq;
                var originalAssignee = "";
                for (var i = 0; i < tasks.length; i++) {
                    var tk = tasks[i];
                    if (tk.active === true || tk.status === 0 || !tk.endDate || tk.completed === false) {
                        seq = tk.movementSequence || seq;
                        tkId = tk.id || tk.taskId || tk.taskSequence || seq;
                        originalAssignee = String(
                            (tk.assignee && (tk.assignee.code || tk.assignee.id)) ||
                            tk.colleagueId || tk.assigneeCode || tk.choosedColleague || ""
                        ).trim();
                        if (!stId) {
                            if (tk.state && typeof tk.state === "object") {
                                stId = tk.state.sequence || tk.state.stateId || tk.state.id;
                            } else {
                                stId = tk.stateId || tk.choosedSequence || tk.targetState;
                            }
                        }
                        break;
                    }
                }
                callback(seq, tkId, stId || seq, procId, procVer, originalAssignee);
            }).fail(function () {
                callback(seq, seq, stId || seq, procId, procVer, "");
            });
        }).fail(function () {
            var procIdFallback = (solData && solData.processId) || paginacao.processId || processoSelecionadoId || "";
            var procVerFallback = (solData && (solData.version || solData.processVersion)) || 1;
            callback(fallbackSeq || 1, fallbackSeq || 1, fallbackSeq || 1, procIdFallback, procVerFallback, "");
        });
    }

    // ------------------------------------------------------------------
    // EXPORTAR DADOS EM CSV
    // ------------------------------------------------------------------
    function exportarCsv() {
        if (!paginacao.dadosCompletos || paginacao.dadosCompletos.length === 0) {
            exibirAlerta("Não há registros para exportar.", "warning");
            return;
        }

        var csv = "\uFEFF"; // UTF-8 BOM
        csv += "Solicitacao;Solicitante;Ocorrencia;Atividade;Responsavel;Data Inicial;Status\r\n";

        $.each(paginacao.dadosCompletos, function (i, sol) {
            var numero = sol.processInstanceId || "";
            var solicitante = extrairSolicitante(sol);
            var ocorrencia = (sol.ocorrenciaExtracao || extrairOcorrencia(sol)).replace(/;/g, ",");
            var atividade = extrairNomeAtividade(sol).replace(/;/g, ",");
            var responsavel = extrairResponsavel(sol).replace(/;/g, ",");
            var dataInicial = formatarDataExibicao(sol.startDate, true);
            var status = normalizarStatus(sol.status || sol.state).rotulo;

            csv += numero + ";" + solicitante + ";" + ocorrencia + ";" + atividade + ";" + responsavel + ";" + dataInicial + ";" + status + "\r\n";
        });

        var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        var url = URL.createObjectURL(blob);
        var link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "solicitacoes_fluig_" + Date.now() + ".csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }



    // ------------------------------------------------------------------
    // LIMPAR FILTROS
    // ------------------------------------------------------------------
    function limparFiltros() {
        $("#dtInicio").val("");
        $("#dtFim").val("");
        if (!$("#selProcesso").prop("disabled")) {
            $("#selProcesso").val("");
        }
        $("#numSolicitacaoInicio").val("");
        $("#numSolicitacaoFim").val("");
        $("#txtFiltroAtividade").val("");
        $("#chkStatusAbertas").prop("checked", true);
        $("#chkStatusFinalizadas").prop("checked", true);
        $("#chkStatusCanceladas").prop("checked", true);
        $("#optTodasSolicitacoes").prop("checked", true);
        $("#painelResultados").hide();
        $("#msgSemResultado").hide();
        paginacao.dadosOriginais = [];
        paginacao.filtrosCriticidadeAtivos = {};
        $("#avisoFiltroCriticidade").remove();
        atualizarVisualLegendaCriticidade();
    }

    // ------------------------------------------------------------------
    // HELPERS: LOADING, ALERTAS E ERROS (padrão FLUIGC)
    // ------------------------------------------------------------------
    var loadingMessageInterval = null;
    var loadingMessages = [
        "Estamos atuando na sua central de tarefas...",
        "Criando uma experiência única...",
        "Sincronizando dados com o sistema...",
        "Preparando as melhores informações para você...",
        "Quase lá, só mais um instante..."
    ];

    function exibirLoading(mostrar) {
        if (mostrar) {
            $("#msgErroApi").hide().html(""); // limpa erro anterior a cada nova chamada
        }

        // Implementação própria (não depende da assinatura do FLUIGC.loading,
        // que varia entre versões e estava causando erros).
        var $widget = $("#widgetConsultaSolicitacoes");
        var $overlay = $("#loadingOverlayWidget");

        if ($overlay.length === 0) {
            $overlay = $(
                '<div id="loadingOverlayWidget" style="display:none; position:absolute; inset:0; ' +
                'background:rgba(255,255,255,0.7); z-index:9999; text-align:center; padding-top:40px;">' +
                    '<i class="fa fa-spinner fa-spin" style="font-size:28px;"></i>' +
                    '<div id="textoLoadingOverlay" style="margin-top:10px; font-weight:bold; font-size:14px; color:#333;">Aguarde...</div>' +
                '</div>'
            );
            $widget.css("position", "relative").append($overlay);
        }

        if (mostrar) {
            $("#textoLoadingOverlay").text("Aguarde...");
            $overlay.show();
            
            if (loadingMessageInterval) clearInterval(loadingMessageInterval);
            var msgIndex = 0;
            loadingMessageInterval = setInterval(function() {
                $("#textoLoadingOverlay").text(loadingMessages[msgIndex]);
                msgIndex = (msgIndex + 1) % loadingMessages.length;
            }, 2000);
        } else {
            if (loadingMessageInterval) clearInterval(loadingMessageInterval);
            $overlay.hide();
        }
    }

    function exibirAlerta(mensagem, tipo) {
        // FLUIGC.toast é o componente padrão de notificação do Style Guide.
        try {
            if (typeof FLUIGC !== "undefined" && FLUIGC.toast) {
                FLUIGC.toast({
                    type: tipo || "info", // success | info | warning | danger
                    title: tipo === "warning" ? "Atenção" : "Aviso",
                    message: mensagem
                });
                return;
            }
        } catch (e) {
            console.error("Falha ao usar FLUIGC.toast, caindo para alert().", e);
        }
        alert(mensagem);
    }

    function exibirErro(mensagemPadrao, xhr, urlChamada) {
        var status     = (xhr && xhr.status !== undefined) ? xhr.status : "?";
        var statusText = (xhr && xhr.statusText) ? xhr.statusText : "";
        var corpo = "";
        try {
            if (xhr && xhr.responseText) {
                corpo = xhr.responseText.substring(0, 300); // limita tamanho
            }
        } catch (e) { /* ignora */ }

        var detalheTecnico =
            "URL: " + (urlChamada || "-") + "\n" +
            "HTTP Status: " + status + " " + statusText + "\n" +
            (corpo ? ("Resposta: " + corpo) : "");

        console.error(mensagemPadrao, xhr);

        // Mostra SEMPRE na tela (não depende de FLUIGC estar carregado)
        $("#msgErroApi")
            .html("<strong>" + escapeHtml(mensagemPadrao) + "</strong><br><small>" + escapeHtml(detalheTecnico) + "</small>")
            .show();

        exibirAlerta(mensagemPadrao, "danger");
    }

    // ------------------------------------------------------------------
    // HELPERS: DATAS E STATUS
    // ------------------------------------------------------------------
    function converterParaDate(dataBr) {
        // dataBr no formato DD/MM/YYYY
        var partes = dataBr.split("/");
        return new Date(partes[2], partes[1] - 1, partes[0]);
    }

    function converterDataParaApi(dataBr) {
        // Converte DD/MM/YYYY para YYYY-MM-DD (ajuste se a API exigir outro formato)
        var partes = dataBr.split("/");
        if (partes.length !== 3) { return dataBr; }
        return partes[2] + "-" + partes[1] + "-" + partes[0];
    }

    function formatarDataExibicao(valor, comHora) {
        if (!valor) { return "-"; }
        var d = new Date(valor);
        if (isNaN(d.getTime())) { return escapeHtml(String(valor)); }

        var dia = String(d.getDate()).padStart(2, "0");
        var mes = String(d.getMonth() + 1).padStart(2, "0");
        var ano = d.getFullYear();
        var resultado = dia + "/" + mes + "/" + ano;

        if (comHora) {
            var hh = String(d.getHours()).padStart(2, "0");
            var mm = String(d.getMinutes()).padStart(2, "0");
            resultado += " " + hh + ":" + mm;
        }
        return resultado;
    }

    function normalizarStatus(statusApi) {
        var s = (statusApi || "").toString().toUpperCase();

        // "CANCEL" cobre CANCELLED/CANCELED/CANCELADO
        if (s.indexOf("CANCEL") > -1) {
            return { classe: "status-cancelado", rotulo: "Cancelado", chaveFiltro: "CANCELADO" };
        }
        // Cobre CONCLUDED/FINISHED/FINALIZADO/CONCLUIDO
        if (s.indexOf("FINAL") > -1 || s.indexOf("CONCLU") > -1 || s.indexOf("CLOSED") > -1) {
            return { classe: "status-finalizado", rotulo: "Finalizado", chaveFiltro: "FINALIZADO" };
        }
        // "OPEN" é o valor confirmado da API para solicitações em aberto
        return { classe: "status-aberto", rotulo: "Em Aberto", chaveFiltro: "ABERTO" };
    }

    function validarIdsFaltantes(idsBuscadosEspecificos, solicitacoesEncontradas, processoAlvo) {
        if (!idsBuscadosEspecificos || idsBuscadosEspecificos.length === 0) return;
        
        var idsDoProcesso = solicitacoesEncontradas.map(function(s) { return parseInt(s.processInstanceId, 10); });
        var idsFaltantes = idsBuscadosEspecificos.filter(function(id) { return idsDoProcesso.indexOf(id) === -1; });
        
        if (idsFaltantes.length === 0) return;
        
        var promises = [];
        var limite = Math.min(idsFaltantes.length, 5); // Limita para não sobrecarregar
        
        for (var i = 0; i < limite; i++) {
            var id = idsFaltantes[i];
            var req = $.ajax({
                url: "/process-management/api/v2/requests/" + id,
                type: "GET",
                dataType: "json",
                headers: { "Accept": "application/json" }
            }).then(function(res) {
                if (res && res.processId && res.processId !== processoAlvo) {
                    return { id: res.processInstanceId, projErrado: res.processId, projDesc: res.processDescription };
                }
                return null;
            }).catch(function() { return null; });
            promises.push(req);
        }
        
        if (promises.length > 0) {
            $.when.apply($, promises).done(function() {
                var resultados = Array.prototype.slice.call(arguments);
                var msgs = [];
                $.each(resultados, function(idx, item) {
                    if (item) {
                        msgs.push("A solicitação <strong>#" + item.id + "</strong> pertence ao processo <strong>" + (item.projDesc || item.projErrado) + "</strong>.");
                    }
                });
                
                if (msgs.length > 0) {
                    var titulo = msgs.length === 1 ? "Solicitação de outro processo" : "Solicitações de outros processos";
                    var html = "<div class='alert alert-warning' style='font-size: 14px; margin-bottom:0;'>";
                    html += "<p>Atenção! Você buscou por solicitações que não pertencem ao projeto selecionado atualmente (<strong>" + escapeHtml(processoAlvo) + "</strong>):</p>";
                    html += "<ul style='margin-top:10px;'>";
                    $.each(msgs, function(i, m) { html += "<li style='margin-bottom:8px;'>" + m + "</li>"; });
                    html += "</ul></div>";
                    
                    if (typeof FLUIGC !== "undefined" && FLUIGC.modal) {
                        FLUIGC.modal({
                            title: titulo,
                            content: html,
                            id: "modal-processo-errado",
                            size: "normal",
                            actions: [{ label: "Entendi", autoClose: true }]
                        });
                    } else {
                        exibirAlerta("Algumas solicitações buscadas não são do projeto " + processoAlvo, "warning");
                    }
                }
            });
        }
    }

    function escapeHtml(texto) {
        if (texto === null || texto === undefined) { return ""; }
        return String(texto)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function initDragDropColunas() {
        var $thList = $("#tblResultados thead th");
        if ($thList.length === 0) return;

        // Ativa drag in HTML5
        $thList.attr("draggable", "true");
        $thList.css("cursor", "move");
        
        $thList.attr("title", "Clique e arraste para reordenar a coluna");

        if (!window.colOrder) {
            window.colOrder = [];
            for (var i = 0; i < $thList.length; i++) {
                window.colOrder.push(i);
            }
        }

        var draggedIdx = null;

        $thList.off("dragstart").on("dragstart", function(e) {
            draggedIdx = $(this).index();
            $(this).css("opacity", "0.4");
            e.originalEvent.dataTransfer.effectAllowed = 'move';
            e.originalEvent.dataTransfer.setData('text/plain', draggedIdx);
        });

        $thList.off("dragend").on("dragend", function(e) {
            $(this).css("opacity", "1");
            $thList.removeClass("drag-over");
            $thList.css({"border-left": "", "border-right": ""});
        });

        $thList.off("dragover").on("dragover", function(e) {
            e.preventDefault(); 
            e.originalEvent.dataTransfer.dropEffect = 'move';
            
            // Estilo visual de onde vai cair
            $thList.css({"border-left": "", "border-right": ""});
            var targetIdx = $(this).index();
            if (draggedIdx !== null && targetIdx !== draggedIdx) {
                if (targetIdx > draggedIdx) {
                    $(this).css("border-right", "3px solid #0072c6");
                } else {
                    $(this).css("border-left", "3px solid #0072c6");
                }
            }
            return false;
        });

        $thList.off("dragenter").on("dragenter", function(e) {
            if ($(this).index() !== draggedIdx) {
                $(this).addClass("drag-over");
            }
        });

        $thList.off("dragleave").on("dragleave", function(e) {
            $(this).removeClass("drag-over");
            $(this).css({"border-left": "", "border-right": ""});
        });

        $thList.off("drop").on("drop", function(e) {
            e.stopPropagation();
            var targetIdx = $(this).index();
            
            $thList.removeClass("drag-over");
            $thList.css({"border-left": "", "border-right": ""});
            $thList.css("opacity", "1");

            if (draggedIdx !== null && draggedIdx !== targetIdx) {
                var $tr = $(this).parent();
                var $cols = $tr.children("th");
                var $draggedCol = $cols.eq(draggedIdx);
                
                if (targetIdx > draggedIdx) {
                    $draggedCol.insertAfter($cols.eq(targetIdx));
                } else {
                    $draggedCol.insertBefore($cols.eq(targetIdx));
                }
                
                var movedItem = window.colOrder.splice(draggedIdx, 1)[0];
                window.colOrder.splice(targetIdx, 0, movedItem);

                renderizarPagina();
            }
            draggedIdx = null;
            return false;
        });
    }

    // Exposição da API global para garantir funcionamento dos filtros e do grid
    window.TESTEGEMINI_API = {
        paginacao: paginacao,
        aplicarFiltroCriticidade: aplicarFiltroCriticidade,
        renderizarPagina: renderizarPagina,
        identificarCriticidade: identificarCriticidade
    };

})(jQuery);
