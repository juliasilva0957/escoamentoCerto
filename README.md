# 🌊 Escoamento Certo — Prefeitura de São Paulo (PMSP)

**Limpeza preventiva de drenagem urbana com margem de cautela hidrológica, priorização por criticidade da área e acessibilidade integrada.**

O **Escoamento Certo** cruza previsões hidrológicas com margem de cautela, ocorrências enviadas por cidadãos (com acompanhamento por CPF) e a concentração de reportes por região para apoiar a Defesa Civil, equipes de zeladoria e a população na prevenção de alagamentos antes que travem os ônibus e as vias.

---

## 🎯 O Problema

Ao cruzar **3.469 registros pareados** (dez/2023 a fev/2026) entre previsões hidrológicas e observações oficiais da ANA em sete estações fluviométricas, o erro absoluto médio (MAE) global parece baixo (**0,126 m**), mas esconde uma **assimetria direcional crítica**:

* **Subestimação na subida dos rios:** Em **100% das estações avaliadas**, a previsão subestima o nível da água durante regimes de subida ($\Delta > +2\text{ cm/dia}$), chegando a um viés médio de **-0,309 m** (e picos de **-2,62 m**) na estação `ANA_13578000`.
* **Inércia na descida (recessão):** Em rios de grande porte como o Solimões (`ANA_12351000`), o modelo tende a superestimar o nível durante a vazante (viés médio de **+0,465 m**)[cite: 10].
* **Lacunas temporais:** A base contém **213 interrupções** de continuidade diária (saltos de até 108 dias), exigindo tratamento adequado antes de calcular variações[cite: 10].

Na prática urbana, confiar apenas na previsão bruta atrasa o acionamento da limpeza preventiva: quando o alerta dispara tarde, bocas de lobo e sarjetas já estão obstruídas.

---

## 💡 Funcionalidades e Arquitetura

O sistema reúne portal cidadão, acompanhamento individual por CPF, priorização operacional e painéis de análise:

1. **Alerta Preventivo por GPS ou Região (`index.html`):** Exibe risco hidrológico com margem de cautela, impacto em linhas de ônibus e orientações por região (como Marginal Tietê — Ponte do Piqueri / Freguesia do Ó, Vila Maria / Ponte das Bandeiras, Penha / Tatuapé e Campo Limpo / Capão Redondo).
2. **Reporte e Acompanhamento por CPF (`reportar.html` e `acompanhar.html`):** O cidadão informa o CPF (11 dígitos) ao registrar lixo, entulho, assoreamento ou empoçamento (com foto opcional e proteção reCAPTCHA) e consulta na tela *Acompanhar CPF* os chamados que enviou (com visualização mascarada do CPF).
3. **Criticidade Crescente por Volume de Reportes na Área:** Quanto mais reportes existem em uma mesma região, maior fica a criticidade da área e o bônus no score de priorização.
4. **Gestão de Limpeza e Despacho PMSP (`login.html` e `gerenciamento.html`):** Acesso restrito a usuários autenticados da PMSP para classificar a importância dos chamados (1 a 4), designar equipes de zeladoria e concluir limpezas.
5. **Dashboard Operacional e Mapa de Calor (`dashboard.html`):** Apresenta KPIs de limpezas feitas e pendentes, distribuição por importância e **mapa de calor por volume de reportes na região**.
6. **Dashboard de Previsões (`dashboardPrevisoes.html`):** Exibe métricas por estação a partir de `backend/data/forecast_vs_ana.csv`, margem de cautela na subida, lacunas entre datas e semáforo de confiança.
7. **Acessibilidade Integrada (`accessibility.js`):** Barra de acessibilidade com modos de daltonismo e alto contraste, audiodescrição, leitura de tela com **Ler Tela / Pausar / Continuar / Parar** e apoio em **Libras** (incluindo widget VLibras).

---

## 📊 Resumo Diagnóstico da Base (`forecast_vs_ana.csv`)

Métricas calculadas considerando dias consecutivos (`gap = 1 dia`) para classificação de regime[cite: 10]:

| Estação | Registros ($N$) | Lacunas (>1d) | MAE Global | Viés na Subida | Viés na Descida | Viés Nível Alto (P90) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `ANA_12351000` | 425 | 20 | 0,293 m | -0,091 m | +0,465 m | -0,015 m |
| `ANA_13578000` | 507 | 29 | 0,234 m | **-0,309 m** | +0,013 m | **-0,651 m** |
| `ANA_66910000` | 530 | 25 | 0,107 m | -0,128 m | +0,046 m | -0,132 m |
| `ANA_71350001` | 472 | 23 | 0,095 m | -0,097 m | +0,043 m | -0,012 m |
| `ANA_34251000` | 395 | 24 | 0,082 m | -0,146 m | +0,081 m | -0,027 m |
| `ANA_27110000` | 567 | 50 | 0,067 m | -0,132 m | -0,002 m | -0,074 m |
| `ANA_66070004` | 573 | 42 | 0,040 m | -0,033 m | +0,027 m | -0,006 m |[cite: 10]

---

## 🗂️ Estrutura do Projeto

```text
escoamentoCerto/
├── backend/
│   ├── data/
│   │   └── forecast_vs_ana.csv
│   ├── main.py
│   └── requirements.txt
├── index.html
├── reportar.html
├── acompanhar.html
├── login.html
├── gerenciamento.html
├── dashboard.html
├── dashboardPrevisoes.html
├── app.js
├── accessibility.js
├── style.css
├── dashboardPrevisoes.css
├── pyproject.toml
└── README.md