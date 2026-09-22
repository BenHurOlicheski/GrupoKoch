function createDataset(fields, constraints, sortFields) {
    var dataset = DatasetBuilder.newDataset();
    dataset.addColumn("processInstanceId");
    dataset.addColumn("atividade");
    dataset.addColumn("error");

    var processId = "padraoJuridicoPenalidades";
    
    if (constraints != null) {
        for (var i = 0; i < constraints.length; i++) {
            if (constraints[i].fieldName == "processId") {
                processId = constraints[i].initialValue;
            }
        }
    }

    var connection = null;
    var statement = null;
    var rs = null;
    
    try {
        var context = new javax.naming.InitialContext();
        var dataSource = context.lookup("java:/jdbc/FluigDS");
        connection = dataSource.getConnection();
        
        var sql = "SELECT w.NUM_PROCES, e.NOM_ESTADO " +
                  "FROM PROCES_WORKFLOW w " +
                  "JOIN TAR_PROCES t ON t.NUM_PROCES = w.NUM_PROCES AND t.LOG_ATIV = 1 " +
                  "JOIN HISTOR_PROCES h ON h.NUM_PROCES = t.NUM_PROCES AND h.NUM_SEQ_MOVTO = t.NUM_SEQ_MOVTO AND h.LOG_ATIV = t.LOG_ATIV " +
                  "JOIN ESTADO_PROCES e ON e.NUM_SEQ = h.NUM_SEQ_ESTADO AND e.COD_DEF_PROCES = w.COD_DEF_PROCES " +
                  "WHERE w.STATUS = 0 AND w.ID_PROCES = ?";
                  
        statement = connection.prepareStatement(sql);
        statement.setString(1, processId);
        rs = statement.executeQuery();
        
        while (rs.next()) {
            dataset.addRow([
                String(rs.getInt("NUM_PROCES")),
                String(rs.getString("NOM_ESTADO")),
                ""
            ]);
        }
        
    } catch (e) {
        dataset.addRow(["", "", e.toString()]);
    } finally {
        if (rs != null) try { rs.close(); } catch(e) {}
        if (statement != null) try { statement.close(); } catch(e) {}
        if (connection != null) try { connection.close(); } catch(e) {}
    }
    
    return dataset;
}

