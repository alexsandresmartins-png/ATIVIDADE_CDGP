// Estado Global do Dashboard
let allData = [];
let filteredData = [];

const filters = {
  partido: "",
  deputado: "",
  natureza: "",
  credor: "",
  periodo: ""
};

let tableSearch = "";
let tablePage = 1;
const tablePerPage = 10;
let sortColumn = "VALOR";
let sortDirection = "desc"; // Maiores valores primeiro por padrão

const charts = {
  evolucao: null,
  credores: null,
  despesas: null
};

let chartModeDespesas = "tipo"; // "tipo" ou "deputado"

// Iniciar o dashboard ao carregar a página
document.addEventListener("DOMContentLoaded", initDashboard);

// -------------------------------------------------------------
// 1. Inicialização e Carregamento de Dados
// -------------------------------------------------------------
async function initDashboard() {
  const loadingOverlay = document.getElementById("loading-overlay");
  
  try {
    // Carregar JSON da ALECE
    const response = await fetch("RELATORIO_2025 - VERBA.DEP_CE.json");
    if (!response.ok) {
      throw new Error(`Erro ao carregar arquivo de dados: ${response.status}`);
    }
    
    const rawData = await response.json();
    
    // Normalizar e tratar dados
    allData = rawData.map(item => {
      // Tratar valor (ex: "4000,00" -> 4000.0)
      const valStr = (item.VALOR || "0").toString().replace(/\./g, "").replace(",", ".");
      const valor = parseFloat(valStr) || 0;
      
      return {
        deputado: (item.DEPUTADO || "NÃO INFORMADO").trim().toUpperCase(),
        partido: (item.PARTIDO || "NÃO INFORMADO").trim().toUpperCase(),
        periodoRaw: item.PERIODO || "",
        periodoChave: parsePeriodoChave(item.PERIODO), // Ex: "2025-03"
        periodoTexto: parsePeriodoTexto(item.PERIODO), // Ex: "Março/2025"
        natureza: (item["NATUREZA DE DESPESA"] || "NÃO INFORMADO").trim().toUpperCase(),
        empenho: item.EMPENHO || "NÃO INFORMADO",
        descricao: item.DESCRICAO || "",
        cnpj: item.CNPJ ? item.CNPJ.toString() : "NÃO INFORMADO",
        credor: (item.CREDOR || "NÃO INFORMADO").trim().toUpperCase(),
        tipoDespesa: (item["TIPO DE DESPESA"] || "ORDINARIA").trim().toUpperCase(),
        valor: valor
      };
    });
    
    // Configurar menus dropdown
    populateFiltersDropdowns();
    
    // Configurar ouvintes de eventos do DOM
    setupEventListeners();
    
    // Executar a primeira filtragem (Geral) e renderizar
    applyFilters();
    
    // Esconder a tela de carregamento com transição suave
    loadingOverlay.classList.add("hidden");
    
  } catch (error) {
    console.error("Erro na inicialização:", error);
    const loadingText = document.querySelector(".loading-text");
    if (loadingText) {
      loadingText.innerHTML = `<span style="color: var(--danger-color)">Falha ao carregar dados!</span><br><span style="font-size: 0.85rem; font-weight: normal; color: var(--text-muted)">Verifique se o arquivo JSON está na pasta do projeto e se está rodando um servidor local.</span>`;
    }
    const spinner = document.querySelector(".spinner");
    if (spinner) spinner.style.borderTopColor = "var(--danger-color)";
  }
}

// Helpers para conversão de período (MM/AA)
function parsePeriodoChave(periodo) {
  if (!periodo || !periodo.includes("/")) return "9999-12"; // Fallback para manter no final
  const parts = periodo.split("/");
  const mes = parts[0].trim().padStart(2, "0");
  const anoPart = parts[1].trim();
  const ano = anoPart.length === 2 ? "20" + anoPart : anoPart;
  return `${ano}-${mes}`;
}

function parsePeriodoTexto(periodo) {
  if (!periodo || !periodo.includes("/")) return "Não informado";
  const parts = periodo.split("/");
  const mesInt = parseInt(parts[0], 10);
  const anoPart = parts[1].trim();
  const ano = anoPart.length === 2 ? "20" + anoPart : anoPart;
  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  return `${meses[mesInt - 1] || "???"} de ${ano}`;
}

