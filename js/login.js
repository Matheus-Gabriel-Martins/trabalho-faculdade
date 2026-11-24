"use strict";

const formularioLogin = document.getElementById("formulario-login");
const campoNome = document.getElementById("nome");
const campoEmail = document.getElementById("email");
const campoSenha = document.getElementById("senha");
const botaoVisibilidade = document.getElementById("alternar-senha");
const botaoEntrar = document.getElementById("botao-entrar");
const textoBotaoEntrar = botaoEntrar.querySelector(".texto-entrar");
const mensagemLogin = document.getElementById("mensagem-login");
const linkAlternarConta = document.getElementById("botao-cadastro");
const parametrosLogin = new URLSearchParams(window.location.search);
const modoCadastro = parametrosLogin.get("modo") === "cadastro";
const rotasDeRetorno = new Set(["resultados.html", "questionario.html", "detalhes-racao.html"]);
const retornoSolicitado = parametrosLogin.get("retorno") ?? "";
const retornoLogin = rotasDeRetorno.has(retornoSolicitado.split("?")[0])
  ? retornoSolicitado
  : "home.html";
const textoAcao = modoCadastro ? "Criar conta" : "Entrar";
const camposLogin = modoCadastro ? [campoNome, campoEmail, campoSenha] : [campoEmail, campoSenha];

if (modoCadastro) {
  document.title = "Criar conta | Help Cat";
  document.getElementById("titulo-login").textContent = "Crie sua conta";
  document.getElementById("descricao-login").textContent = "Salve seus favoritos e as respostas sobre seu gato.";
  document.getElementById("grupo-nome").hidden = false;
  campoNome.disabled = false;
  campoNome.required = true;
  campoSenha.autocomplete = "new-password";
  document.getElementById("texto-alternar-conta").textContent = "Já tem uma conta?";
  linkAlternarConta.textContent = "Entre";
}

if (modoEstatico) {
  document.title = "Conheça o Help Cat";
  document.getElementById("titulo-login").textContent = "Conheça o Help Cat";
  document.getElementById("descricao-login").textContent = "Explore o catálogo e salve seus favoritos neste navegador.";
  formularioLogin.hidden = true;
  linkAlternarConta.closest("p").hidden = true;
  document.getElementById("aviso-pages").hidden = false;
}

textoBotaoEntrar.textContent = textoAcao;
const proximoModo = new URLSearchParams();
if (!modoCadastro) proximoModo.set("modo", "cadastro");
if (retornoLogin !== "home.html") proximoModo.set("retorno", retornoLogin);
linkAlternarConta.href = proximoModo.size ? `login.html?${proximoModo}` : "login.html";

function definirErro(campo, mensagem) {
  document.getElementById(`erro-${campo.id}`).textContent = mensagem;
  campo.setAttribute("aria-invalid", String(Boolean(mensagem)));
}

function validarCampos() {
  definirErro(campoNome, modoCadastro && campoNome.value.trim().length < 2 ? "Digite seu nome." : "");
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campoEmail.value.trim());
  definirErro(campoEmail, emailValido ? "" : "Digite um e-mail válido.");
  definirErro(campoSenha, campoSenha.value.length >= 8 ? "" : "Use pelo menos 8 caracteres.");
  const invalido = camposLogin.find((campo) => campo.getAttribute("aria-invalid") === "true");
  invalido?.focus();
  return !invalido;
}

botaoVisibilidade.addEventListener("click", () => {
  const mostrar = campoSenha.type === "password";
  campoSenha.type = mostrar ? "text" : "password";
  botaoVisibilidade.setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha");
  botaoVisibilidade.setAttribute("aria-pressed", String(mostrar));
});

for (const campo of camposLogin) {
  campo.addEventListener("input", () => {
    definirErro(campo, "");
    mensagemLogin.textContent = "";
  });
}

formularioLogin.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  if (botaoEntrar.disabled || !validarCampos()) return;

  const dados = Object.fromEntries(new FormData(formularioLogin));
  mensagemLogin.textContent = "";
  formularioLogin.setAttribute("aria-busy", "true");
  botaoEntrar.disabled = true;
  textoBotaoEntrar.textContent = modoCadastro ? "Criando conta…" : "Entrando…";
  try {
    await apiHelpCat.solicitar(modoCadastro ? "cadastro" : "login", "POST", dados);
    window.location.assign(retornoLogin);
  } catch (erro) {
    mensagemLogin.textContent = erro.message;
    formularioLogin.removeAttribute("aria-busy");
    botaoEntrar.disabled = false;
    textoBotaoEntrar.textContent = textoAcao;
    mensagemLogin.focus();
  }
});
