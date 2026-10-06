const fs = require('fs');
const fileFront = 'wcm/widget/TESTEGEMINI/src/main/webapp/resources/js/TESTEGEMINI.js';
let contentFront = fs.readFileSync(fileFront, 'utf8');

const regex = /position: 'bottom'\s*\},/;
const replacement = position: 'bottom'
                },
                {
                    element: document.querySelector('#tblResultados tbody tr:first-child td:last-child') || document.querySelector('#tblResultados thead th:last-child'),
                    intro: "🚀 <strong>Ações Rápidas</strong><br>A mágica acontece aqui! Você não precisa mais abrir tela por tela. É possível <strong>Assumir</strong>, <strong>Movimentar</strong> e até baixar os <strong>Anexos</strong> direto por estes botões na própria tabela.",
                    position: 'left'
                },;

contentFront = contentFront.replace(regex, replacement);
fs.writeFileSync(fileFront, contentFront, 'utf8');
console.log("ADDED STEP");