// Formatação cidadã de nomes: "DEP ACRISIO SENA" -> "Acrísio Sena"
function formatName(str) {
  if (!str) return "";
  let name = str.trim();
  if (name.startsWith("DEP ")) {
    name = name.substring(4);
  }
  // Title Case
  return name.toLowerCase().replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase());
}

// Formatação monetária BRL: 4000 -> "R$ 4.000,00"
function formatCurrency(val) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// -------------------------------------------------------------
// 2. Configuração e População de Filtros
// -------------------------------------------------------------
function populateFiltersDropdowns() {
  // Partidos únicos
  const partidos = [...new Set(allData.map(d => d.partido))].filter(Boolean).sort();
  const selectPartido = document.getElementById("filter-partido");
  partidos.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p;
    selectPartido.appendChild(opt);
  });
  
  // Natureza única
  const naturezas = [...new Set(allData.map(d => d.natureza))].filter(Boolean).sort();
  const selectNatureza = document.getElementById("filter-natureza");
  naturezas.forEach(n => {
    const opt = document.createElement("option");
    opt.value = n;
    opt.textContent = formatName(n).replace("Dep. ", ""); // Remover prefixo de formatação genérica se houver
    selectNatureza.appendChild(opt);
  });

  // Credores únicos (mostrar todos em ordem alfabética)
  const credores = [...new Set(allData.map(d => d.credor))].filter(Boolean).sort();
  const selectCredor = document.getElementById("filter-credor");
  credores.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c.length > 50 ? c.substring(0, 48) + "..." : c;
    selectCredor.appendChild(opt);
  });

  // Períodos únicos ordenados cronologicamente
  const periodos = [];
  const periodosMap = {};
  allData.forEach(d => {
    if (d.periodoChave && d.periodoTexto && !periodosMap[d.periodoChave]) {
      periodosMap[d.periodoChave] = d.periodoTexto;
      periodos.push({ chave: d.periodoChave, texto: d.periodoTexto });
    }
  });
  periodos.sort((a, b) => a.chave.localeCompare(b.chave));
  
  const selectPeriodo = document.getElementById("filter-periodo");
  periodos.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.chave;
    opt.textContent = p.texto;
    selectPeriodo.appendChild(opt);
  });

  // Inicializar o dropdown de deputados dependente
  updateDeputadosDropdown();
}

function updateDeputadosDropdown() {
  const selectDeputado = document.getElementById("filter-deputado");
  const selectedPartido = filters.partido;
  const currentlySelected = filters.deputado;
  
  // Filtrar deputados com base no partido selecionado
  let deputadosSet;
  if (selectedPartido) {
    deputadosSet = new Set(allData.filter(d => d.partido === selectedPartido).map(d => d.deputado));
  } else {
    deputadosSet = new Set(allData.map(d => d.deputado));
  }
  
  const deputados = [...deputadosSet].filter(Boolean).sort();
  
  // Limpar e reconstruir
  selectDeputado.innerHTML = '<option value="">Todos os Deputados</option>';
  deputados.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = formatName(d);
    if (d === currentlySelected) {
      opt.selected = true;
    }
    selectDeputado.appendChild(opt);
  });

  // Se o deputado anteriormente selecionado não pertencer ao novo partido, limpar a seleção
  if (currentlySelected && !deputadosSet.has(currentlySelected)) {
    filters.deputado = "";
    selectDeputado.value = "";
  }
}

