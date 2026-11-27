# 🌊 Ralo em Alerta

**Priorização preventiva de limpeza de drenagem urbana com margem de cautela hidrológica e semáforo de confiança.**

O **Ralo em Alerta** transforma previsões de nível dos rios da *Google Flood Forecasting API* e medições históricas da Agência Nacional de Águas e Saneamento Básico (**ANA**) em inteligência operacional para Defesa Civil, equipes de zeladoria e cidadãos — sem precisar treinar um novo modelo hidrológico do zero.

---

## 🎯 O Problema

Ao cruzar **3.469 registros pareados** (dez/2023 a fev/2026) entre as previsões da API do Google e as observações oficiais da ANA em sete estações fluviométricas brasileiras, o erro absoluto médio (MAE) global parece baixo (**0,126 m**). No entanto, essa média esconde uma **assimetria direcional crítica**:

* **Subestimação na subida dos rios:** Em **100% das estações avaliadas**, a API subestima o nível da água durante regimes de subida ($\Delta > +2\text{ cm/dia}$), chegando a um viés médio de **-0,309 m** (e picos de **-2,62 m**) na estação `ANA_13578000` (Bacia do Acre/Purus).
* **Inércia na descida (recessão):** Em rios de grande porte como o Solimões (`ANA_12351000`), o modelo superestima o nível durante a vazante (viés médio de **+0,465 m**).
* **Lacunas temporais:** A base contém **213 interrupções** de continuidade diária (saltos de até 108 dias sem registro pareado), exigindo tratamento rigoroso antes de calcular taxas de variação.

Na prática urbana, confiar na previsão bruta atrasa o acionamento da zeladoria: quando o alerta dispara, os ralos críticos já estão obstruídos e o alagamento já começou.

---

## 💡 A Solução: Como Funciona

O sistema atua como uma camada de auditoria, cautela estatística e priorização operacional dividida em 6 pilares:

1. **Gatilho Antecipado com Margem de Cautela Assimétrica:** Quando a previsão aponta subida, o sistema soma a margem histórica de subestimação daquela estação específica, antecipando o alerta de limpeza preventiva antes do pico.
2. **Mapa de Risco dos Ralos:** Combina o nível previsto corrigido com o histórico de entupimento (chamados do 156/zeladoria) e fatores urbanos (geração de resíduos, feiras livres, vias comerciais e terrenos baldios).
3. **Rota de Limpeza do Dia (24–48 h):** Gera uma fila enxuta e ordenada por criticidade para as equipes de campo, substituindo o atendimento reativo por ordem de chegada.
4. **Aplicativo do Cidadão (Ciclo Fechado):** Moradores enviam foto georreferenciada do ralo (*limpo*, *parcial* ou *bloqueado*) e recebem retorno de status após a execução do serviço, além de alertas preventivos no celular.
5. **Semáforo de Confiança Operacional:** Indica em tempo real se a previsão está em regime de alta confiabilidade ou se exige checagem na régua local (por histórico de viés elevado ou lacuna recente na série).
6. **Painel de Prestação de Contas:** Compara quantos ralos críticos foram limpos antes de cada evento de subida e a redução de ocorrências registradas depois.

---

## 👥 Personas Atendidas

| Persona | Papel | Dor Principal | Solução no Ralo em Alerta |
| :--- | :--- | :--- | :--- |
| **Marina** | Coordenadora da Defesa Civil | Só descobre o ralo entupido quando a via já alagou. | Alerta antecipado com semáforo de confiança direto ao ponto. |
| **Seu Zé** | Chefe de Equipe de Zeladoria | Recebe centenas de chamados sem critério e limpa por ordem de chegada. | Roteiro diário enxuto (24–48 h) priorizado por risco real. |
| **Dona Lúcia** | Moradora de área alagável | Reporta problemas à prefeitura sem retorno e perde bens a cada cheia. | Reporte por foto com feedback de conclusão e aviso antecipado. |
| **Rafael** | Analista de Sala de Situação | Valida previsões manualmente sem visão segmentada por fase do rio. | Diagnóstico automatizado por regime (subida, descida, nível alto) e auditoria de lacunas. |

---

## 📊 Resumo Diagnóstico da Base Real (`forecast_vs_ana.csv`)

Métricas calculadas considerando estritamente dias consecutivos (`gap = 1 dia`) para classificação de regime:

| Estação | Registros ($N$) | Lacunas (>1d) | MAE Global | Viés na Subida | Viés na Descida | Viés Nível Alto (P90) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `ANA_12351000` | 425 | 20 | 0,293 m | -0,091 m | +0,465 m | -0,015 m |
| `ANA_13578000` | 507 | 29 | 0,234 m | **-0,309 m** | +0,013 m | **-0,651 m** |
| `ANA_66910000` | 530 | 25 | 0,107 m | -0,128 m | +0,046 m | -0,132 m |
| `ANA_71350001` | 472 | 23 | 0,095 m | -0,097 m | +0,043 m | -0,012 m |
| `ANA_34251000` | 395 | 24 | 0,082 m | -0,146 m | +0,081 m | -0,027 m |
| `ANA_27110000` | 567 | 50 | 0,067 m | -0,132 m | -0,002 m | -0,074 m |
| `ANA_66070004` | 573 | 42 | 0,040 m | -0,033 m | +0,027 m | -0,006 m |

---

## 🗂️ Transparência de Dados & Ressalvas Metodológicas

Para garantir rigor técnico e governança pública, o sistema separa explicitamente o que é dado empírico do que é camada de simulação no MVP:

* **Dados Reais (Base Oficial):** Séries pareadas de previsão (`forecast_api_m`) e observação (`observado_ana_m`), cálculo de erro por regime hidrológico, viés de subida e mapeamento de lacunas temporais (baseada em *Heleno et al., 2026*).
* **Dados Simulados / Externos (Rotulados no MVP):** Geolocalização de bocas de lobo/ralos, chamados históricos do 156, mapas de geração de resíduos e precipitação local (inseridos via dados abertos municipais ou dados sintéticos devidamente sinalizados).
* **Limitações e Boas Práticas:**
  * Níveis elevados na série histórica **não significam automaticamente inundação** — cotas de transbordamento dependem de referências locais validadas por hidrólogos e pela Defesa Civil.
  * Os resultados referem-se exclusivamente às **7 estações analisadas** e não devem ser generalizados para todo o território nacional sem calibração local.
  * Médias diárias suavizam o comportamento hidrológico e **não capturam picos intradiários** ou enxurradas causadas por chuva convectiva intensa local.

---

## 🚀 Como Executar o Projeto Localmente

```bash
# 1. Clone o repositório
git clone [https://github.com/seu-usuario/ralo-em-alerta.git](https://github.com/seu-usuario/ralo-em-alerta.git)
cd ralo-em-alerta

# 2. Crie e ative um ambiente virtual
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate   # Windows

# 3. Instale as dependências
pip install -r requirements.txt

# 4. Execute a aplicação
streamlit run app.py
