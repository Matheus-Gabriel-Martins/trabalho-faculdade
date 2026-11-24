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
const mensagemResultados = document.getElementById("mensagem-resultados");
const escapar = apiHelpCat.escaparHtml;

let catalogoRacoes;
let usuarioCatalogo;
const CHAVE_PERFIL = "perfilHelpCat";
const CHAVE_FAVORITOS = "favoritosHelpCat";
const CHAVE_CONSULTA_RESULTADOS = "consultaResultadosHelpCat";
const apenasFavoritos = new URLSearchParams(window.location.search).get("favoritos") === "1";

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

const alteracoesFavoritos = new Set();
let favoritos = new Set();

function criarEmbalagem(produto) {
  return `
    <div class="embalagem-racao ${escapar(produto.classeEmbalagem)}" role="img" aria-label="Ilustração da embalagem ${escapar(produto.marca)} ${escapar(produto.nome)}">
      <span class="embalagem-racao__marca">${escapar(produto.marca)}</span>
      <strong class="embalagem-racao__nome">${escapar(produto.nome)}</strong>
      <span class="embalagem-racao__pata" aria-hidden="true">🐾</span>
    </div>
  `;
}

function rotuloFavorito(produto, estaFavorito) {
  return estaFavorito
    ? `Remover ${produto.nome} dos favoritos`
    : `Adicionar ${produto.nome} aos favoritos`;
}

