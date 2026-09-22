function createDataset(fields, constraints, sortFields) {
    var dataset = DatasetBuilder.newDataset();
    dataset.addColumn("datasetId");
    dataset.addColumn("description");
    
    try {
        var ds = DatasetFactory.getDataset("dataset", null, null, null);
        for (var i = 0; i < ds.rowsCount; i++) {
            var dsId = ds.getValue(i, "datasetId");
            if (dsId.toLowerCase().indexOf("process") !== -1 || dsId.toLowerCase().indexOf("form") !== -1 || dsId.toLowerCase().indexOf("field") !== -1) {
                dataset.addRow([dsId, ds.getValue(i, "datasetDescription")]);
            }
        }
    } catch(e) {
        dataset.addRow(["error", e.message]);
    }
    return dataset;
}

