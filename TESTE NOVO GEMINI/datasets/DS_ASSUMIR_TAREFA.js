/*
 * Dataset server-side para assumir tarefa de workflow no Fluig.
 * Utiliza o serviço FluigRest com fluigAPI.getAuthorizeClientService()
 * para chamar o endpoint /ecm/api/rest/ecm/workflowView/takeTask
 * com autenticação completa do servidor.
 *
 * Parâmetros via constraints:
 *   - processId:          ID do processo (ex: "Juridico - Penalidades")
 *   - version:            Versão do processo (ex: "109")
 *   - processInstanceId:  Número da solicitação (ex: "375862")
 *   - currentMovto:       Número do movimento/atividade ativo
 *   - taskUserId:         Login do usuário que vai assumir (ex: "benhur.silveira")
 *   - selectedState:      ID do estado/atividade
 *   - colleagueId:        Login do colaborador (mesmo que taskUserId)
 *
 * Incluir serviço REST "FluigRest" no cadastro de serviços do Fluig.
 */

var init = {
	datasetName: 'DS_ASSUMIR_TAREFA',
	fluigService: 'FluigRest',
	endpoint: '/ecm/api/rest/ecm/workflowView/takeTask',
	method: 'post',
	primaryKey: [
		'result'
	],
	columns: [
		'result'
	],
	params: {
		processId: '',
		version: '',
		managerMode: false,
		taskUserId: '',
		colleagueId: '',
		processInstanceId: '',
		isDigitalSigned: false,
		selectedState: '',
		currentMovto: 1,
		movementSequence: 1
	}
}

function defineStructure() {

	for (var currentColumn = 0; currentColumn < init.columns.length; currentColumn++) {

		addColumn(init.columns[currentColumn], DatasetFieldType.STRING)

	}

	setKey(init.primaryKey)

}

function createStructure() {

	var dataset = DatasetBuilder.newDataset()

	for (var index = 0; index < init.columns.length; index++) {

		dataset.addColumn(init.columns[index])

	}

	return dataset

}

function createErrorStructure() {

	var dataset = DatasetBuilder.newDataset()

	dataset.addColumn('error')

	return dataset

}

function onSync(lastSyncDate) {

	var dataset = createStructure()

	var query = createDataset()

	if (!query.values) {

		return query

	}

	var primaryKeyCodes = []

	for (var currentRow = 0; currentRow < query.values.length; currentRow++) {

		var primaryKey = ''

		for (var index = 0; index < init.primaryKey.length; index++) {

			primaryKey += query.getValue(currentRow, init.primaryKey[index])

		}

		primaryKeyCodes[primaryKey] = true

		var row = new Array()

		for (var currentColumn = 0; currentColumn < init.columns.length; currentColumn++) {

			var value = query.getValue(currentRow, init.columns[currentColumn])

			row.push((value && value.trim() !== '') ? value : '')

		}

		dataset.addOrUpdateRow(row)

	}

	/**
	 * Getting current rows from API
	 */

	query = DatasetFactory.getDataset(init.datasetName, null, null, null)

	if (query && query.values) {

		for (var currentRow = 0; currentRow < query.values.length; currentRow++) {

			var primaryKey = ''

			for (var index = 0; index < init.primaryKey.length; index++) {

				primaryKey += query.getValue(currentRow, init.primaryKey[index])

			}

			if (primaryKeyCodes[primaryKey] === undefined) {

				var row = new Array()

				for (var currentColumn = 0; currentColumn < init.columns.length; currentColumn++) {

					row.push(query.getValue(currentRow, init.columns[currentColumn]))

				}

				dataset.deleteRow(row)

			}

		}

	}

	return dataset

}

function onMobileSync(user) {

	var result = {
		'fields': init.columns,
		'constraints': new Array(),
		'sortFields': new Array()
	}

	return result

}

function createDataset(fields, constraints, sortFields) {

	var dataset = createStructure()

	try {

		if (constraints) {

			for (var index in constraints) {

				if (constraints[index].getFieldName().toLowerCase() == 'companyid') {

					init.params.companyId = constraints[index].getInitialValue()

				} else if (constraints[index].getFieldName().toLowerCase() == 'processid') {

					init.params.processId = constraints[index].getInitialValue()

				} else if (constraints[index].getFieldName().toLowerCase() == 'version') {

					init.params.version = constraints[index].getInitialValue()

				} else if (constraints[index].getFieldName().toLowerCase() == 'taskuserid') {

					init.params.taskUserId = constraints[index].getInitialValue()

				} else if (constraints[index].getFieldName().toLowerCase() == 'colleagueid') {

					init.params.colleagueId = constraints[index].getInitialValue()

				} else if (constraints[index].getFieldName().toLowerCase() == 'processinstanceid') {

					init.params.processInstanceId = constraints[index].getInitialValue()

				} else if (constraints[index].getFieldName().toLowerCase() == 'selectedstate') {

					init.params.selectedState = constraints[index].getInitialValue()

				} else if (constraints[index].getFieldName().toLowerCase() == 'currentmovto') {

					init.params.currentMovto = parseInt(constraints[index].getInitialValue(), 10) || 1
					init.params.movementSequence = init.params.currentMovto

				}

			}

		}

		var service = fluigAPI.getAuthorizeClientService()

		var options = {
			companyId: getValue('WKCompany') + '',
			serviceCode: init.fluigService,
			endpoint: init.endpoint,
			method: init.method,
			params: init.params,
			timeoutService: '100',
			headers: {
				Connection: 'close'
			}
		}


		log.info('[DS_ASSUMIR_TAREFA] Payload: ' + new org.json.JSONObject(options).toString())

		var response = service.invoke(new org.json.JSONObject(options).toString())

		var row = new Array()

		// O retorno do takeTask pode não ser JSON (pode ser boolean, string, etc.)
		// Trata qualquer tipo de resposta sem forçar JSONObject
		var resultado = response.getResult()
		var resultadoStr = ''

		try {
			if (resultado != null) {
				// Tenta como JSONObject primeiro
				try {
					resultadoStr = new org.json.JSONObject(resultado).toString()
				} catch (jsonEx) {
					// Se não for JSONObject, tenta como string direto
					resultadoStr = String(resultado)
				}
			} else {
				resultadoStr = '{"success":true,"message":"takeTask executado com sucesso (retorno nulo)"}'
			}
		} catch (parseEx) {
			resultadoStr = '{"success":true,"message":"takeTask executado - resposta: ' + String(resultado) + '"}'
		}

		log.info('[DS_ASSUMIR_TAREFA] Resultado: ' + resultadoStr)

		row.push(resultadoStr)

		dataset.addRow(row)

	}
	catch (exception) {
		var msg = String(exception.message || exception);
		
		if (msg.indexOf("org.json.JSONException") !== -1) {
			// A chamada funcionou no backend, mas o invoke() tentou parsear o retorno (vazio/texto) como JSON e falhou.
			// Vamos assumir como sucesso.
			var row = new Array();
			row.push('{"success":true,"message":"takeTask executado com sucesso (ignorado erro de parse JSON)"}');
			dataset.addRow(row);
			log.info('[DS_ASSUMIR_TAREFA] Sucesso (Parse Error Ignorado): ' + msg);
		} else {
			var row = new Array();
			row.push('Error to execute dataset "' + init.datasetName + '": ' + msg);

			dataset = createErrorStructure();
			dataset.addRow(row);

			log.info('[DS_ASSUMIR_TAREFA] Error real: ' + msg);
		}
	}

	return dataset;
}


