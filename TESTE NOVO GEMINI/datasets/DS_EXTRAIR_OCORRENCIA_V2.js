function createDataset(fields, constraints, sortFields) {
    var dataset = DatasetBuilder.newDataset();
    dataset.addColumn("ocorrencia");
    dataset.addColumn("cardId");
    dataset.addColumn("error");
    dataset.addColumn("nmDataset");
    dataset.addColumn("debug");

    var cardId = "";
    var cardIdIn = "";
    
    if (constraints != null) {
        for (var i = 0; i < constraints.length; i++) {
            if (constraints[i].fieldName == "cardId") {
                cardId = constraints[i].initialValue;
            } else if (constraints[i].fieldName == "cardIdIn") {
                cardIdIn = constraints[i].initialValue;
            }
        }
    }

    if (cardId == "" && cardIdIn == "") {
        dataset.addRow(["", "", "cardId ou cardIdIn obrigatorio", "", ""]);
        return dataset;
    }

    // Se passou cardIdIn, usa o primeiro ID para descobrir a tabela ML
    var firstCardId = cardId;
    var isBulk = false;
    if (cardIdIn != "") {
        isBulk = true;
        firstCardId = cardIdIn.split(",")[0];
    }

    var connection = null;
    var statement = null;
    var rs = null;
    
    try {
        var context = new javax.naming.InitialContext();
        var dataSource = context.lookup("java:/jdbc/FluigDS");
        connection = dataSource.getConnection();
        
        // Form records (instances) don't have NM_DATASET. Their parent (the form definition) has it!
        var sql = "SELECT A.COD_EMPRESA, A.NR_DOCUMENTO_PAI, B.NM_DATASET FROM DOCUMENTO A JOIN DOCUMENTO B ON A.NR_DOCUMENTO_PAI = B.NR_DOCUMENTO WHERE A.NR_DOCUMENTO = " + firstCardId;
        statement = connection.prepareStatement(sql);
        rs = statement.executeQuery();
        
        var nmDataset = "";
        var codEmpresa = 1;
        var nrDocumentoPai = 0;
        
        if (rs.next()) {
            nmDataset = rs.getString("NM_DATASET");
            codEmpresa = rs.getInt("COD_EMPRESA");
            nrDocumentoPai = rs.getInt("NR_DOCUMENTO_PAI");
        }
        
        rs.close();
        statement.close();
        
        if (!nmDataset || nmDataset == "") {
            // Tentativa 2: as vezes o próprio documento é o form
            var sql2 = "SELECT NM_DATASET, COD_EMPRESA, NR_DOCUMENTO FROM DOCUMENTO WHERE NR_DOCUMENTO = " + firstCardId;
            statement = connection.prepareStatement(sql2);
            rs = statement.executeQuery();
            if (rs.next()) {
                nmDataset = rs.getString("NM_DATASET");
                codEmpresa = rs.getInt("COD_EMPRESA");
                nrDocumentoPai = rs.getInt("NR_DOCUMENTO");
            }
            rs.close();
            statement.close();
            
            if (!nmDataset || nmDataset == "") {
                dataset.addRow(["", firstCardId, "Documento não tem NM_DATASET nem no pai", "", ""]);
                return dataset;
            }
        }

        // Tenta usar JDBC para acessar a tabela ML diretamente!
        // Tabela ML: ML + COD_EMPRESA (3 digitos) + NR_DOCUMENTO_PAI (3 digitos minimo)
        var strEmpresa = ("000" + codEmpresa).slice(-3);
        var strDoc = ("000" + nrDocumentoPai);
        if (nrDocumentoPai > 999) {
            strDoc = String(nrDocumentoPai);
        } else {
            strDoc = strDoc.slice(-3);
        }
        
        var mlTableCalculada = "ML" + strEmpresa + strDoc;
        
        // O usuário informou que as tabelas reais no banco são ml001211 ou ml001362!
        var possibleTables = ["ml001211", "ml001362", mlTableCalculada];
        var erroJdbc = "";
        
        for (var t = 0; t < possibleTables.length; t++) {
            var mlTable = possibleTables[t];
            try {
                var sqlData = "";
                if (isBulk) {
                    // Evita SQL Injection garantindo que só tem números e vírgulas
                    var safeIds = cardIdIn.replace(/[^0-9,]/g, '');
                    sqlData = "SELECT * FROM " + mlTable + " WHERE documentid IN (" + safeIds + ")";
                } else {
                    sqlData = "SELECT * FROM " + mlTable + " WHERE documentid = " + cardId;
                }
                
                statement = connection.prepareStatement(sqlData);
                rs = statement.executeQuery();
                var achouAlgo = false;
                
                while (rs.next()) {
                    achouAlgo = true;
                    var rd = "";
                    var cId = rs.getString("documentid");
                    try { rd = rs.getString("rdOcorrencia"); } catch(ex){}
                    if (!rd || rd == "" || rd == "null") {
                        try { rd = rs.getString("ocorrencia"); } catch(ex){}
                    }
                    dataset.addRow([String(rd || ""), String(cId), "", nmDataset, "Sucesso JDBC na Tabela " + mlTable]);
                }
                
                if (achouAlgo) {
                    return dataset; // Se achou registros, retorna imediatamente (funciona para bulk e single)
                } else {
                    erroJdbc += "[Tabela " + mlTable + " = 0 regs] ";
                }
            } catch (eML) {
                erroJdbc += "[Erro " + mlTable + ": " + eML.toString().substring(0, 50) + "] ";
            }
        }
        
        // Se JDBC falhou em todas, tenta via DatasetFactory com constraints!
        var c1 = DatasetFactory.createConstraint("documentid", cardId, cardId, ConstraintType.MUST);
        var dsForm = DatasetFactory.getDataset(nmDataset, null, [c1], null);
        if (dsForm && dsForm.rowsCount > 0) {
            for (var k = 0; k < dsForm.rowsCount; k++) {
                var docIdRow = String(dsForm.getValue(k, "metadata#id"));
                var docId2 = String(dsForm.getValue(k, "documentid"));
                if (docIdRow == cardId || docId2 == cardId) {
                    var rd = dsForm.getValue(k, "rdOcorrencia") || "";
                    if (!rd || rd == "" || rd == "null") {
                        rd = dsForm.getValue(k, "ocorrencia") || "";
                    }
                    dataset.addRow([String(rd), String(cardId), "", nmDataset, "Via DatasetFactory. " + erroJdbc]);
                    return dataset;
                }
            }
            dataset.addRow(["", String(cardId), "cardId nao encontrado no dataset " + nmDataset, nmDataset, erroJdbc]);
        } else {
            dataset.addRow(["", String(cardId), "dataset " + nmDataset + " retornou vazio", nmDataset, erroJdbc]);
        }
        
    } catch (e) {
        dataset.addRow(["", String(cardId), e.toString(), "", ""]);
    } finally {
        if (rs != null) try { rs.close(); } catch(e){}
        if (statement != null) try { statement.close(); } catch(e){}
        if (connection != null) try { connection.close(); } catch(e){}
    }

    return dataset;
}
