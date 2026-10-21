"use strict";

const botaoMenu = document.getElementById("botao-menu");
const navegacaoPrincipal = document.getElementById("navegacao-principal");
const formularioBusca = document.getElementById("formulario-busca");
const campoBusca = document.getElementById("busca-home");
const cartoesCategoria = [...document.querySelectorAll(".cartao-categoria")];
const linksDeCategoria = [...document.querySelectorAll("[data-categoria]:not(.cartao-categoria)")];
const linksDaNavegacao = [...document.querySelectorAll(".navegacao-principal a")];
const linkMeuPet = document.querySelector("[data-recurso='Meu Pet']");
const botaoNotificacoes = document.getElementById("botao-notificacoes");
const botaoPerfil = document.getElementById("botao-perfil");
const menuPerfil = document.getElementById("menu-perfil");
const avisoHome = document.getElementById("aviso-home");

let temporizadorDoAviso;
let temporizadorDoDestaque;

function normalizarTexto(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function mostrarAviso(mensagem) {
  window.clearTimeout(temporizadorDoAviso);
  avisoHome.textContent = mensagem;
  avisoHome.classList.add("aviso-home--visivel");

  temporizadorDoAviso = window.setTimeout(() => {
    avisoHome.classList.remove("aviso-home--visivel");
  }, 3200);
}

function fecharMenuPrincipal() {
  navegacaoPrincipal.classList.remove("navegacao-principal--aberta");
  botaoMenu.setAttribute("aria-expanded", "false");
  botaoMenu.setAttribute("aria-label", "Abrir menu");
}

function alternarMenuPrincipal() {
  const menuEstaAberto = navegacaoPrincipal.classList.toggle("navegacao-principal--aberta");

  botaoMenu.setAttribute("aria-expanded", String(menuEstaAberto));
  botaoMenu.setAttribute("aria-label", menuEstaAberto ? "Fechar menu" : "Abrir menu");
}

function marcarLinkAtivo(linkSelecionado) {
  linksDaNavegacao.forEach((link) => {
    link.classList.remove("ativo");
    link.removeAttribute("aria-current");
  });

  linkSelecionado.classList.add("ativo");
  linkSelecionado.setAttribute("aria-current", "location");
}

function encontrarCategoria(termo) {
  const termoNormalizado = normalizarTexto(termo);

  return cartoesCategoria.find((cartao) => {
    const nome = normalizarTexto(cartao.dataset.categoria);
    const termosRelacionados = normalizarTexto(cartao.dataset.termos);

    return nome.includes(termoNormalizado) || termosRelacionados.includes(termoNormalizado);
  });
}

function destacarCategoria(cartao) {
  window.clearTimeout(temporizadorDoDestaque);
  cartoesCategoria.forEach((item) => item.classList.remove("cartao-categoria--destacado"));

  cartao.classList.add("cartao-categoria--destacado");
  cartao.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });

  temporizadorDoDestaque = window.setTimeout(() => {
    cartao.classList.remove("cartao-categoria--destacado");
  }, 1800);
}

function alternarMenuDoPerfil() {
  const menuEstaAberto = !menuPerfil.hidden;

  menuPerfil.hidden = menuEstaAberto;
  botaoPerfil.setAttribute("aria-expanded", String(!menuEstaAberto));
}

function fecharMenuDoPerfil() {
  menuPerfil.hidden = true;
  botaoPerfil.setAttribute("aria-expanded", "false");
}

botaoMenu.addEventListener("click", alternarMenuPrincipal);

linksDeCategoria.forEach((link) => {
  link.addEventListener("click", () => {
    const cartao = encontrarCategoria(link.dataset.categoria);
    marcarLinkAtivo(link);
    fecharMenuPrincipal();

    if (cartao) {
      window.setTimeout(() => destacarCategoria(cartao), 150);
    }
  });
});

linkMeuPet.addEventListener("click", () => {
  marcarLinkAtivo(linkMeuPet);
  fecharMenuPrincipal();
  mostrarAviso("A área Meu Pet será conectada na próxima etapa do projeto.");
});

cartoesCategoria.forEach((cartao) => {
  cartao.addEventListener("click", () => {
    if (cartao.matches("a[href]")) return;
    mostrarAviso(`A página de ${cartao.dataset.categoria} será conectada em breve.`);
  });
});

formularioBusca.addEventListener("submit", (evento) => {
  evento.preventDefault();

  const termoBuscado = campoBusca.value.trim();

  if (!termoBuscado) {
    campoBusca.focus();
    mostrarAviso("Digite o que você deseja encontrar.");
    return;
  }

  const categoriaEncontrada = encontrarCategoria(termoBuscado);

  if (categoriaEncontrada) {
    destacarCategoria(categoriaEncontrada);
    mostrarAviso(`${categoriaEncontrada.dataset.categoria} encontrada!`);
  } else {
    mostrarAviso(`Ainda não encontramos “${termoBuscado}”. Tente outra busca.`);
  }
});

botaoNotificacoes.addEventListener("click", () => {
  mostrarAviso("Você não tem novas notificações.");
});

botaoPerfil.addEventListener("click", (evento) => {
  evento.stopPropagation();
  alternarMenuDoPerfil();
});

document.addEventListener("click", (evento) => {
  if (!menuPerfil.contains(evento.target)) {
    fecharMenuDoPerfil();
  }
});

document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape") {
    fecharMenuPrincipal();
    fecharMenuDoPerfil();
  }
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 900) {
    fecharMenuPrincipal();
  }
});
