"use strict";

const botaoMenuPublico = document.getElementById("botao-menu-publico");
const menuPublico = document.getElementById("menu-publico");

if (botaoMenuPublico && menuPublico) {
  function fecharMenuPublico() {
    menuPublico.classList.remove("menu-publico--aberto");
    botaoMenuPublico.setAttribute("aria-expanded", "false");
    botaoMenuPublico.setAttribute("aria-label", "Abrir menu");
  }

  function alternarMenuPublico() {
    const menuEstaAberto = menuPublico.classList.toggle("menu-publico--aberto");

    botaoMenuPublico.setAttribute("aria-expanded", String(menuEstaAberto));
    botaoMenuPublico.setAttribute("aria-label", menuEstaAberto ? "Fechar menu" : "Abrir menu");
  }

  botaoMenuPublico.addEventListener("click", alternarMenuPublico);

  menuPublico.addEventListener("click", (evento) => {
    if (evento.target.closest("a")) {
      fecharMenuPublico();
    }
  });

  document.addEventListener("click", (evento) => {
    const clicouNoMenu = menuPublico.contains(evento.target);
    const clicouNoBotao = botaoMenuPublico.contains(evento.target);

    if (!clicouNoMenu && !clicouNoBotao) {
      fecharMenuPublico();
    }
  });

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && botaoMenuPublico.getAttribute("aria-expanded") === "true") {
      fecharMenuPublico();
      botaoMenuPublico.focus();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 760) {
      fecharMenuPublico();
    }
  });
}
