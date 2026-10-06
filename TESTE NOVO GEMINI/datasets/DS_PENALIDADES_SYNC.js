function onSync(lastSyncDate) {
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

    var connection = null;
    var statement = null;
    var rs = null;

    try {
        var context = new javax.naming.InitialContext();
        var dataSource = context.lookup("java:/jdbc/FluigDS");
        connection = dataSource.getConnection();

        // Consulta super leve via JDBC cruzando as tabelas nativas
        // TP_ANEXO = 0 traz o formulario
        // LOG_ATIV = 1 traz a tarefa ativa
        var sql = "SELECT p.NUM_PROCES, p.START_DATE, p.STATUS, p.COD_MATR_REQUISIT, " +
                  "p.NUM_SEQ_ESTADO, t.CD_MATRICULA, t.DEADLINE_DATE, t.DEADLINE_HOUR, " +
                  "a.NR_DOCUMENTO as FORM_RECORD_ID " +
                  "FROM PROCES_WORKFLOW p " +
                  "LEFT JOIN TAR_PROCES t ON p.COD_EMPRESA = t.COD_EMPRESA AND p.NUM_PROCES = t.NUM_PROCES AND t.LOG_ATIV = 1 " +
                  "LEFT JOIN ANEXO_PROCES a ON p.COD_EMPRESA = a.COD_EMPRESA AND p.NUM_PROCES = a.NUM_PROCES AND a.TP_ANEXO = 0 " +
                  "WHERE p.COD_DEF_PROCES = 'PENALIDADES'";
                  
        statement = connection.prepareStatement(sql);
        rs = statement.executeQuery();
        
        var qtd = 0;
        while (rs.next()) {
            var pid = rs.getString("NUM_PROCES");
            var status = rs.getInt("STATUS"); // 0=OPEN, 1=CANCELED, 2=COMPLETED
            var startDate = rs.getString("START_DATE");
            var req = rs.getString("COD_MATR_REQUISIT");
            
            var state = rs.getString("NUM_SEQ_ESTADO") || "";
            var asg = rs.getString("CD_MATRICULA") || "";
            var dd = rs.getString("DEADLINE") || "";
            var dh = "";
            var dead = dd ? (dd + " " + dh) : "";
            
            var formId = rs.getString("FORM_RECORD_ID") || "";

            dataset.addOrUpdateRow([
                String(pid),
                String(req),
                String(startDate),
                String(status),
                String(state),
                String(asg),
                String(dead),
                "",
                String(formId),
                "PENALIDADES"
            ]);
            qtd++;
        }
        
        log.info("[DS_PENALIDADES_SYNC] Sincronizacao via JDBC finalizada. Registros processados: " + qtd);
        
    } catch (e) {
        log.error("[DS_PENALIDADES_SYNC] ERRO: " + e.toString());
    } finally {
        if (rs != null) try { rs.close(); } catch(ex){}
        if (statement != null) try { statement.close(); } catch(ex){}
        if (connection != null) try { connection.close(); } catch(ex){}
    }
    
    return dataset;
}
