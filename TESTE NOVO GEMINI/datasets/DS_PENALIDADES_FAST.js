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

    var processId = "PENALIDADES"; // Pode ser sobrescrito pelo filter
    var statusParaApi = "";
    
    if (constraints != null) {
        for (var c = 0; c < constraints.length; c++) {
            if (constraints[c].fieldName == "status") {
                statusParaApi = String(constraints[c].initialValue);
            }
            if (constraints[c].fieldName == "processId") {
                processId = String(constraints[c].initialValue);
            }
        }
    }

    var connection = null;
    var stmt = null;
    var rs = null;

    try {
        var context = new javax.naming.InitialContext();
        var ds = context.lookup("java:/jdbc/AppDS");
        connection = ds.getConnection();
        
        var sql = "SELECT " +
                  "  p.NUM_PROCES, " +
                  "  p.START_DATE, " +
                  "  p.STATUS, " +
                  "  p.COD_MATR_REQUISIT, " +
                  "  p.NR_DOCUMENTO_CARD, " +
                  "  t.CD_MATRICULA AS RESPONSAVEL, " +
                  "  t.DEADLINE, " +
                  "  h.NUM_SEQ_ESTADO " +
                  "FROM PROCES_WORKFLOW p " +
                  "LEFT JOIN TAR_PROCES t ON p.NUM_PROCES = t.NUM_PROCES AND t.LOG_ATIV = 1 " +
                  "LEFT JOIN HISTOR_PROCES h ON t.NUM_PROCES = h.NUM_PROCES AND t.NUM_SEQ_MOVTO = h.NUM_SEQ_MOVTO AND h.LOG_ATIV = 1 " +
                  "WHERE p.COD_DEF_PROCES = ?";

        if (statusParaApi !== "") {
            sql += " AND p.STATUS = ?";
        }
        
        sql += " ORDER BY p.NUM_PROCES DESC LIMIT 2000";

        stmt = connection.prepareStatement(sql);
        stmt.setString(1, processId);
        
        if (statusParaApi !== "") {
            stmt.setInt(2, parseInt(statusParaApi, 10));
        }

        rs = stmt.executeQuery();
        
        var dateFormatter = new java.text.SimpleDateFormat("dd/MM/yyyy HH:mm");

        while (rs.next()) {
            var numProces = String(rs.getInt("NUM_PROCES"));
            var req = String(rs.getString("COD_MATR_REQUISIT") || "");
            var statusInt = rs.getInt("STATUS");
            var stStr = "OPEN";
            if (statusInt === 1) stStr = "CANCELED";
            else if (statusInt === 2) stStr = "COMPLETED";
            
            var startDateRaw = rs.getTimestamp("START_DATE");
            var sd = startDateRaw ? dateFormatter.format(startDateRaw) : "";
            
            var deadlineRaw = rs.getTimestamp("DEADLINE");
            var dead = deadlineRaw ? dateFormatter.format(deadlineRaw) : "";
            
            var resp = String(rs.getString("RESPONSAVEL") || "");
            var taskSt = String(rs.getString("NUM_SEQ_ESTADO") || "");
            
            var formId = "0";
            try {
                formId = String(rs.getInt("NR_DOCUMENTO_CARD") || "0");
            } catch(e2) {
                // Ignore if column missing
            }
            
            dataset.addRow([
                numProces, req, sd, stStr, taskSt, resp, dead, "", formId, processId
            ]);
        }
        
    } catch (e) {
        dataset.addRow(["ERRO", e.toString(), "", "", "", "", "", "", "", ""]);
    } finally {
        if (rs != null) try { rs.close(); } catch(e) {}
        if (stmt != null) try { stmt.close(); } catch(e) {}
        if (connection != null) try { connection.close(); } catch(e) {}
    }

    return dataset;
}