// -------------------------------------------------------------
// 3. Ouvintes de Eventos (Event Listeners)
// -------------------------------------------------------------
function setupEventListeners() {
  // Mudanças nos filtros
  document.getElementById("filter-partido").addEventListener("change", (e) => {
    filters.partido = e.target.value;
    updateDeputadosDropdown();
    applyFilters();
  });
  
  document.getElementById("filter-deputado").addEventListener("change", (e) => {
    filters.deputado = e.target.value;
    applyFilters();
  });
  
  document.getElementById("filter-natureza").addEventListener("change", (e) => {
    filters.natureza = e.target.value;
    applyFilters();
  });
  
  document.getElementById("filter-credor").addEventListener("change", (e) => {
    filters.credor = e.target.value;
    applyFilters();
  });
  
  document.getElementById("filter-periodo").addEventListener("change", (e) => {
    filters.periodo = e.target.value;
    applyFilters();
  });
  
  // Limpar Filtros
  document.getElementById("btn-limpar").addEventListener("click", resetAllFilters);
  
  // Pesquisa na Tabela (Com busca reativa instantânea)
  document.getElementById("table-search").addEventListener("input", (e) => {
    tableSearch = e.target.value;
    tablePage = 1; // Voltar para a página 1 ao pesquisar
    renderTable();
  });

  // Botões de Exportação
  document.getElementById("btn-export-pdf").addEventListener("click", exportToPDF);
  document.getElementById("btn-export-csv").addEventListener("click", exportToCSV);

  // Alternância no Gráfico 3 (Gasto por Tipo / Deputado)
  document.getElementById("btn-toggle-despesas").addEventListener("click", toggleChartDespesasMode);
  
  // Ordenação nas colunas da Tabela
  const tableHeaders = document.querySelectorAll("#data-table th");
  tableHeaders.forEach(th => {
    th.addEventListener("click", () => {
      const col = th.getAttribute("data-column");
      if (!col) return;
      
      if (sortColumn === col) {
        sortDirection = sortDirection === "asc" ? "desc" : "asc";
      } else {
        sortColumn = col;
        sortDirection = "desc"; // Padrão desc para nova coluna
      }
      
      // Atualizar classes visuais de cabeçalhos
      tableHeaders.forEach(h => h.classList.remove("sort-active"));
      th.classList.add("sort-active");
      
      renderTable();
    });
  });
}

// -------------------------------------------------------------
// 4. Lógica de Filtragem e Reatividade
// -------------------------------------------------------------
function applyFilters() {
  // Resetar página
  tablePage = 1;
  
  // Filtragem composta em cascata
  filteredData = allData.filter(item => {
    if (filters.partido && item.partido !== filters.partido) return false;
    if (filters.deputado && item.deputado !== filters.deputado) return false;
    if (filters.natureza && item.natureza !== filters.natureza) return false;
    if (filters.credor && item.credor !== filters.credor) return false;
    if (filters.periodo && item.periodoChave !== filters.periodo) return false;
    return true;
  });
  
  // Habilitar/Desabilitar botão de limpar filtros
  const hasFilters = Object.values(filters).some(val => val !== "");
  const btnLimpar = document.getElementById("btn-limpar");
  btnLimpar.disabled = !hasFilters;
  if (hasFilters) {
    btnLimpar.classList.add("active");
  } else {
    btnLimpar.classList.remove("active");
  }
  
  // Atualizar componentes
  updateSummaryCards();
  renderCharts();
  renderTable();
}

function resetAllFilters() {
  // Limpar filtros em JS
  Object.keys(filters).forEach(k => filters[k] = "");
  
  // Resetar elementos do DOM
  document.getElementById("filter-partido").value = "";
  document.getElementById("filter-natureza").value = "";
  document.getElementById("filter-credor").value = "";
  document.getElementById("filter-periodo").value = "";
  
  // Resetar busca da tabela
  document.getElementById("table-search").value = "";
  tableSearch = "";
  
  // Deputado depende de partido, então precisamos resetar o dropdown dele também
  updateDeputadosDropdown();
  
  // Aplicar novamente
  applyFilters();
}

// Função para setar filtros programaticamente (usada no clique de gráficos - filtro cruzado)
function setFilterValue(filterName, value) {
  const elementId = `filter-${filterName}`;
  const element = document.getElementById(elementId);
  if (!element) return;
  
  if (filterName === "partido") {
    filters.partido = value;
    element.value = value;
    updateDeputadosDropdown();
  } else if (filterName === "deputado") {
    // Se o deputado clicado pertence a algum partido, seleciona também o partido dele
    const item = allData.find(d => d.deputado === value);
    if (item && item.partido) {
      filters.partido = item.partido;
      document.getElementById("filter-partido").value = item.partido;
      updateDeputadosDropdown();
    }
    filters.deputado = value;
    element.value = value;
  } else {
    filters[filterName] = value;
    element.value = value;
  }
  
  applyFilters();
  
  // Rolar suavemente até o topo/filtros
  window.scrollTo({ top: 220, behavior: "smooth" });
}

// -------------------------------------------------------------
// 5. Renderização de Elementos HTML
// -------------------------------------------------------------

