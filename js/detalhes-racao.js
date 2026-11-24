"use strict";

const parametrosPagina = new URLSearchParams(window.location.search);
const idProduto = parametrosPagina.get("produto");
const escapar = apiHelpCat.escaparHtml;

const blocoDetalhes = document.getElementById("detalhes-produto");
const avisoProdutoNaoEncontrado = document.getElementById("produto-nao-encontrado");
const statusDetalhes = document.getElementById("status-detalhes");
const CHAVE_CONSULTA_RESULTADOS = "consultaResultadosHelpCat";

function restaurarLinkDosResultados() {
  let consultaSalva = "";

  try {
    consultaSalva = sessionStorage.getItem(CHAVE_CONSULTA_RESULTADOS) ?? "";
  } catch {
    return;
  }

  if (!consultaSalva) return;

  const nomesPermitidos = new Set(["condicao", "fase", "tipo", "castrado", "sabor", "preco", "ordem", "favoritos"]);
  const consultaValidada = new URLSearchParams();

  new URLSearchParams(consultaSalva).forEach((valor, nome) => {
    if (nomesPermitidos.has(nome)) consultaValidada.set(nome, valor);
  });

  if (consultaValidada.size) {
    document.querySelector(".voltar-resultados").href = `resultados.html?${consultaValidada.toString()}`;
  }
}

function moeda(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function criarEmbalagem(produto) {
  return `
    <div class="embalagem-racao ${escapar(produto.classeEmbalagem)}" id="embalagem-detalhe">
      <span class="embalagem-racao__marca">${escapar(produto.marca)}</span>
      <strong class="embalagem-racao__nome">${escapar(produto.nome)}</strong>
      <span class="embalagem-racao__pata" aria-hidden="true">🐾</span>
    </div>
  `;
}

function preencherDetalhes(produto) {
  document.title = `${produto.marca} ${produto.nome} | Help Cat`;
  document.getElementById("imagem-principal-produto").innerHTML = criarEmbalagem(produto);
  document.getElementById("texto-recomendacao").textContent = produto.selo;
  document.getElementById("marca-produto").textContent = produto.marca;
  document.getElementById("nome-produto").textContent = produto.nome;
  document.getElementById("subtitulo-produto").textContent = produto.subtitulo;
  document.getElementById("descricao-produto").textContent = produto.descricao;
  document.getElementById("nota-produto").textContent = produto.avaliacao.toFixed(1);
  document.getElementById("avaliacoes-produto").textContent = `(${produto.quantidadeAvaliacoes})`;
  document.getElementById("estrelas-produto").textContent = "★★★★★";
  document.getElementById("estrelas-produto").setAttribute(
    "aria-label",
    `${produto.avaliacao} de 5 estrelas`,
  );
  document.getElementById("peso-produto").textContent = produto.peso;
  document.getElementById("preco-produto").textContent = moeda(produto.preco);
  document.getElementById("texto-composicao").textContent = produto.composicao;

  document.getElementById("beneficios-produto").innerHTML = produto.beneficios
    .map((beneficio) => `<li>${escapar(beneficio)}</li>`)
    .join("");

  document.getElementById("tabela-nutrientes").innerHTML = produto.nutrientes
    .map(([nutriente, quantidade]) => `<tr><th scope="row">${escapar(nutriente)}</th><td>${escapar(quantidade)}</td></tr>`)
    .join("");
}

function configurarGaleria() {
  const botoesMiniatura = [...document.querySelectorAll("[data-vista]")];

  botoesMiniatura.forEach((botao) => {
    botao.addEventListener("click", () => {
      botoesMiniatura.forEach((item) => {
        item.classList.remove("miniatura-produto--ativa");
        item.setAttribute("aria-pressed", "false");
      });

      botao.classList.add("miniatura-produto--ativa");
      botao.setAttribute("aria-pressed", "true");

      const embalagem = document.getElementById("embalagem-detalhe");
      embalagem.classList.remove("embalagem-racao--vista-lado", "embalagem-racao--vista-graos");

      if (botao.dataset.vista === "lado") embalagem.classList.add("embalagem-racao--vista-lado");
      if (botao.dataset.vista === "graos") embalagem.classList.add("embalagem-racao--vista-graos");
    });
  });
}

function ativarAba(botaoAtivo, deveFocar = true) {
  const botoesAbas = [...document.querySelectorAll('[role="tab"]')];
  const paineis = [...document.querySelectorAll('[role="tabpanel"]')];

  botoesAbas.forEach((botao) => {
    const estaAtivo = botao === botaoAtivo;
    botao.setAttribute("aria-selected", String(estaAtivo));
    botao.tabIndex = estaAtivo ? 0 : -1;
  });

  paineis.forEach((painel) => {
    painel.hidden = painel.id !== botaoAtivo.getAttribute("aria-controls");
  });

  if (deveFocar) botaoAtivo.focus();
}

function configurarAbas() {
  const botoesAbas = [...document.querySelectorAll('[role="tab"]')];

  botoesAbas.forEach((botao, indice) => {
    botao.addEventListener("click", () => ativarAba(botao, false));
    botao.addEventListener("keydown", (evento) => {
      let proximoIndice = indice;

      if (evento.key === "ArrowRight") proximoIndice = (indice + 1) % botoesAbas.length;
      if (evento.key === "ArrowLeft") proximoIndice = (indice - 1 + botoesAbas.length) % botoesAbas.length;
      if (evento.key === "Home") proximoIndice = 0;
      if (evento.key === "End") proximoIndice = botoesAbas.length - 1;

      if (proximoIndice !== indice) {
        evento.preventDefault();
        ativarAba(botoesAbas[proximoIndice]);
      }
    });
  });
}

async function carregarDetalhes() {
  restaurarLinkDosResultados();
  try {
    const produto = idProduto === null
      ? (await apiHelpCat.solicitar("racoes"))[0]
      : await apiHelpCat.solicitar(`racoes/${encodeURIComponent(idProduto)}`);
    statusDetalhes.hidden = true;
    if (!produto) {
      avisoProdutoNaoEncontrado.hidden = false;
      return;
    }
    preencherDetalhes(produto);
    configurarGaleria();
    configurarAbas();
    blocoDetalhes.hidden = false;
  } catch (erro) {
    if (erro.status === 404) {
      statusDetalhes.hidden = true;
      avisoProdutoNaoEncontrado.hidden = false;
    } else {
      statusDetalhes.hidden = false;
      statusDetalhes.textContent = erro.message;
    }
  }
}

document.getElementById("buscar-lojas").addEventListener("click", () => {
  document.getElementById("mensagem-lojas").textContent =
    "O Help Cat ainda não tem dados de lojas ou de estoque.";
});

carregarDetalhes();
