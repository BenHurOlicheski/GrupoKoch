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

    var connection = null;
    var statement = null;
    var rs = null;

    try {
        var context = new javax.naming.InitialContext();
        var dataSource = context.lookup("java:/jdbc/FluigDS");
        connection = dataSource.getConnection();

        // Consulta super leve via JDBC
        var sql = "SELECT p.NUM_PROCES, p.START_DATE, p.STATUS, p.COD_MATR_REQUISIT, " +
                  "h.NUM_SEQ_ESTADO, t.CD_MATRICULA, t.DEADLINE, " +
                  "a.NR_DOCUMENTO as FORM_RECORD_ID " +
                  "FROM PROCES_WORKFLOW p " +
                  "LEFT JOIN TAR_PROCES t ON p.COD_EMPRESA = t.COD_EMPRESA AND p.NUM_PROCES = t.NUM_PROCES AND t.LOG_ATIV = 1 " +
                  "LEFT JOIN HISTOR_PROCES h ON h.COD_EMPRESA = t.COD_EMPRESA AND h.NUM_PROCES = t.NUM_PROCES AND h.NUM_SEQ_MOVTO = t.NUM_SEQ_MOVTO AND h.LOG_ATIV = 1 " +
                  "LEFT JOIN ANEXO_PROCES a ON p.COD_EMPRESA = a.COD_EMPRESA AND p.NUM_PROCES = a.NUM_PROCES AND a.TP_ANEXO = 0 " +
                  "WHERE p.COD_DEF_PROCES = 'PENALIDADES'";
                  
        // Filtro de status se houver
        var statusFiltro = "";
        if (constraints != null) {
            for (var c = 0; c < constraints.length; c++) {
                if (constraints[c].fieldName == "status") {
                    statusFiltro = constraints[c].initialValue;
                    sql += " AND p.STATUS = " + statusFiltro;
                }
            }
        }
        
        sql += " ORDER BY p.NUM_PROCES DESC";
                  
        statement = connection.prepareStatement(sql);
        rs = statement.executeQuery();
        
        var maxRows = 500; // Protecao para nao travar o browser
        var qtd = 0;
        
        while (rs.next() && qtd < maxRows) {
            var pid = rs.getString("NUM_PROCES");
            var statusBanco = rs.getInt("STATUS"); // 0=OPEN, 1=CANCELED, 2=COMPLETED
            
            // Formatacao da data de inicio
            var dtRaw = rs.getString("START_DATE"); // 2024-09-30 13:48:00
            var startDateFormatted = dtRaw;
            if (dtRaw && dtRaw.length > 10) {
                var d = dtRaw.split(" ")[0].split("-");
                if (d.length == 3) startDateFormatted = d[2] + "/" + d[1] + "/" + d[0] + " " + dtRaw.split(" ")[1].substring(0,5);
            }
            
            var req = rs.getString("COD_MATR_REQUISIT");
            
            var state = rs.getString("NUM_SEQ_ESTADO") || "";
            var asg = rs.getString("CD_MATRICULA") || "";
            var dd = rs.getString("DEADLINE") || "";
            var dh = ""; // DEADLINE já tem a hora no banco
            var dead = "";
            if (dd) {
                var dp = dd.split("-");
                if (dp.length == 3) dead = dp[2] + "/" + dp[1] + "/" + dp[0] + " " + (dh.substring(0,5));
            }
            
            var formId = rs.getString("FORM_RECORD_ID") || "";
            
            // Conversao de status para formato amigavel do Widget
            var stateString = "OPEN";
            if (statusBanco == 1) stateString = "CANCELED";
            else if (statusBanco == 2) stateString = "COMPLETED";

            dataset.addRow([
                String(pid),
                String(req),
                String(startDateFormatted),
                String(stateString),
                String(state),
                String(asg),
                String(dead),
                "",
                String(formId),
                "PENALIDADES"
            ]);
            qtd++;
        }
        
    } catch (e) {
        dataset.addRow(["ERRO", e.toString(), "", "", "", "", "", "", "", ""]);
    } finally {
        if (rs != null) try { rs.close(); } catch(ex){}
        if (statement != null) try { statement.close(); } catch(ex){}
        if (connection != null) try { connection.close(); } catch(ex){}
    }
    
    return dataset;
}