// Cards de Resumo
function updateSummaryCards() {
  // Total Gasto
  const total = filteredData.reduce((acc, curr) => acc + curr.valor, 0);
  document.getElementById("kpi-total-gasto").textContent = formatCurrency(total);
  
  // Qtd Despesas
  document.getElementById("kpi-qtd-despesas").textContent = filteredData.length.toLocaleString("pt-BR");
  
  // Qtd Deputados Únicos
  const deps = new Set(filteredData.map(d => d.deputado));
  document.getElementById("kpi-qtd-deputados").textContent = deps.size;
  
  // Qtd Credores Únicos
  const creds = new Set(filteredData.map(d => d.credor));
  document.getElementById("kpi-qtd-credores").textContent = creds.size.toLocaleString("pt-BR");
}

// Tabela de Apoio
function renderTable(showAll = false) {
  const tbody = document.getElementById("table-body");
  const emptyState = document.getElementById("table-empty-state");
  const searchInput = document.getElementById("table-search");
  
  // 1. Filtrar pela busca rápida textual
  let tableData = [...filteredData];
  const query = tableSearch.trim().toLowerCase();
  
  if (query) {
    tableData = tableData.filter(d => {
      return d.deputado.toLowerCase().includes(query) ||
             d.partido.toLowerCase().includes(query) ||
             d.credor.toLowerCase().includes(query) ||
             d.cnpj.includes(query) ||
             d.empenho.toLowerCase().includes(query) ||
             d.descricao.toLowerCase().includes(query) ||
             d.natureza.toLowerCase().includes(query) ||
             d.tipoDespesa.toLowerCase().includes(query);
    });
  }
  
  // 2. Ordenação
  tableData.sort((a, b) => {
    let valA, valB;
    
    switch (sortColumn) {
      case "DEPUTADO":
        valA = a.deputado; valB = b.deputado; break;
      case "PARTIDO":
        valA = a.partido; valB = b.partido; break;
      case "CREDOR":
        valA = a.credor; valB = b.credor; break;
      case "CNPJ":
        valA = a.cnpj; valB = b.cnpj; break;
      case "EMPENHO":
        valA = a.empenho; valB = b.empenho; break;
      case "DESCRICAO":
        valA = a.descricao; valB = b.descricao; break;
      case "NATUREZA DE DESPESA":
        valA = a.natureza; valB = b.natureza; break;
      case "TIPO DE DESPESA":
        valA = a.tipoDespesa; valB = b.tipoDespesa; break;
      case "PERIODO":
        valA = a.periodoChave; valB = b.periodoChave; break;
      case "VALOR":
      default:
        valA = a.valor; valB = b.valor; break;
    }
    
    if (typeof valA === "number" && typeof valB === "number") {
      return sortDirection === "asc" ? valA - valB : valB - valA;
    }
    
    valA = valA.toString().toLowerCase();
    valB = valB.toString().toLowerCase();
    
    if (valA < valB) return sortDirection === "asc" ? -1 : 1;
    if (valA > valB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });
  
  // 3. Paginação (Bypassada se showAll = true para impressão)
  const totalItems = tableData.length;
  const totalPages = Math.ceil(totalItems / tablePerPage) || 1;
  
  let pageData;
  let startIndex, endIndex;
  
  if (showAll) {
    pageData = tableData;
    startIndex = 0;
    endIndex = totalItems;
  } else {
    // Garantir que a página atual não ultrapasse o limite
    if (tablePage > totalPages) tablePage = totalPages;
    if (tablePage < 1) tablePage = 1;
    
    startIndex = (tablePage - 1) * tablePerPage;
    endIndex = Math.min(startIndex + tablePerPage, totalItems);
    pageData = tableData.slice(startIndex, endIndex);
  }
  
  // Limpar tabela
  tbody.innerHTML = "";
  
  if (totalItems === 0) {
    emptyState.style.display = "flex";
    document.getElementById("pagination-info").textContent = "Mostrando 0 a 0 de 0 despesas";
    document.getElementById("pagination-buttons").innerHTML = "";
    return;
  }
  
  emptyState.style.display = "none";
  
  // Renderizar linhas
  pageData.forEach(item => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="col-deputado">${formatName(item.deputado)}</td>
      <td class="col-partido">
        <span class="header-tag" style="background-color: var(--primary-light); color: var(--primary-color); border: none; padding: 0.15rem 0.5rem; font-size: 0.725rem;">
          ${item.partido}
        </span>
      </td>
      <td>${item.credor}</td>
      <td style="white-space: nowrap;">${item.cnpj}</td>
      <td>${item.empenho}</td>
      <td title="${item.descricao}">${item.descricao.length > 60 ? item.descricao.substring(0, 57) + "..." : item.descricao}</td>
      <td>${formatName(item.natureza).replace("Dep. ", "")}</td>
      <td>${item.tipoDespesa}</td>
      <td style="text-align: center; white-space: nowrap;">${item.periodoTexto.replace(" de ", "/")}</td>
      <td class="col-valor">${formatCurrency(item.valor)}</td>
    `;
    tbody.appendChild(tr);
  });
  
  // Atualizar texto de paginação
  if (showAll) {
    document.getElementById("pagination-info").textContent = `Mostrando todos os ${totalItems.toLocaleString("pt-BR")} registros (Pronto para Impressão)`;
    document.getElementById("pagination-buttons").innerHTML = "";
  } else {
    document.getElementById("pagination-info").textContent = `Mostrando ${startIndex + 1} a ${endIndex} de ${totalItems.toLocaleString("pt-BR")} despesas`;
    renderPaginationButtons(totalPages);
  }
}

function renderPaginationButtons(totalPages) {
  const container = document.getElementById("pagination-buttons");
  container.innerHTML = "";
  
  // Botão Anterior
  const btnPrev = document.createElement("button");
  btnPrev.className = "btn-page";
  btnPrev.disabled = tablePage === 1;
  btnPrev.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  `;
  btnPrev.addEventListener("click", () => {
    tablePage--;
    renderTable();
  });
  container.appendChild(btnPrev);
  
  // Definir intervalo de páginas a exibir
  const maxButtons = 5;
  let startPage = Math.max(1, tablePage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  
  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement("button");
    btn.className = `btn-page ${i === tablePage ? "active" : ""}`;
    btn.textContent = i;
    btn.addEventListener("click", () => {
      tablePage = i;
      renderTable();
    });
    container.appendChild(btn);
  }
  
  // Botão Próximo
  const btnNext = document.createElement("button");
  btnNext.className = "btn-page";
  btnNext.disabled = tablePage === totalPages;
  btnNext.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  `;
  btnNext.addEventListener("click", () => {
    tablePage++;
    renderTable();
  });
  container.appendChild(btnNext);
}

// -------------------------------------------------------------
// 6. Visualizações de Gráficos (Chart.js)
// -------------------------------------------------------------
const colorPalette = [
  "#1e3a8a", // Navy
  "#0d9488", // Teal
  "#4f46e5", // Indigo
  "#7c3aed", // Violet
  "#2563eb", // Blue
  "#059669", // Emerald
  "#db2777", // Pink
  "#ea580c", // Orange
  "#e11d48", // Rose
  "#84cc16", // Lime
  "#475569"  // Slate (usado para "Outros")
];

function renderCharts() {
  renderEvolucaoChart();
  renderCredoresChart();
  renderDespesasChart();
}

// Gráfico 1: Evolução Mensal Geral ou por Deputado
function renderEvolucaoChart() {
  const ctx = document.getElementById("chart-evolucao").getContext("2d");
  
  // Obter todos os períodos únicos do banco completo
  const periodosGlobais = [...new Set(allData.map(d => d.periodoChave))].sort();
  
  // Limitar a evolução nos últimos 12 meses do dataset para exibição limpa
  const windowMonths = periodosGlobais.slice(-12);
  
  // Somar os gastos de filteredData agrupados pelos 12 meses
  const monthlyDataMap = {};
  windowMonths.forEach(m => monthlyDataMap[m] = 0);
  
  filteredData.forEach(item => {
    if (monthlyDataMap[item.periodoChave] !== undefined) {
      monthlyDataMap[item.periodoChave] += item.valor;
    }
  });
  
  const labels = windowMonths.map(m => {
    const item = allData.find(d => d.periodoChave === m);
    return item ? item.periodoTexto.replace(" de ", "/") : m;
  });
  
  const values = windowMonths.map(m => monthlyDataMap[m]);
  
  // Título Dinâmico
  const titleEl = document.getElementById("chart-evolucao-titulo");
  if (filters.deputado) {
    titleEl.textContent = `Gastos mensais de ${formatName(filters.deputado)} nos últimos 12 meses`;
  } else {
    titleEl.textContent = "Gastos mensais de todos os deputados nos últimos 12 meses";
  }
  
  // Destruir se já existe
  if (charts.evolucao) {
    charts.evolucao.destroy();
  }
  
  // Criar gradiente para efeito suave na linha/área
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, "rgba(30, 58, 138, 0.4)");
  gradient.addColorStop(1, "rgba(30, 58, 138, 0.0)");
  
  charts.evolucao = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Valor Total Gasto",
        data: values,
        borderColor: "#1e3a8a",
        borderWidth: 3,
        backgroundColor: gradient,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: "#1e3a8a",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return ` Total: ${formatCurrency(context.raw)}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return formatCurrency(value).replace(",00", "");
            },
            font: {
              family: "'Plus Jakarta Sans', sans-serif"
            }
          },
          grid: {
            color: "rgba(0,0,0,0.05)"
          }
        },
        x: {
          ticks: {
            font: {
              family: "'Plus Jakarta Sans', sans-serif"
            }
          },
          grid: {
            display: false
          }
        }
      }
    }
  });
}

