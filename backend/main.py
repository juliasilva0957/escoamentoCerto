from collections import defaultdict
import csv
from datetime import datetime
import json
import math
import os
import re
import sqlite3
import statistics
from typing import Optional
import urllib.parse
import urllib.request

import os

INTERNAL_BACKEND_URL = os.getenv("BACKEND_URL")

from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))
DB_PATH = os.path.join(BASE_DIR, "escoamento_certo.db")
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
CSV_PATH = os.path.join(BASE_DIR, "data", "forecast_vs_ana.csv")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.dirname(CSV_PATH), exist_ok=True)

RECAPTCHA_SECRET_KEY = os.getenv("RECAPTCHA_SECRET_KEY", "").strip()
ALLOW_DEV_RECAPTCHA_BYPASS = os.getenv("ALLOW_DEV_RECAPTCHA_BYPASS", "true").lower() == "true"

app = FastAPI(title="Escoamento Certo API", version="1.5.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

ZONES_DATA = [
    {
        "id": "tiete-piqueri",
        "name": "Marginal Tietê — Ponte do Piqueri / Freguesia do Ó",
        "lat": -23.5045,
        "lng": -46.7012,
        "riskLevel": "high",
        "riskLabel": "ALTO RISCO DE ALAGAMENTO",
        "riverForecast": "Nível do Rio Tietê em elevação (+1,45m com margem de cautela). Pico previsto em 2h30.",
        "busImpact": "18 linhas de ônibus municipais e intermunicipais afetadas no corredor.",
        "advice": "Evite transitar próximo às alças de acesso e verifique se há bocas de lobo obstruídas na região.",
        "riverRiskScore": 92,
        "busLinesCount": 18,
    },
    {
        "id": "tiete-vila-maria",
        "name": "Marginal Tietê — Vila Maria / Ponte das Bandeiras",
        "lat": -23.5162,
        "lng": -46.6098,
        "riskLevel": "high",
        "riskLabel": "ALTO RISCO DE ALAGAMENTO",
        "riverForecast": "Previsão corrigida indica acúmulo rápido nas pistas locais nas próximas 2 horas.",
        "busImpact": "24 linhas de transporte coletivo e terminais de conexão impactados.",
        "advice": "Moradores de ruas baixas devem elevar móveis e itens essenciais preventivamente.",
        "riverRiskScore": 89,
        "busLinesCount": 24,
    },
    {
        "id": "tiete-penha",
        "name": "Marginal Tietê — Penha / Tatuapé",
        "lat": -23.5238,
        "lng": -46.5482,
        "riskLevel": "medium",
        "riskLabel": "ATENÇÃO — RISCO MODERADO",
        "riverForecast": "Chuva moderada prevista na bacia leste; margem de cautela ativada para drenagem.",
        "busImpact": "11 linhas de ônibus monitoradas nos acessos à Radial e Marginal.",
        "advice": "Não descarte sacos de lixo nas calçadas antes da coleta para evitar entupimento de bueiros.",
        "riverRiskScore": 74,
        "busLinesCount": 11,
    },
    {
        "id": "zona-sul-campo-limpo",
        "name": "Campo Limpo / Capão Redondo (Afluentes)",
        "lat": -23.6485,
        "lng": -46.7582,
        "riskLevel": "low",
        "riskLabel": "SITUAÇÃO CONTROLADA",
        "riverForecast": "Nível dos córregos dentro da normalidade nas próximas 4 horas.",
        "busImpact": "Operação normal nos corredores locais.",
        "advice": "Continue reportando pontos com acúmulo de entulho para limpeza preventiva.",
        "riverRiskScore": 42,
        "busLinesCount": 6,
    },
]

INITIAL_REPORTS = [
    {
        "id": "EC-2026-001",
        "cpf": "12345678901",
        "citizenName": "Cidadão (CPF 123.***.***-01)",
        "zoneId": "tiete-piqueri",
        "zoneName": "Marginal Tietê — Ponte do Piqueri / Freguesia do Ó",
        "address": "Rua Manuel Barbosa, 210 — próximo à boca de lobo da esquina",
        "problemType": "Lixo e sacolas entupindo boca de lobo",
        "description": "Muita sacola plástica e galhos cobrindo a grade do bueiro antes da subida da pista local.",
        "importance": 4,
        "riverRiskScore": 92,
        "busLinesCount": 18,
        "status": "Equipe designada",
        "assignedTeam": "Equipe Zeladoria Norte 02 (Seu Zé)",
        "createdAt": "27/11/2026 08:15",
        "photoName": "bueiro_piqueri.jpg",
    },
    {
        "id": "EC-2026-002",
        "cpf": "98765432100",
        "citizenName": "Cidadão (CPF 987.***.***-00)",
        "zoneId": "tiete-vila-maria",
        "zoneName": "Marginal Tietê — Vila Maria / Ponte das Bandeiras",
        "address": "Av. Morvan Dias de Figueiredo, altura nº 1450",
        "problemType": "Entulho e móveis bloqueando sarjeta",
        "description": "Sofá velho e restos de obra bloqueando o escoamento lateral próximo ao ponto de ônibus.",
        "importance": 4,
        "riverRiskScore": 89,
        "busLinesCount": 24,
        "status": "Em triagem",
        "assignedTeam": "Aguardando despacho",
        "createdAt": "27/11/2026 09:10",
        "photoName": "sarjeta_vilamaria.jpg",
    },
    {
        "id": "EC-2026-003",
        "cpf": "12345678901",
        "citizenName": "Cidadão (CPF 123.***.***-01)",
        "zoneId": "tiete-penha",
        "zoneName": "Marginal Tietê — Penha / Tatuapé",
        "address": "Rua Guaiaúna, 480 — acesso Marginal",
        "problemType": "Boca de lobo assoreada com terra e folhas",
        "description": "Água demorando para descer mesmo em chuva fraca.",
        "importance": 3,
        "riverRiskScore": 74,
        "busLinesCount": 11,
        "status": "Em triagem",
        "assignedTeam": "Aguardando despacho",
        "createdAt": "27/11/2026 10:05",
        "photoName": "ralo_penha.jpg",
    },
    {
        "id": "EC-2026-004",
        "cpf": "45678912344",
        "citizenName": "Cidadão (CPF 456.***.***-44)",
        "zoneId": "tiete-piqueri",
        "zoneName": "Marginal Tietê — Ponte do Piqueri / Freguesia do Ó",
        "address": "Av. Raimundo Pereira de Magalhães, 920",
        "problemType": "Acúmulo de lixo em ponto viciado",
        "description": "Descarte irregular próximo à galeria pluvial; limpeza preventiva realizada.",
        "importance": 3,
        "riverRiskScore": 85,
        "busLinesCount": 15,
        "status": "Concluído",
        "assignedTeam": "Equipe Zeladoria Norte 01",
        "createdAt": "26/11/2026 15:40",
        "photoName": "limpeza_concluida.jpg",
    },
    {
        "id": "EC-2026-005",
        "cpf": "78912345699",
        "citizenName": "Cidadão (CPF 789.***.***-99)",
        "zoneId": "zona-sul-campo-limpo",
        "zoneName": "Campo Limpo / Capão Redondo (Afluentes)",
        "address": "Estrada do Campo Limpo, 3100",
        "problemType": "Folhas e resíduos leves na grelha",
        "description": "Acúmulo leve na grade lateral da via.",
        "importance": 2,
        "riverRiskScore": 42,
        "busLinesCount": 6,
        "status": "Concluído",
        "assignedTeam": "Equipe Zeladoria Sul 04",
        "createdAt": "26/11/2026 11:20",
        "photoName": "grelha_campolimpo.jpg",
    },
]


def normalize_cpf(cpf: Optional[str]) -> str:
    return re.sub(r"\D", "", cpf or "")


def mask_cpf(cpf: Optional[str]) -> str:
    digits = normalize_cpf(cpf)
    if len(digits) != 11:
        return "Não informado"
    return f"{digits[:3]}.***.***-{digits[-2:]}"


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS reports (
                id TEXT PRIMARY KEY,
                cpf TEXT NOT NULL DEFAULT '00000000000',
                citizenName TEXT NOT NULL,
                zoneId TEXT NOT NULL,
                zoneName TEXT NOT NULL,
                address TEXT NOT NULL,
                problemType TEXT NOT NULL,
                description TEXT NOT NULL,
                importance INTEGER NOT NULL,
                riverRiskScore INTEGER NOT NULL,
                busLinesCount INTEGER NOT NULL,
                status TEXT NOT NULL,
                assignedTeam TEXT NOT NULL,
                createdAt TEXT NOT NULL,
                photoName TEXT NOT NULL
            )
            """
        )
        cols = [c["name"] for c in conn.execute("PRAGMA table_info(reports)").fetchall()]
        if "cpf" not in cols:
            conn.execute("ALTER TABLE reports ADD COLUMN cpf TEXT NOT NULL DEFAULT '00000000000'")

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS accessibility_prefs (
                sessionId TEXT PRIMARY KEY,
                colorBlindMode TEXT NOT NULL DEFAULT 'none',
                audioDescription BOOLEAN NOT NULL DEFAULT 0,
                librasEnabled BOOLEAN NOT NULL DEFAULT 0,
                updatedAt TEXT NOT NULL
            )
            """
        )
        count = conn.execute("SELECT COUNT(*) AS c FROM reports").fetchone()["c"]
        if count == 0:
            for r in INITIAL_REPORTS:
                conn.execute(
                    """
                    INSERT INTO reports (
                        id, cpf, citizenName, zoneId, zoneName, address,
                        problemType, description, importance, riverRiskScore,
                        busLinesCount, status, assignedTeam, createdAt, photoName
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        r["id"],
                        r["cpf"],
                        r["citizenName"],
                        r["zoneId"],
                        r["zoneName"],
                        r["address"],
                        r["problemType"],
                        r["description"],
                        r["importance"],
                        r["riverRiskScore"],
                        r["busLinesCount"],
                        r["status"],
                        r["assignedTeam"],
                        r["createdAt"],
                        r["photoName"],
                    ),
                )
        conn.commit()


init_db()


def get_zone_report_counts(conn: sqlite3.Connection) -> dict[str, dict[str, int]]:
    rows = conn.execute("SELECT zoneId, status FROM reports").fetchall()
    counts: dict[str, dict[str, int]] = defaultdict(lambda: {"total": 0, "pending": 0})
    for r in rows:
        zid = r["zoneId"]
        counts[zid]["total"] += 1
        if r["status"] != "Concluído":
            counts[zid]["pending"] += 1
    return counts


def zone_criticality_from_count(report_count: int) -> tuple[str, str, int]:
    if report_count >= 4:
        return "critical", f"CRÍTICO ({report_count} reportes na área)", 24
    if report_count >= 2:
        return "high", f"ALTO ({report_count} reportes na área)", 14
    if report_count == 1:
        return "medium", "MODERADO (1 reporte na área)", 6
    return "low", "BAIXO (0 reportes na área)", 0


def compute_priority_score(row: dict, zone_total_reports: int = 1) -> int:
    imp_weight = int(row.get("importance") or 2) * 25
    river_part = round(int(row.get("riverRiskScore") or 60) * 0.35)
    bus_part = min(15, int(row.get("busLinesCount") or 8))
    _, _, area_bonus = zone_criticality_from_count(zone_total_reports)
    return imp_weight + river_part + bus_part + area_bonus


def build_audio_description(data: dict) -> str:
    imp_labels = {4: "crítica", 3: "alta", 2: "média", 1: "baixa"}
    imp_txt = imp_labels.get(int(data.get("importance", 2)), "média")
    return (
        f"Chamado {data['id']}, status {data['status']}, importância {imp_txt}. "
        f"Região {data['zoneName']} com {data['zoneReportCount']} reportes ({data['zoneCriticalityLabel']}). "
        f"Endereço {data['address']}. Problema: {data['problemType']}. Equipe: {data['assignedTeam']}."
    )


def serialize_report(row: sqlite3.Row, zone_counts: dict[str, dict[str, int]]) -> dict:
    data = dict(row)
    z_info = zone_counts.get(data["zoneId"], {"total": 1, "pending": 0})
    z_total = z_info["total"]
    crit_key, crit_label, _ = zone_criticality_from_count(z_total)
    data["zoneReportCount"] = z_total
    data["zonePendingCount"] = z_info["pending"]
    data["zoneCriticalityLevel"] = crit_key
    data["zoneCriticalityLabel"] = crit_label
    data["maskedCpf"] = mask_cpf(data.get("cpf"))
    data.pop("cpf", None)
    data["priorityScore"] = compute_priority_score(data, z_total)
    data["audioDescription"] = build_audio_description(data)
    return data


def verify_recaptcha(token: Optional[str]) -> bool:
    if RECAPTCHA_SECRET_KEY:
        if not token:
            return False
        body = urllib.parse.urlencode({
            "secret": RECAPTCHA_SECRET_KEY,
            "response": token,
        }).encode("utf-8")
        req = urllib.request.Request(
            "https://www.google.com/recaptcha/api/siteverify",
            data=body,
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            result = json.loads(resp.read().decode("utf-8"))
        return bool(result.get("success"))
    return ALLOW_DEV_RECAPTCHA_BYPASS and bool(token and token.strip())


def _parse_pt_float(val: str) -> float:
    return float(val.strip().replace(",", "."))


def _parse_date(val: str) -> datetime:
    s = val.strip()
    for fmt in ("%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%d/%m/%Y"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return datetime.fromisoformat(s)


def _quantile_linear(values: list[float], q: float) -> float:
    if not values:
        return 0.0
    s = sorted(values)
    n = len(s)
    if n == 1:
        return float(s[0])
    pos = q * (n - 1)
    lo = int(math.floor(pos))
    hi = int(math.ceil(pos))
    if lo == hi:
        return float(s[lo])
    return float(s[lo] + (pos - lo) * (s[hi] - s[lo]))


def load_hydrology_metrics() -> list[dict]:
    if not os.path.exists(CSV_PATH):
        return []

    by_station = defaultdict(list)
    with open(CSV_PATH, mode="r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            est = (row.get("estacao") or "").strip()
            dt_raw = (row.get("data") or "").strip()
            fc_raw = (row.get("forecast_api_m") or "").strip()
            obs_raw = (row.get("observado_ana_m") or "").strip()
            if not est or not dt_raw or not fc_raw or not obs_raw:
                continue
            try:
                dt = _parse_date(dt_raw)
                fc = _parse_pt_float(fc_raw)
                obs = _parse_pt_float(obs_raw)
            except ValueError:
                continue
            by_station[est].append({
                "data": dt,
                "forecast": fc,
                "observado": obs,
                "erro": fc - obs,
                "erro_abs": abs(fc - obs),
            })

    results = []
    for est in sorted(by_station.keys()):
        rows = sorted(by_station[est], key=lambda r: r["data"])
        if not rows:
            continue

        obs_values = [r["observado"] for r in rows]
        p90 = _quantile_linear(obs_values, 0.90)

        lacunas_count = 0
        max_gap = 1
        subida_errors = []
        descida_errors = []
        elevado_errors = []

        prev_dt = None
        prev_obs = None

        for r in rows:
            dt = r["data"]
            obs = r["observado"]
            err = r["erro"]

            if obs >= p90:
                elevado_errors.append(err)

            if prev_dt is not None and prev_obs is not None:
                gap_days = (dt - prev_dt).days
                if gap_days > max_gap:
                    max_gap = gap_days
                if gap_days > 1:
                    lacunas_count += 1
                elif gap_days == 1:
                    diff_obs = obs - prev_obs
                    if diff_obs > 0.02:
                        subida_errors.append(err)
                    elif diff_obs < -0.02:
                        descida_errors.append(err)

            prev_dt = dt
            prev_obs = obs

        mae = statistics.mean(r["erro_abs"] for r in rows)
        bias = statistics.mean(r["erro"] for r in rows)
        rmse = math.sqrt(statistics.mean(r["erro"] ** 2 for r in rows))

        subida_bias = statistics.mean(subida_errors) if subida_errors else 0.0
        descida_bias = statistics.mean(descida_errors) if descida_errors else 0.0
        elevado_bias = statistics.mean(elevado_errors) if elevado_errors else 0.0

        caution_margin_m = round(abs(min(0.0, subida_bias)), 3)

        if mae >= 0.20 or lacunas_count >= 40:
            confidence_level = "atencao"
            confidence_label = "ATENÇÃO — Confirmar com régua local"
        elif mae >= 0.09 or lacunas_count >= 25:
            confidence_level = "moderada"
            confidence_label = "CONFIANÇA MODERADA — Aplicar margem de cautela"
        else:
            confidence_level = "alta"
            confidence_label = "ALTA CONFIANÇA OPERACIONAL"

        results.append({
            "estacao": est,
            "registros": len(rows),
            "dataInicio": rows[0]["data"].strftime("%Y-%m-%d"),
            "dataFim": rows[-1]["data"].strftime("%Y-%m-%d"),
            "lacunas": lacunas_count,
            "maiorLacunaDias": max_gap,
            "mae_m": round(mae, 3),
            "bias_m": round(bias, 3),
            "rmse_m": round(rmse, 3),
            "subidaBias_m": round(subida_bias, 3),
            "descidaBias_m": round(descida_bias, 3),
            "elevadoBias_m": round(elevado_bias, 3),
            "margemCautelaSubida_m": caution_margin_m,
            "confidenceLevel": confidence_level,
            "confidenceLabel": confidence_label,
        })

    return results


class LoginRequest(BaseModel):
    email: str
    password: str
    recaptchaToken: Optional[str] = None


class ImportanceUpdate(BaseModel):
    importance: int = Field(..., ge=1, le=4)


class DispatchUpdate(BaseModel):
    assignedTeam: str = Field(..., min_length=2)


class AccessibilityPref(BaseModel):
    sessionId: str = Field(..., min_length=3)
    colorBlindMode: str = Field(default="none")
    audioDescription: bool = Field(default=False)
    librasEnabled: bool = Field(default=False)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "Escoamento Certo API",
        "version": "1.5.0",
        "csvLoaded": os.path.exists(CSV_PATH),
    }


@app.get("/api/zones")
def get_zones():
    with get_conn() as conn:
        zone_counts = get_zone_report_counts(conn)
    enriched = []
    for z in ZONES_DATA:
        c = zone_counts.get(z["id"], {"total": 0, "pending": 0})
        crit_key, crit_label, _ = zone_criticality_from_count(c["total"])
        enriched.append({
            **z,
            "reportCount": c["total"],
            "pendingReportCount": c["pending"],
            "areaCriticalityLevel": crit_key,
            "areaCriticalityLabel": crit_label,
        })
    return enriched


@app.get("/api/hydrology/stations")
def get_hydrology_stations():
    return {
        "sourceFile": "forecast_vs_ana.csv",
        "csvLoaded": os.path.exists(CSV_PATH),
        "disclaimer": (
            "Resultados calculados exclusivamente para as 7 estações da base, "
            "respeitando lacunas entre datas. Nível elevado não implica inundação "
            "e não substitui validação hidrológica ou cotas locais."
        ),
        "stations": load_hydrology_metrics(),
    }


@app.post("/api/accessibility/preferences")
def save_accessibility_prefs(pref: AccessibilityPref):
    valid_modes = {"none", "protanopia", "deuteranopia", "tritanopia", "high-contrast"}
    mode = pref.colorBlindMode if pref.colorBlindMode in valid_modes else "none"
    now_str = datetime.now().strftime("%d/%m/%Y %H:%M")
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO accessibility_prefs (sessionId, colorBlindMode, audioDescription, librasEnabled, updatedAt)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(sessionId) DO UPDATE SET
                colorBlindMode = excluded.colorBlindMode,
                audioDescription = excluded.audioDescription,
                librasEnabled = excluded.librasEnabled,
                updatedAt = excluded.updatedAt
            """,
            (pref.sessionId, mode, int(pref.audioDescription), int(pref.librasEnabled), now_str),
        )
        conn.commit()
    return {
        "sessionId": pref.sessionId,
        "colorBlindMode": mode,
        "audioDescription": pref.audioDescription,
        "librasEnabled": pref.librasEnabled,
        "updatedAt": now_str,
    }


