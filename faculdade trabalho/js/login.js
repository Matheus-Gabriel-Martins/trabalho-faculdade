"use strict";

const formularioLogin = document.getElementById("formulario-login");
const campoEmail = document.getElementById("email");
const campoSenha = document.getElementById("senha");
const botaoVisibilidade = document.getElementById("alternar-senha");
const mensagemErroEmail = document.getElementById("erro-email");
const mensagemErroSenha = document.getElementById("erro-senha");
const botaoEntrar = document.getElementById("botao-entrar");
const textoBotaoEntrar = botaoEntrar.querySelector(".texto-entrar");
const mensagemLogin = document.getElementById("mensagem-login");
const botoesSociais = [...document.querySelectorAll(".botao-social")];
const botaoCadastro = document.getElementById("botao-cadastro");

const PADRAO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TAMANHO_MINIMO_SENHA = 6;
const TEMPO_SIMULACAO_LOGIN = 900;
const TEMPO_ATE_HOME = 450;

function alternarVisibilidadeDaSenha() {
  const deveMostrarSenha = campoSenha.type === "password";

  campoSenha.type = deveMostrarSenha ? "text" : "password";
  botaoVisibilidade.setAttribute(
    "aria-label",
    deveMostrarSenha ? "Ocultar senha" : "Mostrar senha",
  );
  botaoVisibilidade.setAttribute("aria-pressed", String(deveMostrarSenha));
}

function definirErroDoCampo(campo, elementoMensagem, mensagem) {
  elementoMensagem.textContent = mensagem;
  campo.setAttribute("aria-invalid", String(Boolean(mensagem)));
}

function validarFormulario() {
  const emailInvalido = !PADRAO_EMAIL.test(campoEmail.value.trim());
  const senhaInvalida = campoSenha.value.length < TAMANHO_MINIMO_SENHA;

  definirErroDoCampo(
    campoEmail,
    mensagemErroEmail,
    emailInvalido ? "Digite um e-mail válido, como voce@exemplo.com." : "",
  );
  definirErroDoCampo(
    campoSenha,
    mensagemErroSenha,
    senhaInvalida
      ? `A senha precisa ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`
      : "",
  );

  if (emailInvalido) {
    campoEmail.focus();
  } else if (senhaInvalida) {
    campoSenha.focus();
  }

  return !emailInvalido && !senhaInvalida;
}

function limparErroAoDigitar(campo, elementoMensagem) {
  if (campo.getAttribute("aria-invalid") === "true") {
    definirErroDoCampo(campo, elementoMensagem, "");
  }
}

function avisarFuncionalidadePendente(mensagem) {
  mensagemLogin.textContent = mensagem;
}

// Esta simulação será substituída pela autenticação do backend.
function simularLogin() {
  formularioLogin.setAttribute("aria-busy", "true");
  botaoEntrar.disabled = true;
  textoBotaoEntrar.textContent = "Entrando…";
  mensagemLogin.textContent = "Validando seus dados…";

  window.setTimeout(() => {
    textoBotaoEntrar.textContent = "Entrar";
    mensagemLogin.textContent = "Login realizado! Abrindo a página inicial…";

    window.setTimeout(() => {
      window.location.assign("home.html");
    }, TEMPO_ATE_HOME);
  }, TEMPO_SIMULACAO_LOGIN);
}

botaoVisibilidade.addEventListener("click", alternarVisibilidadeDaSenha);
campoEmail.addEventListener("input", () => limparErroAoDigitar(campoEmail, mensagemErroEmail));
campoSenha.addEventListener("input", () => limparErroAoDigitar(campoSenha, mensagemErroSenha));

botoesSociais.forEach((botao) => {
  botao.addEventListener("click", () => {
    avisarFuncionalidadePendente(`O acesso com ${botao.dataset.provedor} será conectado em breve.`);
  });
});

botaoCadastro.addEventListener("click", () => {
  avisarFuncionalidadePendente("O cadastro será conectado em breve.");
});

formularioLogin.addEventListener("submit", (evento) => {
  evento.preventDefault();
  mensagemLogin.textContent = "";

  if (validarFormulario()) {
    simularLogin();
  }
});
