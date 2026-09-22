<#--
====================================================================
 WIDGET: Consulta Avançada de Solicitações de Processos - Fluig
 Arquivo: view.ftl
 Autor: benhur.silveira
 Tecnologias: Freemarker + HTML5 + Bootstrap (Fluig Style Guide) + jQuery + FLUIGC

 CSS e JavaScript estão em:
   /resources/css/TESTEGEMINI.css
   /resources/js/TESTEGEMINI.js
====================================================================
-->
<script type="text/javascript" src="/webdesk/vcXMLRPC.js"></script>

<div class="widget-consulta-solicitacoes container-fluid fluig-style-guide" id="widgetConsultaSolicitacoes">

    <!-- ======================= MENSAGEM DE BOAS VINDAS ======================= -->
    <div id="mensagemBoasVindas" style="margin-bottom: 25px; text-align: center;">
        <h3 id="boasVindasTitulo" style="margin-top: 0; color: #005c9a; font-weight: 600; font-size: 24px;"></h3>
        <p style="color: #666; font-size: 15px; margin-bottom: 0;">Esta é a sua central de tarefas personalizada.</p>
    </div>

    <!-- ======================= BOTÕES SUPERIORES ======================= -->
    <div style="margin-bottom: 15px; text-align: left;">
        <button type="button" class="btn btn-default" id="btnToggleBuscaAvancada" style="margin-right: 10px;">
            <i class="fluigicon fluigicon-filter"></i> Deseja fazer uma busca avançada?
        </button>
    </div>

    <!-- ======================= PAINEL DE FILTROS ======================= -->
    <div class="panel panel-default" id="painelFiltrosBusca" style="margin-bottom:15px; display:none;">
        <div class="panel-heading" style="font-weight:600; font-size:16px;">
            <i class="fluigicon fluigicon-process"></i> Consultar solicitações
        </div>
        <div class="panel-body" style="padding: 0;">
            <div style="background-color: #fafafa ; padding: 20px 20px 5px 20px;">
                <form>
                    
                    <!-- Processo -->
                    <div class="form-group" style="margin-bottom: 10px; display: flex; align-items: center;">
                        <label style="width: 180px; min-width: 180px; text-align: left; font-weight: 600; margin-bottom: 0; font-size: 13px;">Por processos</label>
                        <div style="flex-grow: 1; margin-right: 15px;">
                            <select id="selProcesso" class="form-control" style="background-color: #fff;">
                                <option value="">Selecione ou busque a descrição do processo...</option>
                            </select>
                        </div>
                        <label style="width: 150px; min-width: 150px; text-align: right; font-weight: 600; margin-bottom: 0; padding-right: 15px; font-size: 13px; white-space: nowrap;"><i class="fluigicon fluigicon-pointer-right"></i> Atividade Atual:</label>
                        <div style="width: 300px; min-width: 300px;">
                            <input type="text" class="form-control" id="txtFiltroAtividade" placeholder="Filtrar por nome ou ID..." style="background-color: #fff;">
                        </div>
                    </div>

                    <!-- Tipo de filtro -->
                    <div class="form-group" style="margin-bottom: 10px; display: flex; align-items: center;">
                        <label style="width: 180px; min-width: 180px; text-align: left; font-weight: 600; margin-bottom: 0; font-size: 13px;">Filtrar por:</label>
                        <div style="flex-grow: 1;">
                            <label class="radio-inline" style="margin-left: 0; margin-right: 15px; font-weight: normal;">
                                <input type="radio" name="optTipoFiltro" id="optFiltroData" value="DATA" checked> Período (Datas)
                            </label>
                            <label class="radio-inline" style="margin-left: 0; margin-right: 15px; font-weight: normal;">
                                <input type="radio" name="optTipoFiltro" id="optFiltroNumero" value="NUMERO"> Número da Solicitação
                            </label>
                        </div>
                    </div>

                    <!-- Bloco Data -->
                    <div class="form-group" id="blocoFiltroData" style="margin-bottom: 10px; display: flex; align-items: center;">
                        <label style="width: 180px; min-width: 180px; text-align: left; font-weight: normal; margin-bottom: 0; font-size: 13px;">A partir desta data:</label>
                        <div style="width: 250px;">
                            <div class="input-group date" id="grpDtInicio_TESTEGEMINI">
                                <input type="text" class="form-control" id="dtInicio_TESTEGEMINI" autocomplete="off" style="background-color: #fff;">
                                <span class="input-group-addon"><i class="fluigicon fluigicon-calendar"></i></span>
                            </div>
                        </div>
                        <label style="width: 60px; min-width: 60px; text-align: right; font-weight: normal; margin-bottom: 0; padding-right: 15px; font-size: 13px;">Até:</label>
                        <div style="width: 250px;">
                            <div class="input-group date" id="grpDtFim_TESTEGEMINI">
                                <input type="text" class="form-control" id="dtFim_TESTEGEMINI" autocomplete="off" style="background-color: #fff;">
                                <span class="input-group-addon"><i class="fluigicon fluigicon-calendar"></i></span>
                            </div>
                        </div>
                    </div>

                    <!-- Bloco Numero -->
                    <div class="form-group" id="blocoFiltroNumero" style="display:none; margin-bottom: 10px; align-items: center;">
                        <label style="width: 180px; min-width: 180px; text-align: left; font-weight: normal; margin-bottom: 0; font-size: 13px;">A partir da solicitação:</label>
                        <div style="width: 250px;">
                            <input type="text" class="form-control" id="numSolicitacaoInicio" style="background-color: #fff;">
                        </div>
                        <label style="width: 60px; min-width: 60px; text-align: right; font-weight: normal; margin-bottom: 0; padding-right: 15px; font-size: 13px;">Até:</label>
                        <div style="width: 250px;">
                            <input type="text" class="form-control" id="numSolicitacaoFim" style="background-color: #fff;">
                        </div>
                    </div>

                    <!-- Status -->
                    <div class="form-group" style="margin-bottom: 10px; display: flex; align-items: center;">
                        <label style="width: 180px; min-width: 180px; text-align: left; font-weight: 600; margin-bottom: 0; font-size: 13px;">Status:</label>
                        <div style="flex-grow: 1;">
                            <label class="checkbox-inline" style="margin-left: 0; margin-right: 15px; font-weight: normal;">
                                <input type="checkbox" id="chkStatusAbertas" checked> Abertas
                            </label>
                            <label class="checkbox-inline" style="margin-left: 0; margin-right: 15px; font-weight: normal;">
                                <input type="checkbox" id="chkStatusFinalizadas"> Finalizadas
                            </label>
                            <label class="checkbox-inline" style="margin-left: 0; margin-right: 15px; font-weight: normal;">
                                <input type="checkbox" id="chkStatusCanceladas"> Canceladas
                            </label>
                        </div>
                    </div>

                    <!-- Solicitações -->
                    <div class="form-group" style="margin-bottom: 15px; display: flex; align-items: center;">
                        <label style="width: 180px; min-width: 180px; text-align: left; font-weight: 600; margin-bottom: 0; font-size: 13px;">Solicitações:</label>
                        <div style="flex-grow: 1; display: flex; flex-wrap: wrap; gap: 15px;">
                            <label class="radio-inline" style="margin-left: 0; font-weight: normal;">
                                <input type="radio" name="optEscopoSolicitacao" value="INICIALIZEI"> Que inicializei
                            </label>
                            <label class="radio-inline" style="margin-left: 0; font-weight: normal;">
                                <input type="radio" name="optEscopoSolicitacao" value="PARTICIPEI"> Que participei
                            </label>
                            <label class="radio-inline" style="margin-left: 0; font-weight: normal;">
                                <input type="radio" name="optEscopoSolicitacao" value="GESTOR"> Que participei como gestor/substituto
                            </label>
                            <label class="radio-inline" style="margin-left: 0; font-weight: normal;">
                                <input type="radio" name="optEscopoSolicitacao" id="optSobMinhaGerencia" value="MINHA_GERENCIA"> Sob minha gerência
                            </label>
                            <label class="radio-inline" style="margin-left: 0; font-weight: 600; color: #4579E3;">
                                <input type="radio" name="optEscopoSolicitacao" id="optTodasSolicitacoes" value="TODAS" checked> Todas as solicitações
                                <i class="fluigicon fluigicon-info-sign fluigicon-xs" title="Todas as solicitações do processo"></i>
                            </label>
                        </div>
                    </div>
                </form>
            </div>

            <!-- Footer de botões -->
            <div style="background-color: #fff; padding: 15px 20px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <button type="button" class="btn btn-default" id="btnLimpar">Limpar</button>
                </div>
                <div>
                    <button type="button" class="btn btn-default" id="btnExportarCsv" style="background-color: #fff; margin-right: 10px;">
                        Exportar
                    </button>
                    <button type="button" class="btn btn-primary" id="btnBuscar" style="background-color: #4579E3; border-color: #4579E3;">
                        <i class="fluigicon fluigicon-search fluigicon-xs"></i> Buscar
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- ======================= GRID DE RESULTADOS ======================= -->
    <div class="panel panel-default" id="painelResultados" style="display:none;">
        <div class="panel-heading" style="background-color: #4579E3; color: #fff; font-weight: 600; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div style="font-size: 15px;">
                Resultados encontrados (<span id="badgeTotal">0</span>)
            </div>
            <div class="legenda-criticidades" style="margin: 0; display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: 600; margin-right: 4px;"><i class="fluigicon fluigicon-filter"></i> Criticidade:</span>
                <span class="item-legenda filtro-criticidade" data-filtro-crit="alta" title="Clique para filtrar apenas solicitações de Criticidade Alta" style="cursor:pointer; user-select:none; padding: 4px 10px; border-radius: 4px; transition: all 0.2s ease;"><span class="indicador-legenda alta"></span> Alta</span>
                <span class="item-legenda filtro-criticidade" data-filtro-crit="media" title="Clique para filtrar apenas solicitações de Criticidade Média" style="cursor:pointer; user-select:none; padding: 4px 10px; border-radius: 4px; transition: all 0.2s ease;"><span class="indicador-legenda media"></span> Média</span>
                <span class="item-legenda filtro-criticidade" data-filtro-crit="baixa" title="Clique para filtrar apenas solicitações de Criticidade Baixa" style="cursor:pointer; user-select:none; padding: 4px 10px; border-radius: 4px; transition: all 0.2s ease;"><span class="indicador-legenda baixa"></span> Baixa</span>
            </div>
        </div>
        <div class="panel-body card-body" style="padding:0;">
            <div class="table-responsive">
                <table class="table table-hover table-striped" id="tblResultados">
                    <thead>
                        <tr>
                            <th class="col-sortable" data-sort="numero" style="cursor: pointer;">Solicitação <i class="fluigicon fluigicon-sort"></i></th>
                            <th class="col-sortable" data-sort="solicitante" style="cursor: pointer;">Solicitante <i class="fluigicon fluigicon-sort"></i></th>
                            <th class="col-sortable" data-sort="ocorrencia" style="cursor: pointer;">Ocorrência <i class="fluigicon fluigicon-sort"></i></th>
                            <th class="col-sortable" data-sort="atividade" style="cursor: pointer;">Atividade <i class="fluigicon fluigicon-sort"></i></th>
                            <th class="col-sortable" data-sort="responsavel" style="cursor: pointer;">Responsável <i class="fluigicon fluigicon-sort"></i></th>
                            <th class="col-sortable" data-sort="dataInicial" style="cursor: pointer;">Data Inicial <i class="fluigicon fluigicon-sort"></i></th>
                            <th class="col-sortable col-prazo-juridico" data-sort="prazoJuridico" style="cursor: pointer;">Prazo Analisar Jurídico <i class="fluigicon fluigicon-sort"></i></th>
                            <th class="col-sortable" data-sort="status" style="cursor: pointer;">Status <i class="fluigicon fluigicon-sort"></i></th>
                            <th style="text-align: center; width: 90px;">Anexos</th>
                            <th style="text-align: center; width: 160px;">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="tblResultadosBody">
                        <!-- linhas inseridas via JS -->
                    </tbody>
                </table>
            </div>

            <!-- Controles de paginação -->
            <div class="row" style="padding:10px 15px; align-items:center;">
                <div class="col-md-4 col-sm-12">
                    <label style="font-weight:normal; margin-right:6px;">Itens por página:</label>
                    <select id="selItensPorPagina" style="width:80px; display:inline-block;">
                        <option value="10">10</option>
                        <option value="25" selected>25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </select>
                </div>
                <div class="col-md-4 col-sm-12 text-center" id="lblInfoPagina">
                    Página 1 de 1
                </div>
                <div class="col-md-4 col-sm-12 text-right">
                    <button type="button" class="btn btn-default btn-sm" id="btnPaginaAnterior">
                        <i class="fluigicon fluigicon-arrow-left"></i> Anterior
                    </button>
                    <button type="button" class="btn btn-default btn-sm" id="btnPaginaProxima">
                        Próxima <i class="fluigicon fluigicon-arrow-right"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Mensagem de nenhum resultado -->
    <div class="alert alert-info" id="msgSemResultado" style="display:none;">
        Nenhuma solicitação encontrada para os filtros informados.
    </div>

    <!-- Banner de erro visível (não depende de FLUIGC.toast/alert) -->
    <div class="alert alert-danger" id="msgErroApi" style="display:none; white-space:pre-wrap;"></div>

