"use strict";

const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { mkdtempSync, readdirSync, rmdirSync, unlinkSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { test } = require("node:test");
const { DatabaseSync } = require("node:sqlite");

async function iniciarServidor(caminhoBanco) {
  const processo = spawn(process.execPath, [join(__dirname, "..", "servidor.cjs")], {
    env: { ...process.env, PORT: "0", HELPCAT_BANCO: caminhoBanco },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let saida = "";
  let erros = "";
  processo.stderr.on("data", (parte) => { erros += parte; });

  const endereco = await new Promise((resolve, reject) => {
    processo.once("error", reject);
    processo.once("exit", (codigo) => reject(new Error(`Servidor encerrou (${codigo}): ${erros}`)));
    processo.stdout.on("data", (parte) => {
      saida += parte;
      const origem = saida.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
      if (origem) resolve(origem);
    });
  });

  return {
    async pedir(caminho, { metodo = "GET", dados, cookie, origem = endereco } = {}) {
      return fetch(endereco + caminho, {
        method: metodo,
        redirect: "manual",
        headers: {
          ...(cookie && { Cookie: cookie }),
          ...(dados && { "Content-Type": "application/json", Origin: origem }),
        },
        body: dados && JSON.stringify(dados),
      });
    },
    async parar() {
      if (processo.exitCode !== null || processo.signalCode) return;
      const encerrou = once(processo, "exit");
      processo.kill();
      await encerrou;
    },
  };
}

function cookieDaResposta(resposta) {
  const cookie = resposta.headers.get("set-cookie");
  assert.match(cookie, /; HttpOnly; SameSite=Lax; Path=\//);
  return cookie.split(";")[0];
}

test("contas, catálogo, favoritos e perfil persistem e ficam separados por usuário", async () => {
  const pastaTemporaria = mkdtempSync(join(tmpdir(), "helpcat-teste-"));
  const caminhoBanco = join(pastaTemporaria, "teste.sqlite");
  let servidor;

  try {
    servidor = await iniciarServidor(caminhoBanco);
    assert.equal((await servidor.pedir("/home.html")).status, 303);
    assert.equal((await servidor.pedir("/api/favoritos")).status, 401);
    assert.equal((await servidor.pedir("/dados/helpcat.sqlite")).status, 404);
    assert.equal((await servidor.pedir("/servidor/esquema.sql")).status, 404);

    const racoes = await (await servidor.pedir("/api/racoes")).json();
    assert.ok(racoes.length > 0);
    const idRacao = racoes[0].id;
    const detalhes = await servidor.pedir(`/api/racoes/${idRacao}`);
    assert.deepEqual(await detalhes.json(), racoes[0]);
    assert.equal((await servidor.pedir("/api/racoes/desconhecida")).status, 404);

    const conta = { nome: "Ana", email: "ANA@example.com", senha: "Senha-do-teste-01" };
    const cadastro = await servidor.pedir("/api/cadastro", { metodo: "POST", dados: conta });
    assert.equal(cadastro.status, 201);
    assert.deepEqual(Object.keys((await cadastro.json()).usuario), ["id", "nome", "email"]);
    const cookie = cookieDaResposta(cadastro);
    assert.equal((await servidor.pedir("/home.html", { cookie })).status, 200);
    assert.equal((await servidor.pedir("/api/cadastro", { metodo: "POST", dados: conta })).status, 409);

    const perfil = {
      idade: "adulto", peso: "3-a-5", castracao: "castrado", condicao: "nenhuma",
      tipo: "ambas", sabor: "todos", preco: "todos", regiao: "centro",
    };
    assert.equal((await servidor.pedir("/api/perfil-gato", {
      metodo: "PUT", cookie, dados: { ...perfil, idade: "inválida" },
    })).status, 400);
    const perfilSalvo = await servidor.pedir("/api/perfil-gato", { metodo: "PUT", cookie, dados: perfil });
    assert.deepEqual(await perfilSalvo.json(), perfil);

    const caminhoFavorito = `/api/favoritos/${idRacao}`;
    const favoritar = { metodo: "PUT", cookie, dados: { favorito: true } };
    assert.equal((await servidor.pedir(caminhoFavorito, { ...favoritar, origem: "https://example.com" })).status, 403);
    assert.equal((await servidor.pedir(caminhoFavorito, favoritar)).status, 200);
    assert.equal((await servidor.pedir(caminhoFavorito, favoritar)).status, 200);

    await servidor.parar();
    servidor = await iniciarServidor(caminhoBanco);
    const banco = new DatabaseSync(caminhoBanco, { readOnly: true });
    try {
      const { senha_hash, senha_sal } = banco.prepare("SELECT senha_hash, senha_sal FROM usuarios").get();
      assert.notEqual(Buffer.from(senha_hash).toString(), conta.senha);
      assert.equal(senha_hash.length, 64);
      assert.equal(senha_sal.length, 16);
    } finally {
      banco.close();
    }

    assert.deepEqual(await (await servidor.pedir("/api/favoritos", { cookie })).json(), [idRacao]);
    assert.deepEqual(await (await servidor.pedir("/api/perfil-gato", { cookie })).json(), perfil);
    assert.equal((await servidor.pedir("/api/sair", { metodo: "POST", cookie, dados: {} })).status, 200);
    assert.equal((await servidor.pedir("/api/favoritos", { cookie })).status, 401);
    assert.equal((await servidor.pedir("/api/login", {
      metodo: "POST", dados: { ...conta, senha: "Senha-incorreta" },
    })).status, 401);
    const login = await servidor.pedir("/api/login", { metodo: "POST", dados: conta });
    assert.equal(login.status, 200);
    const novoCookie = cookieDaResposta(login);
    assert.notEqual(novoCookie, cookie);

    const outroCadastro = await servidor.pedir("/api/cadastro", {
      metodo: "POST", dados: { ...conta, nome: "José", email: "jose@example.com" },
    });
    assert.equal(outroCadastro.status, 201);
    const outroCookie = cookieDaResposta(outroCadastro);
    assert.deepEqual(await (await servidor.pedir("/api/favoritos", { cookie: outroCookie })).json(), []);
    assert.equal(await (await servidor.pedir("/api/perfil-gato", { cookie: outroCookie })).json(), null);

    const removido = await servidor.pedir(caminhoFavorito, {
      metodo: "PUT", cookie: novoCookie, dados: { favorito: false },
    });
    assert.equal(removido.status, 200);
    assert.deepEqual(await (await servidor.pedir("/api/favoritos", { cookie: novoCookie })).json(), []);
  } finally {
    await servidor?.parar();
    for (const arquivo of readdirSync(pastaTemporaria)) unlinkSync(join(pastaTemporaria, arquivo));
    rmdirSync(pastaTemporaria);
  }
});
