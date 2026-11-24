"use strict";

const { mkdirSync, readFileSync } = require("node:fs");
const { dirname, join } = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const catalogoInicial = require("./catalogo-inicial.cjs");

function abrirBanco(caminho) {
  if (caminho !== ":memory:") mkdirSync(dirname(caminho), { recursive: true });

  const banco = new DatabaseSync(caminho, { timeout: 3000 });
  banco.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
  banco.exec(readFileSync(join(__dirname, "esquema.sql"), "utf8"));

  const inserirRacao = banco.prepare(
    "INSERT INTO racoes (id, posicao, dados) VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING",
  );
  banco.exec("BEGIN");
  try {
    catalogoInicial.forEach((racao, posicao) => inserirRacao.run(racao.id, posicao, JSON.stringify(racao)));
    banco.exec("COMMIT");
  } catch (erro) {
    banco.exec("ROLLBACK");
    throw erro;
  }

  return banco;
}

module.exports = { abrirBanco };
