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
let usuarioQuestionario;
let carregandoQuestionario = true;

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
  try {
    if (!usuarioQuestionario) sessionStorage.setItem(CHAVE_PERFIL, JSON.stringify(respostas));
  } catch {
    return false;
  }
  return true;
}

function lerRespostasVisitante() {
  try {
    return JSON.parse(sessionStorage.getItem(CHAVE_PERFIL));
  } catch {
    return null;
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
  if (carregandoQuestionario || !validarEtapaAtual()) return;

  salvarRespostas();
  mostrarEtapa(etapaAtual + 1);
});

botaoVoltar.addEventListener("click", () => {
  salvarRespostas();
  mostrarEtapa(etapaAtual - 1);
});

formularioQuestionario.addEventListener("input", () => {
  if (!carregandoQuestionario) mensagemQuestionario.textContent = "";
});

formularioQuestionario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  if (carregandoQuestionario || botaoResultados.disabled || !validarEtapaAtual()) return;

  if (etapaAtual < etapasQuestionario.length - 1) {
    botaoProxima.click();
    return;
  }
  botaoResultados.disabled = true;
  botaoVoltar.disabled = true;
  try {
    if (usuarioQuestionario) {
      const respostas = Object.fromEntries(new FormData(formularioQuestionario));
      await apiHelpCat.solicitar("perfil-gato", "PUT", respostas);
    } else if (!salvarRespostas()) {
      throw new Error("O navegador bloqueou o armazenamento da sessão. Entre para salvar suas respostas.");
    }
    window.location.assign("resultados.html");
  } catch (erro) {
    mensagemQuestionario.textContent = erro.message;
    botaoResultados.disabled = false;
    botaoVoltar.disabled = false;
  }
});

async function carregarQuestionario() {
  const campos = etapasQuestionario.flatMap((_, indice) => camposDaEtapa(indice));
  campos.forEach((campo) => { campo.disabled = true; });
  botaoProxima.disabled = true;
  mostrarEtapa(0, false);
  try {
    const { usuario } = await apiHelpCat.sessao();
    usuarioQuestionario = usuario;
    const respostas = usuario ? await apiHelpCat.solicitar("perfil-gato") : lerRespostasVisitante();
    for (const campo of campos) {
      if (typeof respostas?.[campo.name] === "string") campo.value = respostas[campo.name];
      campo.disabled = false;
    }
    carregandoQuestionario = false;
    botaoProxima.disabled = false;
  } catch (erro) {
    mensagemQuestionario.textContent = erro.message;
  }
}

carregarQuestionario();