@app.get("/api/accessibility/preferences/{session_id}")
def get_accessibility_prefs(session_id: str):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM accessibility_prefs WHERE sessionId = ?", (session_id,)
        ).fetchone()
    if not row:
        return {
            "sessionId": session_id,
            "colorBlindMode": "none",
            "audioDescription": False,
            "librasEnabled": False,
        }
    return {
        "sessionId": row["sessionId"],
        "colorBlindMode": row["colorBlindMode"],
        "audioDescription": bool(row["audioDescription"]),
        "librasEnabled": bool(row["librasEnabled"]),
        "updatedAt": row["updatedAt"],
    }


@app.post("/api/auth/login")
def login_pmsp(payload: LoginRequest):
    if not payload.email.strip() or not payload.password.strip():
        raise HTTPException(status_code=400, detail="E-mail e senha são obrigatórios.")
    if not verify_recaptcha(payload.recaptchaToken):
        raise HTTPException(status_code=400, detail="Falha na verificação do reCAPTCHA.")
    return {
        "authenticated": True,
        "userName": payload.email.strip(),
        "token": "demo-pmsp-session-token",
    }


@app.get("/api/reports")
def list_reports(
    cpf: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default="all"),
    sort: Optional[str] = Query(default="priority"),
):
    with get_conn() as conn:
        zone_counts = get_zone_report_counts(conn)
        if cpf is not None:
            digits = normalize_cpf(cpf)
            if len(digits) != 11:
                raise HTTPException(status_code=400, detail="Informe um CPF válido com 11 dígitos.")
            rows = conn.execute("SELECT * FROM reports WHERE cpf = ?", (digits,)).fetchall()
        else:
            rows = conn.execute("SELECT * FROM reports").fetchall()

    items = [serialize_report(r, zone_counts) for r in rows]

    if status == "pending":
        items = [r for r in items if r["status"] != "Concluído"]
    elif status and status != "all":
        items = [r for r in items if r["status"] == status]

    if sort == "priority":
        items.sort(
            key=lambda r: (int(r["importance"]), int(r["priorityScore"])),
            reverse=True,
        )

    return items


