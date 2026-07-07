# Painel de Gastos Parlamentares para Cidadãos

Este é um painel web estático de transparência pública focado na visualização simplificada das despesas dos deputados estaduais da Assembleia Legislativa do Estado do Ceará (ALECE) durante o período de 2025.

O projeto foi desenhado sob medida para o **cidadão comum**, substituindo termos técnicos por linguagem simples, com gráficos e filtros intuitivos e atualizações instantâneas.

## ✨ Funcionalidades do Painel

1. **Filtros Globais Interativos**:
   - **Partido**: Filtra por legenda partidária.
   - **Deputado(a)**: Filtro dinâmico (quando você seleciona um Partido, a lista de deputados mostra apenas os parlamentares daquele partido).
   - **Tipo de Gasto (Natureza)**, **Quem Recebeu (Credor)** e **Mês de Referência**.
   - **Limpar Filtros**: Botão de reset rápido.

2. **Indicadores Rápidos (Cards)**:
   - **Valor total gasto** consolidado no período filtrado.
   - **Quantidade total de despesas** registradas.
   - **Número de deputados** e **empresas/credores** envolvidos.

3. **Gráficos Interativos (Chart.js)**:
   - **Evolução Mensal**: Mostra a evolução histórica de gastos dos deputados nos últimos 12 meses. O título do gráfico muda dinamicamente de acordo com a seleção de deputado.
   - **Quem mais recebeu**: Ranking de Top 10 credores que receberam verbas.
   - **Em que o dinheiro foi gasto**: Ranking de Top 10 tipos de despesa, com um botão que permite alternar a visualização para ver o ranking de **Quem mais gastou** (Top 10 Deputados).
   - **Filtro Cruzado**: Você pode clicar em uma fatia de qualquer gráfico de pizza/rosca para filtrar o painel automaticamente por aquele Credor, Tipo de despesa ou Deputado!

4. **Tabela de Detalhes**:
   - Tabela organizada com paginação automática (10 por página).
   - Campo de **busca rápida reativa** para pesquisar instantaneamente por credores, deputados, CNPJ, empenho, etc.
   - **Ordenação por coluna**: Clique nos cabeçalhos da tabela (ex: Valor, Deputado, Mês) para ordenar os registros de forma crescente ou decrescente.

---

## 🛠️ Como Executar o Projeto Localmente

Devido às restrições de segurança do navegador (**CORS**), você **não** pode simplesmente abrir o arquivo `index.html` clicando duas vezes nele no Windows File Explorer (pois a função JavaScript `fetch` para carregar o arquivo JSON local `RELATORIO_2025 - VERBA.DEP_CE.json` é bloqueada no protocolo `file://`).

Para rodá-lo localmente, você precisa usar um servidor local simples. Escolha a opção mais fácil para você:

### Opção 1: Usando Extensão do VS Code (Recomendado)
Se você usa o VS Code:
1. Instale a extensão **Live Server** (desenvolvida por Ritwick Dey).
2. Abra a pasta do projeto no VS Code.
3. Clique com o botão direito no arquivo `index.html` e selecione **Open with Live Server** ou clique no botão **Go Live** no canto inferior direito.

### Opção 2: Usando Python (Caso tenha instalado)
Abra o prompt de comando (PowerShell/CMD) na pasta do projeto e digite:
```bash
python -m http.server 8000
```
Depois abra o navegador e acesse: [http://localhost:8000](http://localhost:8000)

### Opção 3: Usando Node.js (Caso tenha instalado)
Abra o terminal na pasta do projeto e digite:
```bash
npx serve
```
Depois abra o endereço indicado (normalmente [http://localhost:3000](http://localhost:3000) ou [http://localhost:5000](http://localhost:5000)).

---

## 🚀 Publicação no GitHub Pages

Este dashboard está 100% pronto para publicação no GitHub Pages. Como é totalmente estático e roda apenas no lado do cliente, siga os passos abaixo para publicá-lo gratuitamente:

1. Crie um repositório no seu GitHub (ex: `painel-gastos-alece`).
2. Envie os arquivos do seu computador para o repositório:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Painel de Gastos ALECE"
   git remote add origin https://github.com/SEU-USUARIO/NOME-DO-REPOSITORIO.git
   git branch -M main
   git push -u origin main
   ```
3. No site do GitHub, acesse a aba **Settings** (Configurações) do seu repositório.
4. No menu lateral esquerdo, sob "Code and automation", clique em **Pages**.
5. Na seção **Build and deployment**:
   - Em *Source*, selecione **Deploy from a branch**.
   - Em *Branch*, selecione **main** e a pasta **/ (root)**.
   - Clique em **Save**.
6. Aguarde cerca de 1 a 2 minutos. O GitHub fornecerá um link público direto para o seu painel, como: `https://seu-usuario.github.io/nome-do-repositorio/`

---

## 📂 Estrutura de Arquivos

- `index.html`: Estrutura HTML5 semântica e acessível.
- `style.css`: Estilos customizados e responsivos (mobile/desktop).
- `app.js`: Script de controle e interatividade (Chart.js, paginação, busca e filtros).
- `RELATORIO_2025 - VERBA.DEP_CE.json`: Base de dados real de gastos parlamentares da ALECE.
