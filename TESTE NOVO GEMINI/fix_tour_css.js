const fs = require('fs');
const fileFront = 'wcm/widget/TESTEGEMINI/src/main/webapp/resources/js/TESTEGEMINI.js';
let contentFront = fs.readFileSync(fileFront, 'utf8');

const regex = /\.html\("\.custom-intro-tooltip \{.*appendTo\("head"\);/;
const replacement = .html(".custom-intro-tooltip { border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); min-width: 350px; } " +
                      ".introjs-button { border-radius: 4px !important; text-shadow: none !important; font-size: 13px !important; } " +
                      ".introjs-skipbutton { font-size: 12px !important; color: #888 !important; right: 10px !important; top: 10px !important; position: absolute !important; text-decoration: none !important; } " +
                      ".introjs-tooltiptext { font-size: 14px !important; padding: 20px !important; line-height: 1.4 !important; }")
                .appendTo("head");;

contentFront = contentFront.replace(regex, replacement);
fs.writeFileSync(fileFront, contentFront, 'utf8');
console.log("FIXED TOUR CSS");
