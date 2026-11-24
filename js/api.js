"use strict";

const modoEstatico = document.querySelector('meta[name="helpcat-modo"]')?.content === "estatico";
let pedidoDeCatalogo;

function carregarCatalogoEstatico() {
  pedidoDeCatalogo ??= fetch("catalogo.json").then((resposta) => {
    if (!resposta.ok) throw new Error("O catálogo está indisponível. Tente atualizar a página.");
    return resposta.json();
  }).catch((erro) => {
    pedidoDeCatalogo = undefined;
    throw erro;
  });
  return pedidoDeCatalogo;
}

async function consultarVersaoEstatica(caminho) {
  if (caminho === "sessao") return { usuario: null };
  if (caminho === "racoes") return carregarCatalogoEstatico();
  if (caminho.startsWith("racoes/")) {
    const id = decodeURIComponent(caminho.slice("racoes/".length));
    const catalogo = await carregarCatalogoEstatico();
    const racao = catalogo.find((produto) => produto.id === id);
    if (racao) return racao;
    throw Object.assign(new Error("Ração não encontrada."), { status: 404 });
  }
  throw new Error("Esta função está disponível na versão com servidor.");
}

const apiHelpCat = {
  async solicitar(caminho, metodo = "GET", dados = {}) {
    if (modoEstatico) return consultarVersaoEstatica(caminho);

    let resposta;
    try {
      resposta = await fetch(`/api/${caminho}`, {
        method: metodo,
        ...(metodo !== "GET" && {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dados),
        }),
      });
    } catch {
      throw new Error("Não foi possível conectar ao servidor do Help Cat. Tente novamente.");
    }

    const resultado = await resposta.json().catch(() => {
      throw new Error("Abra o Help Cat pelo servidor do projeto (`npm start`).");
    });
    if (!resposta.ok) {
      throw Object.assign(new Error(resultado.mensagem ?? "Não foi possível concluir a operação."), {
        status: resposta.status,
      });
    }
    return resultado;
  },

  sessao() {
    return this.solicitar("sessao");
  },

  escaparHtml(valor) {
    const entidades = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return String(valor).replace(/[&<>"']/g, (caractere) => entidades[caractere]);
  },
};
