"use strict";

const { readFile } = require("node:fs/promises");
const { createServer } = require("node:http");
const { extname, join } = require("node:path");
const { abrirBanco } = require("./servidor/banco.cjs");
const { criarContas, erroHttp } = require("./servidor/contas.cjs");

const porta = Number(process.env.PORT ?? 4173);
const caminhoBanco = process.env.HELPCAT_BANCO || join(__dirname, "dados", "helpcat.sqlite");
const banco = abrirBanco(caminhoBanco);
const contas = criarContas(banco);

const tipos = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};
const arquivosPublicos = /^\/(?:index\.html|home\.html|login\.html|questionario\.html|resultados\.html|detalhes-racao\.html|css\/[\w-]+\.css|js\/[\w-]+\.js|assets\/(?:imagens\/)?[\w-]+\.(?:png|svg))$/;
const opcoesPerfil = {
  idade: ["filhote", "adulto", "idoso"],
  peso: ["ate-3", "3-a-5", "5-a-7", "acima-7"],
  castracao: ["castrado", "nao-castrado"],
  condicao: ["nenhuma", "urinaria", "peso", "sensibilidade", "renal"],
  tipo: ["seca", "umida", "ambas"],
  sabor: ["todos", "frango", "peixe", "carne"],
  preco: ["todos", "economica", "intermediaria", "premium"],
  regiao: ["centro", "norte", "sul", "leste", "oeste", "online"],
};
const selecionarRacoes = banco.prepare("SELECT dados FROM racoes ORDER BY posicao");
const selecionarRacao = banco.prepare("SELECT dados FROM racoes WHERE id = ?");
const selecionarFavoritos = banco.prepare("SELECT racao_id FROM favoritos WHERE usuario_id = ?");
const inserirFavorito = banco.prepare("INSERT INTO favoritos VALUES (?, ?) ON CONFLICT DO NOTHING");
const removerFavorito = banco.prepare("DELETE FROM favoritos WHERE usuario_id = ? AND racao_id = ?");
const selecionarPerfil = banco.prepare("SELECT respostas FROM perfis_gato WHERE usuario_id = ?");
const gravarPerfil = banco.prepare(`
  INSERT INTO perfis_gato (usuario_id, respostas) VALUES (?, ?)
  ON CONFLICT(usuario_id) DO UPDATE SET respostas = excluded.respostas
`);

function responderJson(resposta, dados, status = 200) {
  resposta.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  resposta.end(JSON.stringify(dados));
}

async function lerJson(requisicao) {
  const tipo = requisicao.headers["content-type"]?.split(";")[0]?.trim().toLowerCase();
  if (tipo !== "application/json") throw erroHttp(415, "Envie os dados em JSON.");
  const limite = 4096;
  if (Number(requisicao.headers["content-length"]) > limite) throw erroHttp(413, "Dados muito grandes.");

  const partes = [];
  let total = 0;
  for await (const parte of requisicao.iterator({ destroyOnReturn: false })) {
    total += parte.length;
    if (total > limite) throw erroHttp(413, "Dados muito grandes.");
    partes.push(parte);
  }

  try {
    const dados = JSON.parse(Buffer.concat(partes).toString("utf8"));
    if (dados && typeof dados === "object" && !Array.isArray(dados)) return dados;
  } catch {
    throw erroHttp(400, "Dados inválidos.");
  }
  throw erroHttp(400, "Dados inválidos.");
}

function exigirUsuario(requisicao) {
  const usuario = contas.usuarioDaSessao(requisicao);
  if (!usuario) throw erroHttp(401, "Entre na sua conta para continuar.");
  return usuario;
}

