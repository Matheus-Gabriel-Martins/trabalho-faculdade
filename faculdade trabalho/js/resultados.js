"use strict";

const formularioFiltros = document.getElementById("formulario-filtros");
const painelFiltros = document.getElementById("painel-filtros");
const botaoAlternarFiltros = document.getElementById("alternar-filtros");
const botaoLimparFiltros = document.getElementById("limpar-filtros");
const botaoLimparFiltrosVazio = document.getElementById("limpar-filtros-vazio");
const gradeProdutos = document.getElementById("grade-produtos");
const contagemResultados = document.getElementById("contagem-resultados");
const mensagemSemResultados = document.getElementById("sem-resultados");
const ordenacaoResultados = document.getElementById("ordenacao-resultados");
const textoAlternarFiltros = document.getElementById("texto-alternar-filtros");
const tituloListaResultados = document.getElementById("titulo-lista-resultados");

const catalogoRacoes = window.catalogoRacoes ?? [];
const CHAVE_PERFIL = "perfilHelpCat";
const CHAVE_FAVORITOS = "favoritosHelpCat";
const CHAVE_CONSULTA_RESULTADOS = "consultaResultadosHelpCat";

const VALORES_PERMITIDOS = {
  condicao: new Set(["urinaria", "peso", "sensibilidade", "renal", "nenhuma"]),
  fase: new Set(["filhote", "adulto", "idoso"]),
  tipo: new Set(["seca", "umida"]),
  sabor: new Set(["todos", "frango", "peixe", "carne"]),
  preco: new Set(["todos", "economica", "intermediaria", "premium"]),
  ordem: new Set(["relevancia", "menor-preco", "maior-avaliacao"]),
};

