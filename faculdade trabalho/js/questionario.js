"use strict";

const formularioQuestionario = document.getElementById("formulario-questionario");
const etapasQuestionario = [...document.querySelectorAll(".etapa-questionario")];
const indicadoresEtapas = [...document.querySelectorAll("#indicadores-etapas li")];
const textoAndamento = document.getElementById("texto-andamento");
const mensagemQuestionario = document.getElementById("mensagem-questionario");
const botaoVoltar = document.getElementById("botao-voltar");
const botaoProxima = document.getElementById("botao-proxima");
const botaoResultados = document.getElementById("botao-resultados");

const CHAVE_PERFIL = "perfilHelpCat";
let etapaAtual = 0;

function camposDaEtapa(indice) {
  return [...etapasQuestionario[indice].querySelectorAll("select, input, textarea")];
}

function validarEtapaAtual() {
  const campos = camposDaEtapa(etapaAtual);
  const primeiroCampoInvalido = campos.find((campo) => !campo.checkValidity());

  if (!primeiroCampoInvalido) {
    mensagemQuestionario.textContent = "";
    return true;
  }

  mensagemQuestionario.textContent = "Preencha os dois campos antes de continuar.";
  primeiroCampoInvalido.reportValidity();
  primeiroCampoInvalido.focus();
  return false;
}

function salvarRespostas() {
  const respostas = Object.fromEntries(new FormData(formularioQuestionario));
  sessionStorage.setItem(CHAVE_PERFIL, JSON.stringify(respostas));
}

function carregarRespostasSalvas() {
  const respostasSalvas = sessionStorage.getItem(CHAVE_PERFIL);

  if (!respostasSalvas) return;

  try {
    const respostas = JSON.parse(respostasSalvas);

    Object.entries(respostas).forEach(([nome, valor]) => {
      const campo = formularioQuestionario.elements.namedItem(nome);
      if (campo) campo.value = valor;
    });
  } catch {
    sessionStorage.removeItem(CHAVE_PERFIL);
  }
}

function mostrarEtapa(indice, deveFocar = true) {
  etapaAtual = indice;

  etapasQuestionario.forEach((etapa, posicao) => {
    etapa.hidden = posicao !== etapaAtual;
  });

  indicadoresEtapas.forEach((indicador, posicao) => {
    if (posicao === etapaAtual) {
      indicador.setAttribute("aria-current", "step");
    } else {
      indicador.removeAttribute("aria-current");
    }
  });

  textoAndamento.textContent = `Pergunta ${etapaAtual + 1} de ${etapasQuestionario.length}`;
  botaoVoltar.hidden = etapaAtual === 0;
  botaoProxima.hidden = etapaAtual === etapasQuestionario.length - 1;
  botaoResultados.hidden = etapaAtual !== etapasQuestionario.length - 1;
  mensagemQuestionario.textContent = "";

  if (deveFocar) {
    etapasQuestionario[etapaAtual].querySelector("select, input, textarea")?.focus();
  }
}

botaoProxima.addEventListener("click", () => {
  if (!validarEtapaAtual()) return;

  salvarRespostas();
  mostrarEtapa(etapaAtual + 1);
});

botaoVoltar.addEventListener("click", () => {
  salvarRespostas();
  mostrarEtapa(etapaAtual - 1);
});

formularioQuestionario.addEventListener("input", () => {
  mensagemQuestionario.textContent = "";
});

formularioQuestionario.addEventListener("submit", (evento) => {
  evento.preventDefault();

  if (!validarEtapaAtual()) return;

  salvarRespostas();
  window.location.assign("resultados.html");
});

carregarRespostasSalvas();
mostrarEtapa(0, false);