function criarCartaoProduto(produto) {
  const estaFavorito = favoritos.has(produto.id);
  const id = escapar(produto.id);

  return `
    <article class="cartao-produto" data-produto-id="${id}">
      <div class="cartao-produto__topo">
        <span class="selo-produto ${escapar(produto.classeSelo)}">${escapar(produto.selo)}</span>
        <button
          class="botao-favorito"
          type="button"
          aria-label="${escapar(rotuloFavorito(produto, estaFavorito))}"
          aria-pressed="${estaFavorito}"
          data-favorito="${id}"
          ${alteracoesFavoritos.has(produto.id) ? 'aria-disabled="true"' : ""}
        >${estaFavorito ? "♥" : "♡"}</button>
      </div>
      <div class="cartao-produto__imagem">${criarEmbalagem(produto)}</div>
      <h3>${escapar(produto.marca)} ${escapar(produto.nome)}</h3>
      <p class="cartao-produto__subtitulo">${escapar(produto.subtitulo)}</p>
      <div class="avaliacao-produto">
        <span class="estrelas-produto" aria-label="${produto.avaliacao} de 5 estrelas">★★★★★</span>
        <strong>${produto.avaliacao.toFixed(1)}</strong>
        <span>(${escapar(produto.quantidadeAvaliacoes)})</span>
      </div>
      <p class="cartao-produto__preco">
        ${moeda(produto.preco)}
        <small>${escapar(produto.peso)} · valor demonstrativo</small>
      </p>
      <a class="cartao-produto__link" href="detalhes-racao.html?produto=${encodeURIComponent(produto.id)}">
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
  if (apenasFavoritos) parametros.set("favoritos", "1");

  const novaUrl = parametros.size ? `?${parametros.toString()}` : window.location.pathname;
  window.history.replaceState({}, "", novaUrl);
  try {
    sessionStorage.setItem(CHAVE_CONSULTA_RESULTADOS, parametros.toString());
  } catch {
    // Os filtros continuam na URL quando o armazenamento está bloqueado.
  }
}

function renderizarProdutos() {
  if (!catalogoRacoes) return;
  const filtros = filtrosAtuais();
  const produtosFiltrados = ordenarProdutos(catalogoRacoes.filter((produto) =>
    (!apenasFavoritos || favoritos.has(produto.id)) && produtoCombina(produto, filtros),
  ));

  gradeProdutos.innerHTML = produtosFiltrados.map(criarCartaoProduto).join("");
  gradeProdutos.hidden = produtosFiltrados.length === 0;
  mensagemSemResultados.hidden = produtosFiltrados.length > 0;
  const semFavoritos = apenasFavoritos && favoritos.size === 0;
  mensagemSemResultados.querySelector("h3").textContent = semFavoritos
    ? "Ainda não há favoritos"
    : "Nenhuma ração encontrada";
  mensagemSemResultados.querySelector("p").textContent = semFavoritos
    ? "Abra o catálogo e use o coração para salvar suas rações favoritas."
    : "Tente usar menos filtros para ver mais opções.";
  botaoLimparFiltrosVazio.hidden = semFavoritos;
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

function lerPerfilVisitante() {
  try {
    return JSON.parse(sessionStorage.getItem(CHAVE_PERFIL));
  } catch {
    return null;
  }
}

function preencherPeloQuestionario(perfil) {
  if (!perfil) return;
  if (VALORES_PERMITIDOS.condicao.has(perfil.condicao)) marcarValor("condicao", perfil.condicao);
  if (VALORES_PERMITIDOS.fase.has(perfil.idade)) marcarValor("fase", perfil.idade);
  if (perfil.castracao === "castrado") marcarValor("castrado", "sim");
  if (VALORES_PERMITIDOS.tipo.has(perfil.tipo)) marcarValor("tipo", perfil.tipo);
  if (VALORES_PERMITIDOS.sabor.has(perfil.sabor)) formularioFiltros.elements.sabor.value = perfil.sabor;
  if (VALORES_PERMITIDOS.preco.has(perfil.preco)) formularioFiltros.elements.preco.value = perfil.preco;
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

gradeProdutos.addEventListener("click", async (evento) => {
  const botaoFavorito = evento.target.closest("[data-favorito]");
  if (!botaoFavorito) return;

  const idProduto = botaoFavorito.dataset.favorito;
  if (alteracoesFavoritos.has(idProduto)) return;
  const produto = catalogoRacoes.find((item) => item.id === idProduto);
  const vaiFavoritar = !favoritos.has(idProduto);
  alteracoesFavoritos.add(idProduto);
  botaoFavorito.setAttribute("aria-disabled", "true");
  mensagemResultados.textContent = "";
  try {
    if (usuarioCatalogo) {
      await apiHelpCat.solicitar(`favoritos/${encodeURIComponent(idProduto)}`, "PUT", { favorito: vaiFavoritar });
    } else {
      const favoritosAtualizados = new Set(lerListaSalva(CHAVE_FAVORITOS));
      if (vaiFavoritar) favoritosAtualizados.add(idProduto);
      else favoritosAtualizados.delete(idProduto);
      localStorage.setItem(CHAVE_FAVORITOS, JSON.stringify([...favoritosAtualizados]));
    }
    if (vaiFavoritar) favoritos.add(idProduto);
    else favoritos.delete(idProduto);
  } catch (erro) {
    mensagemResultados.textContent = usuarioCatalogo
      ? erro.message
      : "Não foi possível salvar no navegador. Entre para salvar na sua conta.";
  } finally {
    alteracoesFavoritos.delete(idProduto);
  }

  const estaFavorito = favoritos.has(idProduto);
  const botaoAtual = [...gradeProdutos.querySelectorAll("[data-favorito]")]
    .find((botao) => botao.dataset.favorito === idProduto);
  if (apenasFavoritos && !estaFavorito) {
    const tinhaFoco = botaoAtual === document.activeElement;
    botaoAtual?.closest("article").remove();
    if (tinhaFoco) tituloListaResultados.focus();
    renderizarProdutos();
  } else if (botaoAtual) {
    botaoAtual.textContent = estaFavorito ? "♥" : "♡";
    botaoAtual.removeAttribute("aria-disabled");
    botaoAtual.setAttribute("aria-pressed", String(estaFavorito));
    botaoAtual.setAttribute("aria-label", rotuloFavorito(produto, estaFavorito));
  }
});

async function carregarResultados() {
  try {
    if (apenasFavoritos) {
      tituloListaResultados.textContent = "Minhas rações favoritas";
      document.getElementById("link-catalogo-completo").hidden = false;
    }
    const [racoes, { usuario }] = await Promise.all([
      apiHelpCat.solicitar("racoes"),
      apiHelpCat.sessao(),
    ]);
    usuarioCatalogo = usuario;
    if (apenasFavoritos && !usuario && !modoEstatico) {
      window.location.replace("login.html?retorno=resultados.html%3Ffavoritos%3D1");
      return;
    }

    favoritos = new Set(usuario ? await apiHelpCat.solicitar("favoritos") : lerListaSalva(CHAVE_FAVORITOS));
    if (!apenasFavoritos && (usuario || modoEstatico)) {
      document.getElementById("link-favoritos").hidden = false;
    }
    if (!preencherPelosParametros() && !apenasFavoritos) {
      const perfil = usuario ? await apiHelpCat.solicitar("perfil-gato") : lerPerfilVisitante();
      preencherPeloQuestionario(perfil);
    }
    catalogoRacoes = racoes;
    renderizarProdutos();
  } catch (erro) {
    contagemResultados.textContent = "";
    mensagemResultados.textContent = erro.message;
  }
}

carregarResultados();