function moeda(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function lerListaSalva(chave) {
  try {
    const valorSalvo = JSON.parse(localStorage.getItem(chave));
    return Array.isArray(valorSalvo) ? valorSalvo : [];
  } catch {
    return [];
  }
}

let favoritos = new Set(lerListaSalva(CHAVE_FAVORITOS));

function salvarFavoritos() {
  try {
    localStorage.setItem(CHAVE_FAVORITOS, JSON.stringify([...favoritos]));
  } catch {
    // A página continua funcionando quando o navegador bloqueia o armazenamento local.
  }
}

function criarEmbalagem(produto) {
  return `
    <div class="embalagem-racao ${produto.classeEmbalagem}" role="img" aria-label="Ilustração da embalagem ${produto.marca} ${produto.nome}">
      <span class="embalagem-racao__marca">${produto.marca}</span>
      <strong class="embalagem-racao__nome">${produto.nome}</strong>
      <span class="embalagem-racao__pata" aria-hidden="true">🐾</span>
    </div>
  `;
}

function criarCartaoProduto(produto) {
  const estaFavorito = favoritos.has(produto.id);

  return `
    <article class="cartao-produto" data-produto-id="${produto.id}">
      <div class="cartao-produto__topo">
        <span class="selo-produto ${produto.classeSelo}">${produto.selo}</span>
        <button
          class="botao-favorito"
          type="button"
          aria-label="${estaFavorito ? "Remover" : "Adicionar"} ${produto.nome} dos favoritos"
          aria-pressed="${estaFavorito}"
          data-favorito="${produto.id}"
        >${estaFavorito ? "♥" : "♡"}</button>
      </div>
      <div class="cartao-produto__imagem">${criarEmbalagem(produto)}</div>
      <h3>${produto.marca} ${produto.nome}</h3>
      <p class="cartao-produto__subtitulo">${produto.subtitulo}</p>
      <div class="avaliacao-produto">
        <span class="estrelas-produto" aria-label="${produto.avaliacao} de 5 estrelas">★★★★★</span>
        <strong>${produto.avaliacao.toFixed(1)}</strong>
        <span>(${produto.quantidadeAvaliacoes})</span>
      </div>
      <p class="cartao-produto__preco">
        ${moeda(produto.preco)}
        <small>${produto.peso} · valor demonstrativo</small>
      </p>
      <a class="cartao-produto__link" href="detalhes-racao.html?produto=${produto.id}">
        Ver mais detalhes <span aria-hidden="true">→</span>
      </a>
    </article>
  `;
}

function valoresMarcados(nome) {
  return [...formularioFiltros.querySelectorAll(`input[name="${nome}"]:checked`)].map(
    (campo) => campo.value,
  );
}

function filtrosAtuais() {
  return {
    condicoes: valoresMarcados("condicao"),
    fases: valoresMarcados("fase"),
    tipos: valoresMarcados("tipo"),
    castrado: Boolean(formularioFiltros.querySelector('input[name="castrado"]:checked')),
    sabor: formularioFiltros.elements.sabor.value,
    preco: formularioFiltros.elements.preco.value,
  };
}

function produtoCombina(produto, filtros) {
  const combinaCondicao =
    filtros.condicoes.length === 0 || filtros.condicoes.some((item) => produto.condicoes.includes(item));
  const combinaFase =
    filtros.fases.length === 0 || filtros.fases.some((item) => produto.fases.includes(item));
  const combinaTipo = filtros.tipos.length === 0 || filtros.tipos.includes(produto.tipo);
  const combinaCastracao = !filtros.castrado || produto.indicadaCastrados;
  const combinaSabor = filtros.sabor === "todos" || produto.sabor === filtros.sabor;
  const combinaPreco = filtros.preco === "todos" || produto.faixaPreco === filtros.preco;

  return combinaCondicao && combinaFase && combinaTipo && combinaCastracao && combinaSabor && combinaPreco;
}

function ordenarProdutos(produtos) {
  const produtosOrdenados = [...produtos];

  if (ordenacaoResultados.value === "menor-preco") {
    produtosOrdenados.sort((produtoA, produtoB) => produtoA.preco - produtoB.preco);
  }

  if (ordenacaoResultados.value === "maior-avaliacao") {
    produtosOrdenados.sort((produtoA, produtoB) => produtoB.avaliacao - produtoA.avaliacao);
  }

  return produtosOrdenados;
}

function atualizarEndereco(filtros) {
  const parametros = new URLSearchParams();

  if (filtros.condicoes.length) parametros.set("condicao", filtros.condicoes.join(","));
  if (filtros.fases.length) parametros.set("fase", filtros.fases.join(","));
  if (filtros.tipos.length) parametros.set("tipo", filtros.tipos.join(","));
  if (filtros.castrado) parametros.set("castrado", "sim");
  if (filtros.sabor !== "todos") parametros.set("sabor", filtros.sabor);
  if (filtros.preco !== "todos") parametros.set("preco", filtros.preco);
  if (ordenacaoResultados.value !== "relevancia") parametros.set("ordem", ordenacaoResultados.value);

  const novaUrl = parametros.size ? `?${parametros.toString()}` : window.location.pathname;
  window.history.replaceState({}, "", novaUrl);
  sessionStorage.setItem(CHAVE_CONSULTA_RESULTADOS, parametros.toString());
}

function renderizarProdutos() {
  const filtros = filtrosAtuais();
  const produtosFiltrados = ordenarProdutos(catalogoRacoes.filter((produto) => produtoCombina(produto, filtros)));

  gradeProdutos.innerHTML = produtosFiltrados.map(criarCartaoProduto).join("");
  gradeProdutos.hidden = produtosFiltrados.length === 0;
  mensagemSemResultados.hidden = produtosFiltrados.length > 0;
  contagemResultados.textContent = `${produtosFiltrados.length} ${produtosFiltrados.length === 1 ? "opção encontrada" : "opções encontradas"}.`;
  atualizarEndereco(filtros);
}

function marcarValor(nome, valor) {
  const campo = [...formularioFiltros.querySelectorAll(`input[name="${nome}"]`)].find(
    (item) => item.value === valor,
  );
  if (campo) campo.checked = true;
  return Boolean(campo);
}

function preencherPelosParametros() {
  const parametros = new URLSearchParams(window.location.search);
  let aplicouAlgumParametro = false;

  ["condicao", "fase", "tipo"].forEach((nome) => {
    parametros
      .get(nome)
      ?.split(",")
      .filter((valor) => VALORES_PERMITIDOS[nome].has(valor))
      .forEach((valor) => {
        aplicouAlgumParametro = marcarValor(nome, valor) || aplicouAlgumParametro;
      });
  });

  if (parametros.get("castrado") === "sim") {
    aplicouAlgumParametro = marcarValor("castrado", "sim") || aplicouAlgumParametro;
  }

  ["sabor", "preco"].forEach((nome) => {
    const valor = parametros.get(nome);
    if (valor && VALORES_PERMITIDOS[nome].has(valor)) {
      formularioFiltros.elements[nome].value = valor;
      aplicouAlgumParametro = true;
    }
  });

  const ordem = parametros.get("ordem");
  if (ordem && VALORES_PERMITIDOS.ordem.has(ordem)) {
    ordenacaoResultados.value = ordem;
    aplicouAlgumParametro = true;
  }

  return aplicouAlgumParametro;
}

function preencherPeloQuestionario() {
  const dadosSalvos = sessionStorage.getItem(CHAVE_PERFIL);
  if (!dadosSalvos) return;

  try {
    const perfil = JSON.parse(dadosSalvos);

    if (VALORES_PERMITIDOS.condicao.has(perfil.condicao)) marcarValor("condicao", perfil.condicao);
    if (VALORES_PERMITIDOS.fase.has(perfil.idade)) marcarValor("fase", perfil.idade);
    if (perfil.castracao === "castrado") marcarValor("castrado", "sim");
    if (perfil.tipo && perfil.tipo !== "ambas") marcarValor("tipo", perfil.tipo);
    if (VALORES_PERMITIDOS.sabor.has(perfil.sabor)) formularioFiltros.elements.sabor.value = perfil.sabor;
    if (VALORES_PERMITIDOS.preco.has(perfil.preco)) formularioFiltros.elements.preco.value = perfil.preco;
  } catch {
    sessionStorage.removeItem(CHAVE_PERFIL);
  }
}

function limparTodosOsFiltros() {
  formularioFiltros.reset();
  ordenacaoResultados.value = "relevancia";
  renderizarProdutos();
}

formularioFiltros.addEventListener("submit", (evento) => {
  evento.preventDefault();
  renderizarProdutos();

  if (window.matchMedia("(max-width: 760px)").matches) {
    painelFiltros.classList.remove("painel-filtros--aberto");
    botaoAlternarFiltros.setAttribute("aria-expanded", "false");
    textoAlternarFiltros.textContent = "Mostrar filtros";
    tituloListaResultados.focus();
  }
});

ordenacaoResultados.addEventListener("change", renderizarProdutos);
botaoLimparFiltros.addEventListener("click", limparTodosOsFiltros);
botaoLimparFiltrosVazio.addEventListener("click", limparTodosOsFiltros);

botaoAlternarFiltros.addEventListener("click", () => {
  const estaAberto = painelFiltros.classList.toggle("painel-filtros--aberto");
  botaoAlternarFiltros.setAttribute("aria-expanded", String(estaAberto));
  textoAlternarFiltros.textContent = estaAberto ? "Ocultar filtros" : "Mostrar filtros";
});

gradeProdutos.addEventListener("click", (evento) => {
  const botaoFavorito = evento.target.closest("[data-favorito]");
  if (!botaoFavorito) return;

  const idProduto = botaoFavorito.dataset.favorito;
  const produto = catalogoRacoes.find((item) => item.id === idProduto);

  if (favoritos.has(idProduto)) {
    favoritos.delete(idProduto);
  } else {
    favoritos.add(idProduto);
  }

  salvarFavoritos();
  const estaFavorito = favoritos.has(idProduto);
  botaoFavorito.textContent = estaFavorito ? "♥" : "♡";
  botaoFavorito.setAttribute("aria-pressed", String(estaFavorito));
  botaoFavorito.setAttribute(
    "aria-label",
    `${estaFavorito ? "Remover" : "Adicionar"} ${produto.nome} dos favoritos`,
  );
});

if (!preencherPelosParametros()) preencherPeloQuestionario();
renderizarProdutos();
