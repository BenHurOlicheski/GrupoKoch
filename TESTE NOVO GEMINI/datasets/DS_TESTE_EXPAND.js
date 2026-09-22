function createDataset(fields, constraints, sortFields) {
    var dataset = DatasetBuilder.newDataset();
    dataset.addColumn("response");
    var clientService = fluigAPI.getAuthorizeClientService();
    var data = {
        companyId: "1",
        serviceCode: "FluigRest",
        endpoint: "/process-management/api/v2/processes/Jur%C3%ADdico%20-%20Penalidades/requests?expand=requester,activeTask,activeTask.assignee&pageSize=1",
        method: "get"
    };
    try {
        var vo = clientService.invoke(JSON.stringify(data));
        dataset.addRow([vo.getResult()]);
    } catch(e) {
        dataset.addRow([e.toString()]);
    }
    return dataset;
}