@app.post("/api/reports", status_code=201)
async def create_report(
    cpf: str = Form(...),
    citizenName: str = Form("Cidadão"),
    zoneId: str = Form(...),
    address: str = Form(...),
    problemType: str = Form(...),
    description: str = Form("Reporte enviado pelo portal cidadão."),
    recaptchaToken: Optional[str] = Form(default=None),
    photo: Optional[UploadFile] = File(default=None),
):
    digits_cpf = normalize_cpf(cpf)
    if len(digits_cpf) != 11:
        raise HTTPException(status_code=400, detail="Informe um CPF válido com 11 dígitos para acompanhar seu chamado.")

    if not verify_recaptcha(recaptchaToken):
        raise HTTPException(status_code=400, detail="Confirme o reCAPTCHA antes de enviar o reporte.")

    zone = next((z for z in ZONES_DATA if z["id"] == zoneId), ZONES_DATA[0])

    photo_name = "Sem foto anexada"
    if photo and photo.filename:
        safe_name = f"{int(datetime.now().timestamp())}_{os.path.basename(photo.filename)}"
        dest = os.path.join(UPLOAD_DIR, safe_name)
        content = await photo.read()
        with open(dest, "wb") as f:
            f.write(content)
        photo_name = safe_name

    now_str = datetime.now().strftime("%d/%m/%Y %H:%M")

    with get_conn() as conn:
        total = conn.execute("SELECT COUNT(*) AS c FROM reports").fetchone()["c"]
        new_id = f"EC-2026-{total + 1:03d}"

        existing_zone_count = conn.execute(
            "SELECT COUNT(*) AS c FROM reports WHERE zoneId = ?", (zone["id"],)
        ).fetchone()["c"]
        projected_zone_count = existing_zone_count + 1

        initial_importance = 2
        if zone["riskLevel"] == "high" or "empoçando" in problemType.lower() or projected_zone_count >= 4:
            initial_importance = 4
        elif zone["riskLevel"] == "medium" or projected_zone_count >= 2:
            initial_importance = 3

        clean_name = (citizenName or "").strip() or f"Cidadão (CPF {mask_cpf(digits_cpf)})"

        record = {
            "id": new_id,
            "cpf": digits_cpf,
            "citizenName": clean_name,
            "zoneId": zone["id"],
            "zoneName": zone["name"],
            "address": address.strip(),
            "problemType": problemType.strip(),
            "description": description.strip() or "Reporte enviado pelo portal cidadão.",
            "importance": initial_importance,
            "riverRiskScore": zone["riverRiskScore"],
            "busLinesCount": zone["busLinesCount"],
            "status": "Em triagem",
            "assignedTeam": "Aguardando despacho",
            "createdAt": now_str,
            "photoName": photo_name,
        }

        conn.execute(
            """
            INSERT INTO reports (
                id, cpf, citizenName, zoneId, zoneName, address,
                problemType, description, importance, riverRiskScore,
                busLinesCount, status, assignedTeam, createdAt, photoName
            ) VALUES (
                :id, :cpf, :citizenName, :zoneId, :zoneName, :address,
                :problemType, :description, :importance, :riverRiskScore,
                :busLinesCount, :status, :assignedTeam, :createdAt, :photoName
            )
            """,
            record,
        )
        conn.commit()
        zone_counts = get_zone_report_counts(conn)
        row = conn.execute("SELECT * FROM reports WHERE id = ?", (new_id,)).fetchone()

    return serialize_report(row, zone_counts)


