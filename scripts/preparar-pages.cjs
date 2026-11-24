"use strict";

const { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } = require("node:fs");
const { dirname, join, relative } = require("node:path");
const catalogo = require("../servidor/catalogo-inicial.cjs");

const raiz = join(__dirname, "..");
const destino = join(raiz, ".pages");
const paginas = [
  "index.html",
  "login.html",
  "home.html",
  "questionario.html",
  "resultados.html",
  "detalhes-racao.html",
];

function copiarArquivos(pasta, extensaoPermitida) {
  for (const entrada of readdirSync(pasta, { withFileTypes: true })) {
    const caminho = join(pasta, entrada.name);
    if (entrada.isDirectory()) {
      copiarArquivos(caminho, extensaoPermitida);
    } else if (entrada.isFile() && extensaoPermitida.test(entrada.name)) {
      const destinoArquivo = join(destino, relative(raiz, caminho));
      mkdirSync(dirname(destinoArquivo), { recursive: true });
      copyFileSync(caminho, destinoArquivo);
    }
  }
}

mkdirSync(destino, { recursive: true });
for (const pagina of paginas) {
  const html = readFileSync(join(raiz, pagina), "utf8");
  writeFileSync(
    join(destino, pagina),
    html.replace("<head>", '<head>\n    <meta name="helpcat-modo" content="estatico">'),
  );
}

copiarArquivos(join(raiz, "css"), /\.css$/);
copiarArquivos(join(raiz, "js"), /\.js$/);
copiarArquivos(join(raiz, "assets"), /\.(png|svg)$/);
writeFileSync(join(destino, "catalogo.json"), JSON.stringify(catalogo));
console.log(`Versão estática pronta com ${catalogo.length} rações.`);
