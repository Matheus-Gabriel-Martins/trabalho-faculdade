"use strict";

const { createHash, randomBytes, scrypt, timingSafeEqual } = require("node:crypto");
const { promisify } = require("node:util");

const derivarSenha = promisify(scrypt);
const OPCOES_SCRYPT = { N: 2 ** 17, r: 8, p: 1, maxmem: 160 * 1024 ** 2 };
const DURACAO_SESSAO = 60 * 60 * 24 * 7;
const NOME_COOKIE = "sessao_helpcat";
const FORMATO_TOKEN = /^[a-f0-9]{64}$/;
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SAL_PROVISORIO = randomBytes(16);
const HASH_PROVISORIO = randomBytes(64);

function erroHttp(status, mensagem) {
  return Object.assign(new Error(mensagem), { status });
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function tokenDaRequisicao(requisicao) {
  return requisicao.headers.cookie
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${NOME_COOKIE}=`))
    ?.slice(NOME_COOKIE.length + 1);
}

function configurarCookie(resposta, token, duracao) {
  resposta.setHeader(
    "Set-Cookie",
    `${NOME_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${duracao}`,
  );
}

function criarContas(banco) {
  const buscarEmail = banco.prepare("SELECT * FROM usuarios WHERE email = ?");
  const inserirUsuario = banco.prepare(
    "INSERT INTO usuarios (nome, email, senha_hash, senha_sal) VALUES (?, ?, ?, ?) RETURNING id",
  );
  const inserirSessao = banco.prepare("INSERT INTO sessoes VALUES (?, ?, ?)");
  const limparSessoes = banco.prepare("DELETE FROM sessoes WHERE expira_em <= ?");
  const apagarSessao = banco.prepare("DELETE FROM sessoes WHERE token_hash = ?");
  const buscarSessao = banco.prepare(`
    SELECT u.id, u.nome, u.email FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id
    WHERE s.token_hash = ? AND s.expira_em > ?
  `);
  let operacoesDeSenha = 0;
  let tentativas = 0;
  let inicioJanela = 0;

  async function calcularHash(senha, sal) {
    if (operacoesDeSenha >= 2) throw erroHttp(429, "Há muitos acessos simultâneos. Tente novamente em instantes.");
    operacoesDeSenha += 1;
    try {
      return await derivarSenha(senha, sal, 64, OPCOES_SCRYPT);
    } finally {
      operacoesDeSenha -= 1;
    }
  }

  function limitarTentativas() {
    const agora = Date.now();
    if (agora - inicioJanela >= 10 * 60 * 1000) {
      inicioJanela = agora;
      tentativas = 0;
    }
    if (tentativas >= 20) throw erroHttp(429, "Muitas tentativas de acesso. Tente novamente em alguns minutos.");
    tentativas += 1;
  }

  async function autenticar(dados, cadastrar) {
    limitarTentativas();
    const nome = typeof dados.nome === "string" ? dados.nome.trim() : "";
    const email = typeof dados.email === "string" ? dados.email.trim().toLowerCase() : "";
    const senha = dados.senha;

    if (email.length > 254 || !FORMATO_EMAIL.test(email)) throw erroHttp(400, "Digite um e-mail válido.");
    if (typeof senha !== "string" || senha.length < 8 || senha.length > 128) {
      throw erroHttp(400, "A senha deve ter entre 8 e 128 caracteres.");
    }

    if (cadastrar) {
      if (nome.length < 2 || nome.length > 80) throw erroHttp(400, "Digite um nome de 2 a 80 caracteres.");
      const sal = randomBytes(16);
      const hash = await calcularHash(senha, sal);
      try {
        const { id } = inserirUsuario.get(nome, email, hash, sal);
        return { id, nome, email };
      } catch (erro) {
        if (erro.errcode === 2067) throw erroHttp(409, "Já existe uma conta com esse e-mail. Entre para continuar.");
        throw erro;
      }
    }

    const usuario = buscarEmail.get(email);
    const hash = await calcularHash(senha, usuario?.senha_sal ?? SAL_PROVISORIO);
    const senhaCorreta = timingSafeEqual(hash, usuario?.senha_hash ?? HASH_PROVISORIO);
    if (!usuario || !senhaCorreta) throw erroHttp(401, "E-mail ou senha incorretos.");
    return { id: usuario.id, nome: usuario.nome, email: usuario.email };
  }

  function encerrarSessao(requisicao, resposta) {
    const token = tokenDaRequisicao(requisicao);
    if (FORMATO_TOKEN.test(token ?? "")) apagarSessao.run(hashToken(token));
    configurarCookie(resposta, "", 0);
  }

  function iniciarSessao(requisicao, resposta, usuario) {
    const agora = Date.now();
    const token = randomBytes(32).toString("hex");
    encerrarSessao(requisicao, resposta);
    limparSessoes.run(agora);
    inserirSessao.run(hashToken(token), usuario.id, agora + DURACAO_SESSAO * 1000);
    configurarCookie(resposta, token, DURACAO_SESSAO);
  }

  function usuarioDaSessao(requisicao) {
    const token = tokenDaRequisicao(requisicao);
    return FORMATO_TOKEN.test(token ?? "") ? buscarSessao.get(hashToken(token), Date.now()) ?? null : null;
  }

  return { autenticar, iniciarSessao, encerrarSessao, usuarioDaSessao };
}

module.exports = { criarContas, erroHttp };
