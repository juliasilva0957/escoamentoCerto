/* =========================================================
   ESCOAMENTO CERTO — Lógica Compartilhada entre Páginas HTML
   ========================================================= */

const STORAGE_KEY_REPORTS = "escoamento_certo_reports_v1";
const STORAGE_KEY_AUTH = "escoamento_certo_pmsp_auth_v1";

const ZONES_DATA = [
  {
    id: "tiete-piqueri",
    name: "Marginal Tietê — Ponte do Piqueri / Freguesia do Ó",
    lat: -23.5045,
    lng: -46.7012,
    riskLevel: "high",
    riskLabel: "ALTO RISCO DE ALAGAMENTO",
    riverForecast: "Nível do Rio Tietê em elevação (+1,45m com margem de cautela). Pico previsto em 2h30.",
    busImpact: "18 linhas de ônibus municipais e intermunicipais afetadas no corredor.",
    advice: "Evite transitar próximo às alças de acesso e verifique se há bocas de lobo obstruídas na região."
  },
  {
    id: "tiete-vila-maria",
    name: "Marginal Tietê — Vila Maria / Ponte das Bandeiras",
    lat: -23.5162,
    lng: -46.6098,
    riskLevel: "high",
    riskLabel: "ALTO RISCO DE ALAGAMENTO",
    riverForecast: "Previsão corrigida indica acúmulo rápido nas pistas locais nas próximas 2 horas.",
    busImpact: "24 linhas de transporte coletivo e terminais de conexão impactados.",
    advice: "Moradores de ruas baixas devem elevar móveis e itens essenciais preventivamente."
  },
  {
    id: "tiete-penha",
    name: "Marginal Tietê — Penha / Tatuapé",
    lat: -23.5238,
    lng: -46.5482,
    riskLevel: "medium",
    riskLabel: "ATENÇÃO — RISCO MODERADO",
    riverForecast: "Chuva moderada prevista na bacia leste; margem de cautela ativada para drenagem.",
    busImpact: "11 linhas de ônibus monitoradas nos acessos à Radial e Marginal.",
    advice: "Não descarte sacos de lixo nas calçadas antes da coleta para evitar entupimento de bueiros."
  },
  {
    id: "zona-sul-campo-limpo",
    name: "Campo Limpo / Capão Redondo (Afluentes)",
    lat: -23.6485,
    lng: -46.7582,
    riskLevel: "low",
    riskLabel: "SITUAÇÃO CONTROLADA",
    riverForecast: "Nível dos córregos dentro da normalidade nas próximas 4 horas.",
    busImpact: "Operação normal nos corredores locais.",
    advice: "Continue reportando pontos com acúmulo de entulho para limpeza preventiva."
  }
];

const INITIAL_REPORTS = [
  {
    id: "EC-2026-001",
    cpf: "111.222.333-44",
    citizenName: "Dona Lúcia",
    zoneId: "tiete-piqueri",
    zoneName: "Marginal Tietê — Ponte do Piqueri / Freguesia do Ó",
    address: "Rua Manuel Barbosa, 210 — próximo à boca de lobo da esquina",
    problemType: "Lixo e sacolas entupindo boca de lobo",
    description: "Muita sacola plástica e galhos cobrindo a grade do bueiro antes da subida da pista local.",
    importance: 4, // 4 = Crítica, 3 = Alta, 2 = Média, 1 = Baixa
    riverRiskScore: 92,
    busLinesCount: 18,
    status: "Equipe designada",
    assignedTeam: "Equipe Zeladoria Norte 02 (Seu Zé)",
    createdAt: "27/11/2026 08:15",
    photoName: "bueiro_piqueri.jpg"
  },
  {
    id: "EC-2026-002",
    cpf: "555.666.777-88",
    citizenName: "Carlos Eduardo",
    zoneId: "tiete-vila-maria",
    zoneName: "Marginal Tietê — Vila Maria / Ponte das Bandeiras",
    address: "Av. Morvan Dias de Figueiredo, altura nº 1450",
    problemType: "Entulho e móveis bloqueando sarjeta",
    description: "Sofá velho e restos de obra bloqueando o escoamento lateral próximo ao ponto de ônibus.",
    importance: 4,
    riverRiskScore: 89,
    busLinesCount: 24,
    status: "Em triagem",
    assignedTeam: "Aguardando despacho",
    createdAt: "27/11/2026 09:10",
    photoName: "sarjeta_vilamaria.jpg"
  },
  {
    id: "EC-2026-003",
    cpf: "111.222.333-44",
    citizenName: "Dona Lúcia",
    zoneId: "tiete-penha",
    zoneName: "Marginal Tietê — Penha / Tatuapé",
    address: "Rua Guaiaúna, 480 — acesso Marginal",
    problemType: "Boca de lobo assoreada com terra e folhas",
    description: "Água demorando para descer mesmo em chuva fraca.",
    importance: 3,
    riverRiskScore: 74,
    busLinesCount: 11,
    status: "Em triagem",
    assignedTeam: "Aguardando despacho",
    createdAt: "27/11/2026 10:05",
    photoName: "ralo_penha.jpg"
  },
  {
    id: "EC-2026-004",
    cpf: "999.888.777-66",
    citizenName: "Mariana Souza",
    zoneId: "tiete-piqueri",
    zoneName: "Marginal Tietê — Ponte do Piqueri / Freguesia do Ó",
    address: "Av. Raimundo Pereira de Magalhães, 920",
    problemType: "Acúmulo de lixo em ponto viciado",
    description: "Descarte irregular próximo à galeria pluvial; limpeza preventiva realizada.",
    importance: 3,
    riverRiskScore: 85,
    busLinesCount: 15,
    status: "Concluído",
    assignedTeam: "Equipe Zeladoria Norte 01",
    createdAt: "26/11/2026 15:40",
    photoName: "limpeza_concluida.jpg"
  },
  {
    id: "EC-2026-005",
    cpf: "222.333.444-55",
    citizenName: "João Pedro",
    zoneId: "zona-sul-campo-limpo",
    zoneName: "Campo Limpo / Capão Redondo (Afluentes)",
    address: "Estrada do Campo Limpo, 3100",
    problemType: "Folhas e resíduos leves na grelha",
    description: "Acúmulo leve na grade lateral da via.",
    importance: 2,
    riverRiskScore: 42,
    busLinesCount: 6,
    status: "Concluído",
    assignedTeam: "Equipe Zeladoria Sul 04",
    createdAt: "26/11/2026 11:20",
    photoName: "grelha_campolimpo.jpg"
  }
];

