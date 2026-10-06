function createDataset(fields, constraints, sortFields) {
    var dataset = DatasetBuilder.newDataset();
    dataset.addColumn("processInstanceId");
    dataset.addColumn("requesterId");
    dataset.addColumn("startDate");
    dataset.addColumn("status");
    dataset.addColumn("taskState");
    dataset.addColumn("assignee");
    dataset.addColumn("deadline");
    dataset.addColumn("ocorrencia");
    dataset.addColumn("formRecordId");
    dataset.addColumn("processId");

    var processId = "PENALIDADES";
    var statusParaApi = "";
    
    if (constraints != null) {
        for (var c = 0; c < constraints.length; c++) {
            if (constraints[c].fieldName == "status") {
                statusParaApi = constraints[c].initialValue;
            }
        }
    }

    try {
        var consProcess = [];
        consProcess.push(DatasetFactory.createConstraint("processId", processId, processId, ConstraintType.MUST));
        
        // Em Dataset workflowProcess o status e: 0 (Aberto), 1 (Cancelado), 2 (Finalizado)
        if (statusParaApi !== "") {
            consProcess.push(DatasetFactory.createConstraint("status", statusParaApi, statusParaApi, ConstraintType.MUST));
        }
        
        var dsProcess = DatasetFactory.getDataset("workflowProcess", 
            ["processInstanceId", "requesterId", "startDateProcess", "status", "cardDocumentId"], 
            consProcess, 
            ["processInstanceId;desc"]);
            
        if (!dsProcess || dsProcess.rowsCount === 0) {
            return dataset;
        }
        
        // Coletar ate 500 para evitar timeout de memoria em base grande
        var max = dsProcess.rowsCount > 500 ? 500 : dsProcess.rowsCount;
        var pids = [];
        var pidsMap = {};
        
        for (var i = 0; i < max; i++) {
            var pid = String(dsProcess.getValue(i, "processInstanceId"));
            pids.push(pid);
            
            var dtRaw = String(dsProcess.getValue(i, "startDateProcess") || ""); 
            var startDateFormatted = dtRaw;
            if (dtRaw.length > 10) {
                var d = dtRaw.split(" ")[0].split("-");
                if (d.length == 3) startDateFormatted = d[2] + "/" + d[1] + "/" + d[0] + " " + dtRaw.split(" ")[1].substring(0,5);
            }
            
            var st = String(dsProcess.getValue(i, "status"));
            var stateString = "OPEN";
            if (st == "1") stateString = "CANCELED";
            else if (st == "2") stateString = "COMPLETED";
            
            pidsMap[pid] = {
                req: String(dsProcess.getValue(i, "requesterId") || ""),
                date: startDateFormatted,
                status: stateString,
                formId: String(dsProcess.getValue(i, "cardDocumentId") || ""),
                taskState: "",
                assignee: "",
                deadline: ""
            };
        }
        
        // Buscar tarefas ativas cruzando com array de IDs se possivel
        // O processTask n suporta processInstanceIdIn, mas como filtramos processId e active, eh super rapido
        var consTask = [];
        consTask.push(DatasetFactory.createConstraint("processId", processId, processId, ConstraintType.MUST));
        consTask.push(DatasetFactory.createConstraint("active", "true", "true", ConstraintType.MUST));
        
        var dsTask = DatasetFactory.getDataset("processTask", 
            ["processTaskPK.processInstanceId", "choosedSequence", "colleagueId", "deadlineDate", "deadlineHour"], 
            consTask, null);
            
        if (dsTask && dsTask.rowsCount > 0) {
            for (var t = 0; t < dsTask.rowsCount; t++) {
                var tPid = String(dsTask.getValue(t, "processTaskPK.processInstanceId"));
                if (pidsMap[tPid]) {
                    pidsMap[tPid].taskState = String(dsTask.getValue(t, "choosedSequence") || "");
                    pidsMap[tPid].assignee = String(dsTask.getValue(t, "colleagueId") || "");
                    
                    var dd = String(dsTask.getValue(t, "deadlineDate") || "");
                    var dh = String(dsTask.getValue(t, "deadlineHour") || "");
                    var dead = "";
                    if (dd) {
                        var dp = dd.split("-");
                        if (dp.length == 3) dead = dp[2] + "/" + dp[1] + "/" + dp[0] + " " + (dh.substring(0,5));
                    }
                    pidsMap[tPid].deadline = dead;
                }
            }
        }
        
        // Montar linhas finais ordenadas
        for (var i = 0; i < max; i++) {
            var pid = pids[i];
            var obj = pidsMap[pid];
            dataset.addRow([
                pid,
                obj.req,
                obj.date,
                obj.status,
                obj.taskState,
                obj.assignee,
                obj.deadline,
                "",
                obj.formId,
                processId
            ]);
        }
        
    } catch (e) {
        dataset.addRow(["ERRO", e.toString(), "", "", "", "", "", "", "", ""]);
    }
    
    return dataset;
}