// Gráfico 2: Top 10 Credores
function renderCredoresChart() {
  const ctx = document.getElementById("chart-credores").getContext("2d");
  
  // Agrupar por Credor
  const credorSums = {};
  filteredData.forEach(d => {
    credorSums[d.credor] = (credorSums[d.credor] || 0) + d.valor;
  });
  
  // Ordenar e pegar top 10
  const sorted = Object.entries(credorSums)
    .map(([credor, total]) => ({ credor, total }))
    .sort((a, b) => b.total - a.total);
  
  const top10 = sorted.slice(0, 10);
  const othersVal = sorted.slice(10).reduce((acc, curr) => acc + curr.total, 0);
  
  const labels = top10.map(d => d.credor.length > 25 ? d.credor.substring(0, 23) + "..." : d.credor);
  const rawLabels = top10.map(d => d.credor); // Guardar reais para clique
  const values = top10.map(d => d.total);
  
  if (othersVal > 0) {
    labels.push("Outros Credores");
    rawLabels.push("Outros Credores");
    values.push(othersVal);
  }
  
  if (charts.credores) {
    charts.credores.destroy();
  }
  
  charts.credores = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: colorPalette.slice(0, values.length),
        borderWidth: 2,
        borderColor: "#ffffff"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            boxWidth: 12,
            font: {
              family: "'Plus Jakarta Sans', sans-serif",
              size: 11
            },
            padding: 8
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || "";
              const val = context.raw || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((val / total) * 100).toFixed(1);
              return ` ${label}: ${formatCurrency(val)} (${percentage}%)`;
            }
          }
        }
      },
      // Habilitar filtro cruzado no clique
      onClick: (event, activeElements) => {
        if (activeElements.length > 0) {
          const idx = activeElements[0].index;
          const clickedCredor = rawLabels[idx];
          if (clickedCredor && clickedCredor !== "Outros Credores") {
            setFilterValue("credor", clickedCredor);
          }
        }
      }
    }
  });
}