function getReports() {
  const raw = localStorage.getItem(STORAGE_KEY_REPORTS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(INITIAL_REPORTS));
    return [...INITIAL_REPORTS];
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [...INITIAL_REPORTS];
  }
}

function saveReports(reports) {
  localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(reports));
}

function isPmspLoggedIn() {
  return localStorage.getItem(STORAGE_KEY_AUTH) === "true";
}

function setPmspLoggedIn(logged, userName = "Marina (Defesa Civil / PMSP)") {
  if (logged) {
    localStorage.setItem(STORAGE_KEY_AUTH, "true");
    localStorage.setItem("escoamento_certo_pmsp_user", userName);
  } else {
    localStorage.removeItem(STORAGE_KEY_AUTH);
    localStorage.removeItem("escoamento_certo_pmsp_user");
  }
}

function logoutPmsp() {
  setPmspLoggedIn(false);
  window.location.href = "index.html";
}

function renderNavbar(activePage) {
  const logged = isPmspLoggedIn();
  const navContainer = document.getElementById("navbar-mount");
  if (!navContainer) return;

  const restrictedLinks = logged
    ? `
      <a href="gerenciamento.html" class="nav-link ${activePage === "gerenciamento" ? "active" : ""}">Gerenciar Limpeza</a>
      <a href="dashboard.html" class="nav-link ${activePage === "dashboard" ? "active" : ""}">Dashboard</a>
      <button type="button" class="btn-logout" onclick="logoutPmsp()">Sair PMSP</button>
    `
    : `
      <a href="login.html" class="btn-pmsp ${activePage === "login" ? "active" : ""}">Login PMSP</a>
    `;

  navContainer.innerHTML = `
    <header class="navbar">
      <div class="navbar-inner">
        <a href="index.html" class="brand">
          <div class="brand-icon">EC</div>
          <div class="brand-text">
            <h1>Escoamento Certo</h1>
            <span>Prefeitura de São Paulo • Zeladoria Preventiva</span>
          </div>
        </a>
        <nav class="nav-links" aria-label="Navegação Principal">
          <a href="index.html" class="nav-link ${activePage === "index" ? "active" : ""}">Início & Alerta</a>
          <a href="reportar.html" class="nav-link ${activePage === "reportar" ? "active" : ""}">Novo Reporte</a>
          <a href="acompanhar.html" class="nav-link ${activePage === "acompanhar" ? "active" : ""}">Acompanhar CPF</a>
          ${restrictedLinks}
        </nav>
      </div>
    </header>
  `;
}

function formatCPF(value) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function normalizeCPF(value) {
  return value.replace(/\D/g, "");
}

function getImportanceMeta(level) {
  const num = Number(level);
  if (num === 4) {
    return { level: 4, label: "Crítica (Urgência Máxima)", badgeClass: "pill-critical", cardClass: "imp-critica", weight: 100 };
  }
  if (num === 3) {
    return { level: 3, label: "Alta Importância", badgeClass: "pill-high", cardClass: "imp-alta", weight: 75 };
  }
  if (num === 2) {
    return { level: 2, label: "Média Importância", badgeClass: "pill-medium", cardClass: "imp-media", weight: 50 };
  }
  return { level: 1, label: "Baixa Importância", badgeClass: "pill-low", cardClass: "imp-baixa", weight: 25 };
}

function computePriorityScore(report) {
  const impWeight = Number(report.importance || 2) * 25; // up to 100
  const riverPart = Math.round((Number(report.riverRiskScore || 60) * 0.4)); // up to 40
  const busPart = Math.min(20, Number(report.busLinesCount || 8)); // up to 20
  return impWeight + riverPart + busPart;
}