@app.patch("/api/reports/{report_id}/importance")
def update_importance(report_id: str, payload: ImportanceUpdate):
    with get_conn() as conn:
        cur = conn.execute(
            "UPDATE reports SET importance = ? WHERE id = ?",
            (payload.importance, report_id),
        )
        conn.commit()
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Reporte não encontrado.")
        zone_counts = get_zone_report_counts(conn)
        row = conn.execute("SELECT * FROM reports WHERE id = ?", (report_id,)).fetchone()
    return serialize_report(row, zone_counts)


@app.patch("/api/reports/{report_id}/dispatch")
def dispatch_team(report_id: str, payload: DispatchUpdate):
    with get_conn() as conn:
        cur = conn.execute(
            "UPDATE reports SET status = 'Equipe designada', assignedTeam = ? WHERE id = ?",
            (payload.assignedTeam.strip(), report_id),
        )
        conn.commit()
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Reporte não encontrado.")
        zone_counts = get_zone_report_counts(conn)
        row = conn.execute("SELECT * FROM reports WHERE id = ?", (report_id,)).fetchone()
    return serialize_report(row, zone_counts)


@app.patch("/api/reports/{report_id}/complete")
def complete_cleanup(report_id: str):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM reports WHERE id = ?", (report_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Reporte não encontrado.")
        team = row["assignedTeam"]
        if not team or team == "Aguardando despacho":
            team = "Equipe Zeladoria PMSP (Atendimento Direto)"
        conn.execute(
            "UPDATE reports SET status = 'Concluído', assignedTeam = ? WHERE id = ?",
            (team, report_id),
        )
        conn.commit()
        zone_counts = get_zone_report_counts(conn)
        updated = conn.execute("SELECT * FROM reports WHERE id = ?", (report_id,)).fetchone()
    return serialize_report(updated, zone_counts)