// Gráfico 3: Tipo de Despesa / Deputado (Pizza com Alternância)
function renderDespesasChart() {
  const ctx = document.getElementById("chart-despesas").getContext("2d");
  
  const mapSums = {};
  const isTipo = chartModeDespesas === "tipo";
  const fieldKey = isTipo ? "natureza" : "deputado";
  
  // Agrupar
  filteredData.forEach(d => {
    const key = d[fieldKey];
    mapSums[key] = (mapSums[key] || 0) + d.valor;
  });
  
  // Ordenar e extrair top 10
  const sorted = Object.entries(mapSums)
    .map(([key, total]) => ({ key, total }))
    .sort((a, b) => b.total - a.total);
    
  const top10 = sorted.slice(0, 10);
  const othersVal = sorted.slice(10).reduce((acc, curr) => acc + curr.total, 0);
  
  // Formatar labels amigáveis
  const labels = top10.map(d => {
    if (isTipo) {
      const name = formatName(d.key).replace("Dep. ", "");
      return name.length > 25 ? name.substring(0, 23) + "..." : name;
    }
    return formatName(d.key);
  });
  
  const rawLabels = top10.map(d => d.key); // Rótulos puros para filtro cruzado
  const values = top10.map(d => d.total);
  
  if (othersVal > 0) {
    labels.push("Outros");
    rawLabels.push("Outros");
    values.push(othersVal);
  }
  
  // Ajustar textos e títulos da seção
  const title = document.getElementById("chart-despesas-titulo");
  const subtitle = document.getElementById("chart-despesas-subtitulo");
  
  if (isTipo) {
    title.textContent = "Em que o dinheiro foi gasto";
    subtitle.textContent = "Os 10 maiores tipos de gasto somados.";
  } else {
    title.textContent = "Quem mais gastou recursos";
    subtitle.textContent = "Os 10 deputados que mais utilizaram a verba.";
  }
  
  if (charts.despesas) {
    charts.despesas.destroy();
  }
  
  charts.despesas = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: colorPalette.slice(0, values.length),
        borderWidth: 2,
        borderColor: "#ffffff"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            boxWidth: 12,
            font: {
              family: "'Plus Jakarta Sans', sans-serif",
              size: 11
            },
            padding: 8
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || "";
              const val = context.raw || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((val / total) * 100).toFixed(1);
              return ` ${label}: ${formatCurrency(val)} (${percentage}%)`;
            }
          }
        }
      },
      // Filtro cruzado no clique
      onClick: (event, activeElements) => {
        if (activeElements.length > 0) {
          const idx = activeElements[0].index;
          const clickedKey = rawLabels[idx];
          if (clickedKey && clickedKey !== "Outros") {
            if (isTipo) {
              setFilterValue("natureza", clickedKey);
            } else {
              setFilterValue("deputado", clickedKey);
            }
          }
        }
      }
    }
  });
}

