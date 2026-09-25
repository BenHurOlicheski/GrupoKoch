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
    dataset.addColumn("processId");

    var processId = "PENALIDADES";
    var status = "0";

    if (constraints != null) {
        for (var i = 0; i < constraints.length; i++) {
            if (constraints[i].fieldName == "processId") processId = constraints[i].initialValue;
            if (constraints[i].fieldName == "status") status = constraints[i].initialValue;
        }
    }

    try {
        // Fetch workflowProcess
        var c1 = DatasetFactory.createConstraint("processId", processId, processId, ConstraintType.MUST);
        var constraintsProcess = [c1];
        if (status != "" && status != null) {
            constraintsProcess.push(DatasetFactory.createConstraint("status", status, status, ConstraintType.MUST));
        }
        var dsProcess = DatasetFactory.getDataset("workflowProcess", ["processInstanceId", "requesterId", "startDate", "status", "processId"], constraintsProcess, ["processInstanceId"]);
        
        // Fetch processTask (Active)
        var c3 = DatasetFactory.createConstraint("processId", processId, processId, ConstraintType.MUST);
        var c4 = DatasetFactory.createConstraint("active", "true", "true", ConstraintType.MUST);
        var dsTask = DatasetFactory.getDataset("processTask", ["processTaskPK.processInstanceId", "choosedSequence", "colleagueId", "deadlineDate", "deadlineHour"], [c3, c4], null);

        // Hash map for tasks
        var taskMap = {};
        if (dsTask && dsTask.rowsCount > 0) {
            for (var j = 0; j < dsTask.rowsCount; j++) {
                var pid = String(dsTask.getValue(j, "processTaskPK.processInstanceId"));
                taskMap[pid] = {
                    state: dsTask.getValue(j, "choosedSequence"),
                    assignee: dsTask.getValue(j, "colleagueId"),
                    deadlineDate: dsTask.getValue(j, "deadlineDate"),
                    deadlineHour: dsTask.getValue(j, "deadlineHour")
                };
            }
        }

        // Loop process and build result
        if (dsProcess && dsProcess.rowsCount > 0) {
            for (var i = 0; i < dsProcess.rowsCount; i++) {
                var instId = String(dsProcess.getValue(i, "processInstanceId"));
                var task = taskMap[instId];
                
                var tState = task ? String(task.state) : "";
                var tAssig = task ? String(task.assignee) : "";
                var tDeadD = task ? String(task.deadlineDate) : "";
                var tDeadH = task ? String(task.deadlineHour) : "";
                var tDead = tDeadD ? (tDeadD + " " + tDeadH) : "";

                dataset.addRow([
                    instId,
                    String(dsProcess.getValue(i, "requesterId")),
                    String(dsProcess.getValue(i, "startDate")),
                    String(dsProcess.getValue(i, "status")),
                    tState,
                    tAssig,
                    tDead,
                    "",
                    String(dsProcess.getValue(i, "processId"))
                ]);
            }
        }
    } catch (e) {
        dataset.addRow(["ERROR", e.toString(), "", "", "", "", "", "", ""]);
    }
    
    return dataset;
}