async function atenderApi(requisicao, resposta, caminho, origem) {
  const metodo = requisicao.method;
  if (metodo !== "GET" &&
      (requisicao.headers["sec-fetch-site"] === "cross-site" ||
       (requisicao.headers.origin && requisicao.headers.origin !== origem))) {
    throw erroHttp(403, "Origem da solicitação não autorizada.");
  }

  if (metodo === "POST" && ["/api/cadastro", "/api/login", "/api/sair"].includes(caminho)) {
    const dados = await lerJson(requisicao);
    if (caminho === "/api/sair") {
      contas.encerrarSessao(requisicao, resposta);
      return responderJson(resposta, { usuario: null });
    }
    const cadastrar = caminho === "/api/cadastro";
    const usuario = await contas.autenticar(dados, cadastrar);
    contas.iniciarSessao(requisicao, resposta, usuario);
    return responderJson(resposta, { usuario }, cadastrar ? 201 : 200);
  }

  if (metodo === "GET" && caminho === "/api/sessao") {
    return responderJson(resposta, { usuario: contas.usuarioDaSessao(requisicao) });
  }
  if (metodo === "GET" && caminho === "/api/racoes") {
    return responderJson(resposta, selecionarRacoes.all().map(({ dados }) => JSON.parse(dados)));
  }

  const [, idRacao] = caminho.match(/^\/api\/racoes\/([\w-]+)$/) ?? [];
  if (metodo === "GET" && idRacao) {
    const racao = selecionarRacao.get(idRacao);
    if (!racao) throw erroHttp(404, "Ração não encontrada.");
    return responderJson(resposta, JSON.parse(racao.dados));
  }

  if (metodo === "GET" && caminho === "/api/favoritos") {
    const usuario = exigirUsuario(requisicao);
    return responderJson(resposta, selecionarFavoritos.all(usuario.id).map(({ racao_id }) => racao_id));
  }

  const [, idFavorito] = caminho.match(/^\/api\/favoritos\/([\w-]+)$/) ?? [];
  if (metodo === "PUT" && idFavorito) {
    const usuario = exigirUsuario(requisicao);
    if (!selecionarRacao.get(idFavorito)) throw erroHttp(404, "Ração não encontrada.");
    const { favorito } = await lerJson(requisicao);
    if (typeof favorito !== "boolean") throw erroHttp(400, "Informe se a ração é favorita.");
    const operacao = favorito ? inserirFavorito : removerFavorito;
    operacao.run(usuario.id, idFavorito);
    return responderJson(resposta, { favorito });
  }

  if (caminho === "/api/perfil-gato" && ["GET", "PUT"].includes(metodo)) {
    const usuario = exigirUsuario(requisicao);
    if (metodo === "GET") {
      const perfil = selecionarPerfil.get(usuario.id);
      return responderJson(resposta, perfil ? JSON.parse(perfil.respostas) : null);
    }
    const dados = await lerJson(requisicao);
    const respostas = {};
    for (const [campo, opcoes] of Object.entries(opcoesPerfil)) {
      if (!opcoes.includes(dados[campo])) throw erroHttp(400, "Revise as respostas do questionário.");
      respostas[campo] = dados[campo];
    }
    gravarPerfil.run(usuario.id, JSON.stringify(respostas));
    return responderJson(resposta, respostas);
  }

  throw erroHttp(404, "Endereço da API não encontrado.");
}

async function atenderPagina(requisicao, resposta, caminho) {
  const arquivo = caminho === "/" ? "/index.html" : caminho;
  if (!["GET", "HEAD"].includes(requisicao.method) || !arquivosPublicos.test(arquivo)) {
    throw erroHttp(404, "Página não encontrada.");
  }
  if (arquivo === "/home.html" && !contas.usuarioDaSessao(requisicao)) {
    resposta.writeHead(303, { Location: "/login.html", "Cache-Control": "no-store" });
    return resposta.end();
  }

  let conteudo;
  try {
    conteudo = await readFile(join(__dirname, arquivo.slice(1)));
  } catch (erro) {
    if (erro.code === "ENOENT") throw erroHttp(404, "Arquivo não encontrado.");
    throw erro;
  }
  resposta.writeHead(200, {
    "Content-Type": tipos[extname(arquivo)],
    "Cache-Control": arquivo === "/home.html" ? "no-store" : "no-cache",
  });
  resposta.end(requisicao.method === "HEAD" ? undefined : conteudo);
}

const servidor = createServer(async (requisicao, resposta) => {
  resposta.setHeader("X-Content-Type-Options", "nosniff");
  resposta.setHeader("X-Frame-Options", "DENY");
  try {
    const host = requisicao.headers.host ?? "";
    if (!/^(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(host)) throw erroHttp(400, "Endereço inválido.");
    const origem = `http://${host.toLowerCase()}`;
    const { pathname } = new URL(requisicao.url, origem);
    if (pathname.startsWith("/api/")) {
      await atenderApi(requisicao, resposta, pathname, origem);
    } else {
      await atenderPagina(requisicao, resposta, pathname);
    }
  } catch (erro) {
    if (!erro.status) console.error(erro);
    responderJson(resposta, { mensagem: erro.status ? erro.message : "O servidor encontrou um erro. Tente novamente." }, erro.status ?? 500);
  }
});

servidor.listen(porta, "127.0.0.1", () => {
  console.log(`Help Cat disponível em http://127.0.0.1:${servidor.address().port}`);
});