</div>

<!-- Fluig Style Guide -->
<link type="text/css" rel="stylesheet" href="/style-guide/css/fluig-style-guide.min.css"/>
<script type="text/javascript" src="/style-guide/js/fluig-style-guide.min.js" charset="utf-8"></script>
<!-- JSZip para compactação de anexos -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>

<!-- Script embutido no template para garantir a execução imediata dos filtros da legenda -->
<script type="text/javascript">
(function ($) {
    // Registra o evento de clique na legenda com namespace exclusivo (evita duplo disparo)
    $(document).off("click.filtroCrit").on("click.filtroCrit", ".legenda-criticidades .item-legenda, .filtro-criticidade", function (e) {
        e.preventDefault();
        e.stopPropagation();

        var $el = $(this).closest(".item-legenda, .filtro-criticidade");
        var crit = $el.attr("data-filtro-crit") || "";
        if (!crit) {
            var txt = $el.text().toLowerCase();
            if (txt.indexOf("alta") > -1) crit = "alta";
            else if (txt.indexOf("med") > -1) crit = "media";
            else if (txt.indexOf("baix") > -1) crit = "baixa";
        }
        if (!crit) return;

        // 1. Se a API global do TESTEGEMINI.js estiver disponível, chama direto
        if (window.TESTEGEMINI_API && typeof window.TESTEGEMINI_API.aplicarFiltroCriticidade === "function") {
            window.TESTEGEMINI_API.aplicarFiltroCriticidade(crit, true);
            return;
        }

        // 2. Fallback direto no DOM das linhas do grid caso o JS externo esteja em cache
        alternarFiltroDom(crit);
    });

    var mapaCritAtivas = {};
    function alternarFiltroDom(crit) {
        var valor = String(crit || "").toUpperCase().trim();
        if (valor === "MÉDIA") valor = "MEDIA";

        if (mapaCritAtivas[valor]) {
            delete mapaCritAtivas[valor];
        } else {
            mapaCritAtivas[valor] = true;
        }

        var chaves = Object.keys(mapaCritAtivas);
        var $linhas = $("#tblResultadosBody tr.linha-solicitacao");
        if ($linhas.length === 0) return;

        var pesoLinha = function (el) {
            var $el = $(el);
            if ($el.hasClass("linha-criticidade-alta")) return 3;
            if ($el.hasClass("linha-criticidade-media")) return 2;
            if ($el.hasClass("linha-criticidade-baixa")) return 1;
            return 0;
        };

        if (chaves.length === 0) {
            var arrayTodas = $linhas.get();
            arrayTodas.sort(function (a, b) {
                return pesoLinha(b) - pesoLinha(a);
            });
            var $tbodyAll = $("#tblResultadosBody");
            $.each(arrayTodas, function (idx, el) {
                $tbodyAll.append(el);
            });

            $linhas.show();
            $("#badgeTotal").text($linhas.length);
            $("#avisoFiltroCriticidade").remove();
            $(".legenda-criticidades .item-legenda").css({ "opacity": "1", "font-weight": "normal", "background": "transparent", "box-shadow": "none", "border": "1px solid transparent" });
        } else {
            // Monta o seletor com todas as classes ativas
            var seletores = $.map(chaves, function (c) {
                return ".linha-criticidade-" + c.toLowerCase();
            }).join(", ");

            $linhas.hide();
            var $visiveis = $linhas.filter(seletores);

            // Reordena no DOM para colocar sempre Alta > Média > Baixa
            var arrayVisiveis = $visiveis.get();
            arrayVisiveis.sort(function (a, b) {
                return pesoLinha(b) - pesoLinha(a);
            });
            var $tbodyVis = $("#tblResultadosBody");
            $.each(arrayVisiveis, function (idx, el) {
                $tbodyVis.append(el);
            });

            $visiveis.show();
            $("#badgeTotal").text($visiveis.length);

            $(".legenda-criticidades .item-legenda").each(function () {
                var $item = $(this);
                var c = ($item.attr("data-filtro-crit") || "").toUpperCase();
                if (!c) {
                    var txt = $item.text().toLowerCase();
                    if (txt.indexOf("alta") > -1) c = "ALTA";
                    else if (txt.indexOf("med") > -1) c = "MEDIA";
                    else if (txt.indexOf("baix") > -1) c = "BAIXA";
                }
                if (c === "MÉDIA") c = "MEDIA";

                if (mapaCritAtivas[c]) {
                    $item.css({ "opacity": "1", "font-weight": "bold", "background": "rgba(255,255,255,0.35)", "box-shadow": "0 0 0 2px #ffffff", "border": "1px solid #ffffff" });
                } else {
                    $item.css({ "opacity": "0.35", "font-weight": "normal", "background": "transparent", "box-shadow": "none", "border": "1px solid transparent" });
                }
            });

            var rotulos = $.map(chaves, function (c) {
                return c === "ALTA" ? "Alta" : (c === "MEDIA" ? "Média" : "Baixa");
            }).join(", ");

            if ($("#avisoFiltroCriticidade").length === 0) {
                $("#tblResultados").before(
                    '<div id="avisoFiltroCriticidade" style="background:#fff3cd;border:1px solid #ffeeba;color:#856404;padding:8px 14px;font-size:13px;display:flex;align-items:center;gap:10px;margin-bottom:0;">' +
                    '  <i class="fluigicon fluigicon-filter"></i>' +
                    '  <span>Exibindo criticidades: <strong>' + rotulos + '</strong> (' + $visiveis.length + ' de ' + $linhas.length + ' solicitações)</span>' +
                    '  <a href="javascript:void(0)" id="btnLimparFiltroCritInline" style="margin-left:auto;font-weight:600;color:#856404;text-decoration:underline;">Mostrar todas</a>' +
                    '</div>'
                );
            } else {
                $("#avisoFiltroCriticidade span").html('Exibindo criticidades: <strong>' + rotulos + '</strong> (' + $visiveis.length + ' de ' + $linhas.length + ' solicitações)');
            }
        }
    }

    $(document).off("click.limparFiltroCrit").on("click.limparFiltroCrit", "#btnLimparFiltroCritInline, #btnLimparFiltroCrit", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (window.TESTEGEMINI_API && typeof window.TESTEGEMINI_API.aplicarFiltroCriticidade === "function") {
            window.TESTEGEMINI_API.aplicarFiltroCriticidade("", false);
        } else {
            mapaCritAtivas = {};
            var $linhas = $("#tblResultadosBody tr.linha-solicitacao");
            $linhas.show();
            $("#badgeTotal").text($linhas.length);
            $("#avisoFiltroCriticidade").remove();
            $(".legenda-criticidades .item-legenda").css({ "opacity": "1", "font-weight": "normal", "background": "transparent", "box-shadow": "none", "border": "1px solid transparent" });
        }
    });
})(jQuery);
</script>

