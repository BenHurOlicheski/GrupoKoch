const fs = require('fs');
const fileFront = 'wcm/widget/TESTEGEMINI/src/main/webapp/resources/js/TESTEGEMINI.js';
let contentFront = fs.readFileSync(fileFront, 'utf8');

const bindRegex = /\$\(document\)\.off\("click", "#btnExportarCsv"\)\.on\("click", "#btnExportarCsv", exportarCsv\);/;
const bindReplace = $(document).off("click", "#btnExportarCsv").on("click", "#btnExportarCsv", exportarCsv);\n        .off("click", "#btnTourGuiado").on("click", "#btnTourGuiado", iniciarTour);;
contentFront = contentFront.replace(bindRegex, bindReplace);

const initRegex = /function bindEventos\(\) \{/;
const initReplace = unction iniciarTour() {
        if (typeof introJs === "undefined") {
            console.error("Intro.js não carregado!");
            return;
        }

        var intro = introJs();
        intro.setOptions({
            nextLabel: 'Próximo',
            prevLabel: 'Anterior',
            skipLabel: 'Pular Tour',
            doneLabel: 'Entendi!',
            showProgress: true,
            showBullets: false,
            tooltipClass: 'custom-intro-tooltip',
            steps: [
                {
                    intro: "👋 Olá! Bem-vindo à sua nova Central de Tarefas personalizada. Vou te mostrar rapidamente como usar as novidades."
                },
                {
                    element: document.querySelector('#btnToggleBuscaAvancada'),
                    intro: "🔍 Aqui você pode abrir ou esconder o painel de filtros para liberar mais espaço na sua tela.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('.legenda-criticidades'),
                    intro: "🚦 Uma das grandes novidades! Você pode clicar direto nestas legendas para filtrar instantaneamente a tabela por criticidade (Alta, Média ou Baixa).",
                    position: 'left'
                },
                {
                    element: document.querySelector('#tblResultados thead'),
                    intro: "📊 Agora todas as colunas são ordenáveis! Basta clicar no título (como Data Inicial ou Responsável) para colocar em ordem crescente ou decrescente.",
                    position: 'bottom'
                },
                {
                    element: document.querySelector('#selItensPorPagina'),
                    intro: "⚙️ E aqui embaixo, você pode escolher quantas linhas quer ver por página na tela. O sistema vai carregar tudo rapidinho pra você!",
                    position: 'top'
                }
            ]
        });

        // Adiciona um estilo básico ao CSS se não existir
        if (#introJsCustomStyle.length === 0) {
            <style id='introJsCustomStyle'>
                .prop("type", "text/css")
                .html(".custom-intro-tooltip { border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); } .introjs-button { border-radius: 4px !important; }")
                .appendTo("head");
        }

        intro.start();
    }

    function bindEventos() {;
contentFront = contentFront.replace(initRegex, initReplace);

fs.writeFileSync(fileFront, contentFront, 'utf8');
console.log("ADDED TOUR");
