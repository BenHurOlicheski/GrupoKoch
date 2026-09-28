<div id="PainelReembolso_${instanceId}" class="super-widget wcm-widget-class fluig-style-guide"
     data-params="PainelReembolso.instance({instanceId: '${instanceId}'})">

    <div class="row" style="margin-bottom: 25px; margin-top: 10px;">
        <div class="col-md-12 text-center">
            <h2>Solicitação de Reembolso</h2>
            <p class="text-muted" style="font-size: 16px; max-width: 800px; margin: 15px auto;">
                Este processo é padrão para todos os colaboradores. Através dele, você pode solicitar o reembolso de despesas geradas durante o seu trabalho (como Alimentação, Combustível, Hospedagem, etc).
            </p>
        </div>
    </div>

    <!-- Formulário de Nova Solicitação em Collapse -->
    <div class="row">
        <div class="col-md-12">
            <div class="panel-group" id="accordionForm_${instanceId}">
                <div class="panel panel-primary">
                    <div class="panel-heading" style="cursor: pointer; padding: 15px;" data-toggle="collapse" data-parent="#accordionForm_${instanceId}" href="#collapseReembolso_${instanceId}">
                        <h4 class="panel-title text-center" style="font-size: 18px;">
                            <span class="flaticon flaticon-add-box icon-md"></span> 
                            <strong>Clique aqui para Lançar Nova Despesa</strong>
                            <i class="fluigicon fluigicon-chevron-down pull-right"></i>
                        </h4>
                    </div>
                    <div id="collapseReembolso_${instanceId}" class="panel-collapse collapse">
                        <div class="panel-body">
                            <form id="formNovoReembolso_${instanceId}">
                        
                        <!-- DADOS DO COLABORADOR (VISÍVEIS) -->
                        <div class="row">
                            <div class="form-group col-xs-12 col-sm-12 col-md-12 col-lg-12">
                                <div class="form-input col-xs-8 col-sm-8 col-md-8 col-lg-8">
                                    <div class="form-group">
                                        <i class="flaticon flaticon-person-pin-circle icon-md" aria-hidden="true"></i>
                                        <label for="zoomColaborador_${instanceId}">Nome do Colaborador - Beneficiário</label>
                                        
                                        <div class="input-group">
                                            <input type="text" class="form-control" name="zoomColaborador" id="zoomColaborador_${instanceId}" readonly placeholder="Clique na lupa para buscar...">
                                            <div class="input-group-addon" style="cursor: pointer;" data-abrir-modal-zoom>
                                                <span class="fluigicon fluigicon-zoom-in"></span>
                                            </div>
                                        </div>

                                    </div>
                                </div>

                                <div class="form-field col-xs-2 col-sm-2 col-md-2 col-lg-2">
                                    <div class="form-input">
                                        <div class="form-group">
                                            <i class="flaticon flaticon-person-card icon-md" aria-hidden="true"></i>
                                            <label for="zoomCodColaborador_${instanceId}">Código</label>
                                            <input type="text" class="form-control" name="zoomCodColaborador" id="zoomCodColaborador_${instanceId}" readonly>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="form-field col-xs-2 col-sm-2 col-md-2 col-lg-2">
                                    <div class="form-input">
                                        <div class="form-group">
                                            <i class="flaticon flaticon-person-card icon-md" aria-hidden="true"></i>
                                            <label for="zoomFilial_${instanceId}">Filial</label>
                                            <input type="text" class="form-control" name="zoomFilial" id="zoomFilial_${instanceId}" readonly>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- DADOS BANCÁRIOS (OCULTOS) -->
                        <div style="display: none;">
                            <div class="row">
                                <div class="form-group col-xs-12 col-sm-12 col-md-12 col-lg-12">
                                    <div class="form-field col-xs-2 col-sm-2 col-md-2 col-lg-2">
                                        <div class="form-input">
                                            <div class="form-group">
                                                <i class="flaticon flaticon-account-balance icon-md" aria-hidden="true"></i>
                                                <label for="zoomBanco_${instanceId}">Banco</label>
                                                <input type="text" class="form-control" name="zoomBanco" id="zoomBanco_${instanceId}" readonly>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="form-field col-xs-2 col-sm-2 col-md-2 col-lg-2">
                                        <div class="form-input">
                                            <div class="form-group">
                                                <i class="flaticon flaticon-account-balance icon-md" aria-hidden="true"></i>
                                                <label for="zoomAgencia_${instanceId}">Agência</label>
                                                <input type="text" class="form-control" name="zoomAgencia" id="zoomAgencia_${instanceId}" readonly>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="form-field col-xs-2 col-sm-2 col-md-2 col-lg-2">
                                        <div class="form-input">
                                            <div class="form-group">
                                                <i class="flaticon flaticon-account-balance icon-md" aria-hidden="true"></i>
                                                <label for="zoomConta_${instanceId}">Conta</label>
                                                <input type="text" class="form-control" name="zoomConta" id="zoomConta_${instanceId}" readonly>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="form-field col-xs-2 col-sm-2 col-md-2 col-lg-2">
                                        <div class="form-input">
                                            <div class="form-group">
                                                <i class="flaticon flaticon-account-balance icon-md" aria-hidden="true"></i>
                                                <label for="zoomDigito_${instanceId}">Digito</label>
                                                <input type="text" class="form-control" name="zoomDigito" id="zoomDigito_${instanceId}" readonly>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="form-field col-xs-2 col-sm-2 col-md-2 col-lg-2">
                                        <div class="form-input">
                                            <div class="form-group">
                                                <i class="flaticon flaticon-person-card icon-md" aria-hidden="true"></i>
                                                <label for="zoomCPF_${instanceId}">CPF</label>
                                                <input type="text" class="form-control" name="zoomCPF" id="zoomCPF_${instanceId}" readonly>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- TABELA PAI FILHO DE DESPESAS -->
                        <div class="row" style="margin-top: 15px;">
                            <div class="col-md-12">
                                <div class="panel panel-default">
                                    <div class="panel-heading">
                                        <h3 class="panel-title">Lista de Despesas</h3>
                                    </div>
                                    <div class="panel-body">
                                        
                                        <!-- Inputs para digitar a nova despesa -->
                                        <div class="row" style="background: #f9f9f9; padding: 10px; border-radius: 5px; margin-bottom: 15px;">
                                            <div class="col-md-2">
                                                <div class="form-group">
                                                    <label for="tipoDespesa_${instanceId}">Despesa</label>
                                                    <select class="form-control" id="tipoDespesa_${instanceId}">
                                                        <option value="">Selecione...</option>
                                                        <option value="Alimentação">Alimentação</option>
                                                        <option value="Combustível">Combustível</option>
                                                        <option value="KM">KM</option>
                                                        <option value="Hospedagem">Hospedagem</option>
                                                        <option value="Outros">Outros</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div class="col-md-2">
                                                <div class="form-group">
                                                    <label for="dataDespesa_${instanceId}">Data</label>
                                                    <input type="date" class="form-control" id="dataDespesa_${instanceId}">
                                                </div>
                                            </div>
                                            <div class="col-md-2">
                                                <div class="form-group">
                                                    <label for="valorDespesa_${instanceId}" id="labelValor_${instanceId}">Valor (R$)</label>
                                                    <input type="text" class="form-control" id="valorDespesa_${instanceId}" placeholder="0,00">
                                                </div>
                                            </div>
                                            <div class="col-md-3">
                                                <div class="form-group">
                                                    <label for="justificativa_${instanceId}">Justificativa</label>
                                                    <input type="text" class="form-control" id="justificativa_${instanceId}" placeholder="Motivo...">
                                                </div>
                                            </div>
                                            <div class="col-md-2">
                                                <div class="form-group">
                                                    <label for="anexoDespesa_${instanceId}">Nota / Foto</label>
                                                    <input type="file" class="form-control" id="anexoDespesa_${instanceId}" accept="image/*,.pdf" style="padding: 5px;">
                                                </div>
                                            </div>
                                            <div class="col-md-1" style="padding-top: 25px;">
                                                <button type="button" class="btn btn-primary btn-block" data-adicionar-despesa title="Adicionar Despesa à Tabela">
                                                    <span class="flaticon flaticon-add-box icon-sm"></span>
                                                </button>
                                            </div>
                                        </div>

                                        <!-- Tabela que exibirá as despesas lançadas -->
                                        <div class="table-responsive">
                                            <table class="table table-bordered table-striped" id="tabelaPaiFilho_${instanceId}">
                                                <thead>
                                                    <tr>
                                                        <th>Tipo</th>
                                                        <th>Data</th>
                                                        <th>Justificativa</th>
                                                        <th>Anexo</th>
                                                        <th class="text-right">Valor (R$)</th>
                                                        <th class="text-center">Ação</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <!-- As linhas serão inseridas aqui via Javascript -->
                                                    <tr id="linhaVazia_${instanceId}"><td colspan="6" class="text-center text-muted">Nenhuma despesa lançada ainda.</td></tr>
                                                </tbody>
                                                <tfoot>
                                                    <tr>
                                                        <th colspan="4" class="text-right">TOTAL GERAL:</th>
                                                        <th class="text-right"><h4 style="margin:0;"><b id="totalDespesasStr_${instanceId}">R$ 0,00</b></h4></th>
                                                        <th></th>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="row">
                            <div class="col-md-12 text-right">
                                <button type="button" class="btn btn-success btn-lg" data-enviar-solicitacao>
                                    <span class="flaticon flaticon-send icon-sm"></span> Enviar Solicitação de Reembolso
                                </button>
                            </div>
                        </div>
                    </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Scripts necessários -->
    <script type="text/javascript" src="/portal/resources/style-guide/js/fluig-style-guide-filter.min.js" charset="utf-8"></script>
    <script type="text/javascript" src="/webdesk/vcXMLRPC.js"></script>
    <script type="text/javascript" src="/PainelReembolso/resources/js/PainelReembolso.js"></script>
</div>