@app.get("/api/dashboard/summary")
def dashboard_summary():
    with get_conn() as conn:
        rows = [dict(r) for r in conn.execute("SELECT * FROM reports").fetchall()]

    total = len(rows)
    done_list = [r for r in rows if r["status"] == "Concluído"]
    pending_list = [r for r in rows if r["status"] != "Concluído"]
    critical_pending = len([r for r in pending_list if int(r["importance"]) == 4])
    completion_rate = round((len(done_list) / total) * 100) if total > 0 else 0

    max_zone_reports = max(
        [len([r for r in rows if r["zoneId"] == z["id"]]) for z in ZONES_DATA] + [1]
    )

    by_zone = []
    heatmap_by_zone = []
    for z in ZONES_DATA:
        z_items = [r for r in rows if r["zoneId"] == z["id"]]
        z_total = len(z_items)
        z_done = len([r for r in z_items if r["status"] == "Concluído"])
        z_pend = z_total - z_done
        crit_key, crit_label, _ = zone_criticality_from_count(z_total)
        intensity_pct = round((z_total / max_zone_reports) * 100) if max_zone_reports > 0 else 0

        by_zone.append(
            {
                "zoneId": z["id"],
                "zoneName": z["name"],
                "total": z_total,
                "done": z_done,
                "pending": z_pend,
                "criticalityLevel": crit_key,
                "criticalityLabel": crit_label,
            }
        )
        heatmap_by_zone.append(
            {
                "zoneId": z["id"],
                "zoneName": z["name"],
                "lat": z["lat"],
                "lng": z["lng"],
                "reportCount": z_total,
                "pendingCount": z_pend,
                "intensityPct": intensity_pct,
                "criticalityLevel": crit_key,
                "criticalityLabel": crit_label,
            }
        )

    pending_by_importance = {}
    for lvl in [4, 3, 2, 1]:
        cnt = len([r for r in pending_list if int(r["importance"]) == lvl])
        pct = round((cnt / len(pending_list)) * 100) if pending_list else 0
        pending_by_importance[str(lvl)] = {"count": cnt, "pct": pct}

    return {
        "total": total,
        "done": len(done_list),
        "pending": len(pending_list),
        "criticalPending": critical_pending,
        "completionRate": completion_rate,
        "byZone": by_zone,
        "heatmapByZone": heatmap_by_zone,
        "pendingByImportance": pending_by_importance,
    }


# Monta os arquivos estáticos do frontend ao final para não conflitar com as rotas /api/*
if os.path.isdir(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")