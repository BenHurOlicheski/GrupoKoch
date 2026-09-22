function createDataset(fields, constraints, sortFields) {
    var dataset = DatasetBuilder.newDataset();
    dataset.addColumn("COLUMN_NAME");
    var connection = null;
    var statement = null;
    var rs = null;
    try {
        var context = new javax.naming.InitialContext();
        var dataSource = context.lookup("java:/jdbc/FluigDS");
        connection = dataSource.getConnection();
        var sql = "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'PROCES_WORKFLOW'";
        statement = connection.prepareStatement(sql);
        rs = statement.executeQuery();
        while (rs.next()) {
            dataset.addRow([rs.getString("COLUMN_NAME")]);
        }
    } catch (e) {
        dataset.addRow([e.toString()]);
    } finally {
        if (rs != null) try { rs.close(); } catch(e){}
        if (statement != null) try { statement.close(); } catch(e){}
        if (connection != null) try { connection.close(); } catch(e){}
    }
    return dataset;
}