<!-- Fallback robusto para Calendário Fluig (Especialmente para Page Preview Mode) -->
<script type="text/javascript">
(function() {
    var initCalendars = function() {
        if (typeof FLUIGC !== "undefined" && FLUIGC.calendar) {
            var $dtI = $("#dtInicio_TESTEGEMINI");
            if ($dtI.length && !$dtI.hasClass("fluig-calendar-bound")) {
                FLUIGC.calendar("#dtInicio_TESTEGEMINI", { pickDate: true, pickTime: false, locale: "pt-br", format: "DD/MM/YYYY" });
                $dtI.addClass("fluig-calendar-bound");
            }
            var $dtF = $("#dtFim_TESTEGEMINI");
            if ($dtF.length && !$dtF.hasClass("fluig-calendar-bound")) {
                FLUIGC.calendar("#dtFim_TESTEGEMINI", { pickDate: true, pickTime: false, locale: "pt-br", format: "DD/MM/YYYY" });
                $dtF.addClass("fluig-calendar-bound");
            }
        }
    };
    
    // Tenta após carregar a página
    setTimeout(initCalendars, 300);
    setTimeout(initCalendars, 1000);
    
    // Tenta sob demanda (quando o usuário clica)
    $(document).on("click", "#grpDtInicio_TESTEGEMINI .input-group-addon, #dtInicio_TESTEGEMINI", function() {
        initCalendars();
    });
    $(document).on("click", "#grpDtFim_TESTEGEMINI .input-group-addon, #dtFim_TESTEGEMINI", function() {
        initCalendars();
    });
})();
</script>