function toggleChartDespesasMode() {
  const btn = document.getElementById("btn-toggle-despesas");
  if (chartModeDespesas === "tipo") {
    chartModeDespesas = "deputado";
    btn.textContent = "Ver por Tipo de Gasto";
  } else {
    chartModeDespesas = "tipo";
    btn.textContent = "Ver por Deputado";
  }
  renderDespesasChart();
}

// -------------------------------------------------------------
// 7. Recursos de Exportação (PDF e CSV)
// -------------------------------------------------------------
function exportToPDF() {
  // 1. Mostrar tabela inteira sem paginação
  renderTable(true);
  
  // 2. Chamar o diálogo de impressão nativo após pequena pausa para renderizar o DOM
  setTimeout(() => {
    window.print();
    
    // 3. Restaurar a tabela paginada original após imprimir/fechar diálogo
    renderTable(false);
  }, 350);
}

function exportToCSV() {
  if (filteredData.length === 0) {
    alert("Não há registros com os filtros atuais para exportação.");
    return;
  }
  
  // Codificação especial UTF-8 BOM (\uFEFF) para garantir caracteres em português no Excel
  let csv = "\uFEFF";
  
  // Cabeçalhos (Ponto e vírgula como separador oficial no formato regional PT-BR)
  csv += "Deputado(a);Partido;Quem Recebeu (Credor);CNPJ;Empenho;Descrição;Tipo de Gasto (Natureza);Tipo de Despesa;Mês;Valor (R$)\n";
  
  // Iterar dados filtrados atuais
  filteredData.forEach(item => {
    // Tratar campos de texto para evitar quebras de linhas ou aspas problemáticas no CSV
    const descTratada = item.descricao
      .replace(/"/g, '""')
      .replace(/\r?\n|\r/g, " ");
      
    const row = [
      formatName(item.deputado),
      item.partido,
      item.credor,
      `"${item.cnpj}"`, // Aspas duplas forçam leitura como texto no Excel preservando CNPJ
      item.empenho,
      `"${descTratada}"`,
      formatName(item.natureza).replace("Dep. ", ""),
      item.tipoDespesa,
      item.periodoTexto,
      item.valor.toFixed(2).replace(".", ",") // Formatação regional com vírgula para centavos
    ];
    csv += row.join(";") + "\n";
  });
  
  // Trigger do download do blob
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  link.setAttribute("href", url);
  link.setAttribute("download", `relatorio_despesas_parlamentares_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
