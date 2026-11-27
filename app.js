/* =========================================================
   ESCOAMENTO CERTO — Lógica Compartilhada entre Páginas HTML
   ========================================================= */

const STORAGE_KEY_REPORTS = "escoamento_certo_reports_v1";
const STORAGE_KEY_AUTH = "escoamento_certo_pmsp_auth_v1";
window.API_BASE = window.API_BASE || (
  window.location.origin.startsWith("http")
    ? window.location.origin
    : "http://127.0.0.1:8000"
);

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
    advice: "Evite transitar próximo às alças de acesso e verifique se há bocas de lobo obstruídas na região.",
    riverRiskScore: 92,
    busLinesCount: 18
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
    advice: "Moradores de ruas baixas devem elevar móveis e itens essenciais preventivamente.",
    riverRiskScore: 89,
    busLinesCount: 24
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
    advice: "Não descarte sacos de lixo nas calçadas antes da coleta para evitar entupimento de bueiros.",
    riverRiskScore: 74,
    busLinesCount: 11
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
    advice: "Continue reportando pontos com acúmulo de entulho para limpeza preventiva.",
    riverRiskScore: 42,
    busLinesCount: 6
  }
];

const INITIAL_REPORTS = [
  {
    id: "EC-2026-001",
    cpf: "12345678901",
    maskedCpf: "123.***.***-01",
    citizenName: "Cidadão (CPF 123.***.***-01)",
    zoneId: "tiete-piqueri",
    zoneName: "Marginal Tietê — Ponte do Piqueri / Freguesia do Ó",
    address: "Rua Manuel Barbosa, 210 — próximo à boca de lobo da esquina",
    problemType: "Lixo e sacolas entupindo boca de lobo",
    description: "Muita sacola plástica e galhos cobrindo a grade do bueiro antes da subida da pista local.",
    importance: 4,
    riverRiskScore: 92,
    busLinesCount: 18,
    status: "Equipe designada",
    assignedTeam: "Equipe Zeladoria Norte 02 (Seu Zé)",
    createdAt: "27/11/2026 08:15",
    photoName: "bueiro_piqueri.jpg"
  },
  {
    id: "EC-2026-002",
    cpf: "98765432100",
    maskedCpf: "987.***.***-00",
    citizenName: "Cidadão (CPF 987.***.***-00)",
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
    cpf: "12345678901",
    maskedCpf: "123.***.***-01",
    citizenName: "Cidadão (CPF 123.***.***-01)",
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
    cpf: "45678912344",
    maskedCpf: "456.***.***-44",
    citizenName: "Cidadão (CPF 456.***.***-44)",
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
    cpf: "78912345699",
    maskedCpf: "789.***.***-99",
    citizenName: "Cidadão (CPF 789.***.***-99)",
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

function onlyDigits(val) {
  return String(val || "").replace(/\D/g, "");
}

function formatCpfMasked(val) {
  const d = onlyDigits(val);
  if (d.length !== 11) return "Não informado";
  return `${d.slice(0, 3)}.***.***-${d.slice(9)}`;
}

function getZoneAreaCriticality(count) {
  if (count >= 4) return { level: "critical", label: `CRÍTICO (${count} reportes na área)`, bonus: 24 };
  if (count >= 2) return { level: "high", label: `ALTO (${count} reportes na área)`, bonus: 14 };
  if (count === 1) return { level: "medium", label: "MODERADO (1 reporte na área)", bonus: 6 };
  return { level: "low", label: "BAIXO (0 reportes na área)", bonus: 0 };
}

function ensureFavicon() {
  if (document.querySelector('link[rel="icon"]')) return;
  const link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/svg+xml";
  link.href = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 28 28'%3E%3Crect width='28' height='28' rx='6' fill='%230f4c81'/%3E%3Cpath d='M14 4C14 4 7.5 11.5 7.5 16.8C7.5 20.4 10.4 23.3 14 23.3C17.6 23.3 20.5 20.4 20.5 16.8C20.5 11.5 14 4 14 4Z' fill='%23ffffff'/%3E%3C/svg%3E";
  document.head.appendChild(link);
}

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
  if (typeof stopSpeech === "function") stopSpeech();
  setPmspLoggedIn(false);
  window.location.href = "index.html";
}

function renderBrandLogoHTML() {
  return `
    <div class="brand-icon" aria-hidden="true">
      <svg width="26" height="26" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 3C14 3 6.5 11.2 6.5 16.8C6.5 20.94 9.86 24.3 14 24.3C18.14 24.3 21.5 20.94 21.5 16.8C21.5 11.2 14 3 14 3Z" fill="white" fill-opacity="0.94"/>
        <path d="M9.5 16.5C11.2 15.2 12.8 17.8 14.5 16.5C16.2 15.2 17.8 17.8 19.5 16.5" stroke="#0f4c81" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
  `;
}

function renderNavbar(activePage) {
  ensureFavicon();
  const logged = isPmspLoggedIn();
  const navContainer = document.getElementById("navbar-mount");
  if (!navContainer) return;

  const restrictedLinks = logged
    ? `
      <a href="gerenciamento.html" class="nav-link ${activePage === "gerenciamento" ? "active" : ""}" onclick="if (typeof stopSpeech === 'function') stopSpeech();">Gerenciar Limpeza</a>
      <a href="dashboard.html" class="nav-link ${activePage === "dashboard" ? "active" : ""}" onclick="if (typeof stopSpeech === 'function') stopSpeech();">Dashboard</a>
      <a href="dashboardPrevisoes.html" class="nav-link ${activePage === "previsoes" ? "active" : ""}" onclick="if (typeof stopSpeech === 'function') stopSpeech();">Previsões</a>
      <button type="button" class="btn-logout" onclick="logoutPmsp()">Sair PMSP</button>
    `
    : `
      <a href="login.html" class="btn-pmsp ${activePage === "login" ? "active" : ""}" onclick="if (typeof stopSpeech === 'function') stopSpeech();">Login PMSP</a>
    `;

  navContainer.innerHTML = `
    <header class="navbar">
      <div class="navbar-inner">
        <a href="index.html" class="brand" onclick="if (typeof stopSpeech === 'function') stopSpeech();">
          ${renderBrandLogoHTML()}
          <div class="brand-text">
            <h1>Escoamento Certo</h1>
            <span>Prefeitura de São Paulo • Zeladoria Preventiva</span>
          </div>
        </a>
        <nav class="nav-links" aria-label="Navegação Principal">
          <a href="index.html" class="nav-link ${activePage === "index" ? "active" : ""}" onclick="if (typeof stopSpeech === 'function') stopSpeech();">Início &amp; Alerta</a>
          <a href="reportar.html" class="nav-link ${activePage === "reportar" ? "active" : ""}" onclick="if (typeof stopSpeech === 'function') stopSpeech();">Novo Reporte</a>
          <a href="acompanhar.html" class="nav-link ${activePage === "acompanhar" ? "active" : ""}" onclick="if (typeof stopSpeech === 'function') stopSpeech();">Acompanhar CPF</a>
          ${restrictedLinks}
        </nav>
      </div>
    </header>
  `;
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

function computePriorityScore(report, zoneReportCount = 1) {
  const impWeight = Number(report.importance || 2) * 25;
  const riverPart = Math.round((Number(report.riverRiskScore || 60) * 0.35));
  const busPart = Math.min(15, Number(report.busLinesCount || 8));
  const areaBonus = getZoneAreaCriticality(zoneReportCount).bonus;
  return impWeight + riverPart + busPart + areaBonus;
}

const isLocalHost =
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "localhost";

window.API_BASE =
  window.API_BASE ||
  (isLocalHost
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : window.location.origin);