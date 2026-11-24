# Help Cat

Projeto acadêmico de uma plataforma para ajudar tutores a encontrar rações adequadas para seus gatos.

## Telas disponíveis

- apresentação pública do projeto;
- cadastro e login com e-mail e senha;
- página inicial da área do usuário;
- questionário de recomendação em quatro etapas;
- catálogo com filtros, ordenação e favoritos salvos por conta;
- página de detalhes e informações nutricionais da ração.

## Como executar

Requer Node.js 24 ou superior. O front-end usa HTML, CSS e JavaScript. O servidor usa o SQLite integrado ao Node, então não é necessário instalar dependências.

1. Abra um terminal na raiz do projeto e execute `npm start`.
2. Acesse [http://127.0.0.1:4173](http://127.0.0.1:4173).
3. Use **Entrar → Cadastre-se** para criar uma conta.

O servidor cria `dados/helpcat.sqlite` e importa o catálogo inicial automaticamente. Mantenha esse arquivo para preservar contas, sessões, favoritos e respostas. A pasta `dados/` é ignorada pelo Git. O Live Server serve somente os arquivos da interface. Para usar a API e o banco, acesse o endereço do `npm start`.

Use `npm test` para testar a API e a persistência em um banco temporário.

## GitHub Pages

A [versão pública](https://matheus-gabriel-martins.github.io/trabalho-faculdade/) é publicada pelo GitHub Actions a cada atualização da branch `main`. Ela oferece o catálogo, os filtros, o questionário e os favoritos neste navegador. Cadastro e login fazem parte da versão com servidor, iniciada com `npm start`.

Para gerar o mesmo pacote localmente, execute `npm run build:pages`. A pasta `.pages/` contém só os arquivos públicos e um catálogo gerado a partir dos dados iniciais.

## Organização

```text
faculdade trabalho/
├── assets/          # imagens e ícones
├── css/             # estilos separados por tela ou responsabilidade
├── js/              # comportamento, navegação e integração com a API
├── servidor/        # esquema SQLite, contas e catálogo inicial
├── servidor.cjs     # rotas da API e entrega do front-end
├── index.html       # página pública inicial
├── login.html
├── home.html
├── questionario.html
├── resultados.html
└── detalhes-racao.html
```

## Observação

Os produtos e preços continuam demonstrativos. Qualquer pessoa pode consultar o catálogo. Ao entrar, o Help Cat guarda os favoritos e o último questionário respondido na conta. No menu do perfil, **Minhas rações favoritas** abre a lista salva. **Meu Pet** reabre o questionário com as últimas respostas.

O servidor roda localmente. A disponibilidade e os preços em lojas, login social e recuperação de senha estão fora desta versão.
