import os
import re
import time
import json
import csv
import base64
import logging
import requests
import hashlib
import zipfile
import shutil
import tempfile
import threading
import openai
import fitz  # PyMuPDF
import unicodedata
from datetime import datetime
from copy import deepcopy
from concurrent.futures import ThreadPoolExecutor, as_completed
from docxtpl import DocxTemplate
from dotenv import load_dotenv
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad
from thefuzz import fuzz
import google.generativeai as genai
from supabase import create_client, Client

# ==========================================
# VALIDAÇÃO LOCAL STRONGER (CAÇADOR DE DATAS)
# ==========================================
def validar_formato_data(data_str):
    if not data_str: return False
    # O Regex (caçador) acha a data independentemente de como a IA a formatou (traços, pontos, barras)
    return bool(re.search(r'\d{2,4}[-./]\d{2}[-./]\d{2,4}', str(data_str)))

def remover_acentos(txt):
    if not txt: return ""
    return ''.join(c for c in unicodedata.normalize('NFD', txt) if unicodedata.category(c) != 'Mn')

# --- CONFIGURAÇÃO DE LOGS ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - [%(levelname)s] - %(message)s')
logger = logging.getLogger(__name__)

# ==========================================
# CONFIGURAÇÕES GERAIS E CREDENCIAIS
# ==========================================
load_dotenv()

# GEMINI 2.5 FLASH (O CÉREBRO)
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
generation_config = {
    "temperature": 0.1, 
    "response_mime_type": "application/json", 
}
modelo_gemini = genai.GenerativeModel(
    model_name="gemini-2.5-flash",
    generation_config=generation_config
)

# OPENAI (PLANO B)
OPENAI_API_KEY = os.getenv("VITE_OPENAI_API_KEY", "")
openai.api_key = OPENAI_API_KEY

# GOOGLE CLOUD VISION API E PHP HANDLER
VISION_API_KEY = "AIzaSyDGbCaGMp5GjZPQnDVTLy5PuH2UJE-jKzw" # Substitua pela sua do .env se preferir
PHP_HANDLER_URL = "https://pedapp.com.br/pdf/handler.php"

# SUPABASE
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL", "https://gxsmhsbkgongmyzsadnj.supabase.co")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY", "sb_publishable_aA5_zO559u_Ztzc7AUEzBw_25JsA5FC")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Locks para segurança multithread
oficio_lock = threading.Lock()
csv_lock = threading.Lock()

ARQUIVO_EXCEL = "lista_alunos.xlsx"
DIRETORIO_BASE_SERVIDOR = r"Z:\CERTIFICADOS (OFICIAL)\RELATÓRIO FINAL (OFICIAL)\LICENCIATURAS (OFICIAL)\MONTAGEM DE LOTES\LOTES MENSAIS\2026\DOC'S AGENTE"

DIRETORIO_LOTE = os.path.join(os.path.dirname(DIRETORIO_BASE_SERVIDOR), "Lote")
DIRETORIO_HISTORICOS_XML = os.path.join(DIRETORIO_LOTE, "Históricos xml")
ARQUIVO_ERROS_CSV = os.path.join(DIRETORIO_BASE_SERVIDOR, "relatorio_falhas_documentacao.csv")

# HOSTINGER APIS
API_MODELOS_URL = "https://pedapp.com.br/codigos/SPA/api/get_modelos.php"
API_TEMPLATES_URL = "https://pedapp.com.br/codigos/SPA/api/get_templates.php"
API_KEYS_URL = "https://pedapp.com.br/codigos/SPA/api/get_api_keys.php"
API_IBGE_URL = "https://pedapp.com.br/codigos/SPA/api/get_municipios.php"
API_TURMAS_URL = "https://pedapp.com.br/codigos/SPA/api/get_turmas.php"

# ESP APIS
EMAIL_PORTAL = "comercial@iteqescolas.com.br"
SENHA_PORTAL = "N@talia16103010"
CHAVE_SECRETA = "9pYz4paxNPln9nuMC2tEG596"
BASE_URL_API = "https://api-gateway.faculdadeesp.com.br/"
URL_LOGIN_ESTATICA = "https://api-gateway.faculdadeesp.com.br/U2FsdGVkX18tJxVXlIIZptWAhw0ik7pOGx/b1OQG8SGT8oun6VP/MYl5CMxQjrGK"
CURL_ORIGINAL_BUSCA = "U2FsdGVkX18yc5W4WWaayG49TVdw9v4Gt737ZNbmgfCG+8wtWS3SOrxxOTVTaQIgv+eOzRG44seta5UzqKcx2vJx7SliVjrJeTDkwphXmeigLJvHCeR6cb7stlN9W307wXpPBbnw+a6gERNYSFCH2YBUkOl7wiRXH8YH6wApPK9gNN8+9C0YTZkLKliuUgzYQul5n8pFsgR2xZfHLKlSemw1RLAXvneU8EOCmQEzS1Wx6mXJb2/3FJBW3jxkzbUHaYRNNfQOdsL3oVI4qO6Ly9pXtXxh91sfwLcopfpylrT8Rq3abOT8l1ECUjJv1mcyiwBNllyy0O0IkHsZc9NSYDfg3cyTejcI1PE/CqX55sJ1tQurweDUsVut7SozAdZ7mZ928/AI5Pyu9Ur2PuYkv3JRZOMQURXV0u6KNrn+TcRv6TBb0nUCD2IWuig9x0kB9FtBo3Cg4VqAcw4AlJMjQL+ah5b3Fzl1mu+tf0C9I1tBxFEyHNRUav2E1tE+Ss8VC6Hl/BN7aUhlHkT6g2vq1s70pzlojvZFGyymvU+RfTTlJh7tp/ZZJm1LpPQn21GLM653uag7r8H1Lq52DXT1veRFy4d/cqVzukcvBpKuECzY2YW4zU1wbH0iPWuYoqRTZ2wqAt2ontJfrLOMcUpzSFP+huXY93xAM6oCpWCcY3x+4jW7gZ2gfyNO0t8mEgh86bUORb8/ptLg39zTQSGYYHT8fzZhGkHWmQ+EvVeAeyCrPTQgrqgFqED0CrFQ9UQErUNhDtnolBRkL2GN44gH9w=="
CURL_DETALHES_MATRICULA = "U2FsdGVkX1/KNSVsmk+SaaJF0UIc6YvM2ZqASbngESC8m+NF7uF6T6T3GE00v6huaxx0aLNf1ZG6cefopmzIKB5qn6pSKrnmclHdcPPOxbM="
CURL_PASTA_ALUNO = "U2FsdGVkX19vUZXUqWSOVi8u8QmeXz8PZeZECcNCsbJ13Z6TSSSt7S0GaGwhN2JdbLSUGQKkGSgBsPdp4f5hgLrkI2gw9S3PqXVET7KBVC3CIX7Ltnqw976KJcC3+jVTo61NsnN1jfAyKxFXQUMxzc4sIJNy4tkN9kjc4L27xMJHbG71Hw+6LTxLQp1tPHRydzbT1evnp+usVXNqcVncVQ=="

# SOLIS APIS
SOLIS_API_BASE_URL = "https://diploma.solis.com.br/api"
SOLIS_CLIENT_SECRET = "317d509e18821810cc9130f5b92104fb8b938cb5d316e272923de4e451edb438"
SOLIS_EMAIL = "spa@pedapp.com.br"
SOLIS_SENHA = "cBCCXoah"
SIGNER_DATA = {
    "signer0_name": "João Felipe Furlanetti da Silva Natale", "signer0_cpf": "43618021810",
    "school_name": "FACULDADE DO ESTADO DE SÃO PAULO", "school_cnpj": "08.215.944/0001-98",
    "email": "coordenadora@faculdadeesp.com.br"
}

MAPA_NOMES_DOCUMENTOS = {
    "diploma": "DIPLOMA", "diploma frente e verso da primeira graduação": "DIPLOMA", "diploma frente e verso": "DIPLOMA",
    "histórico do ensino médio": "HEEM", "historico do ensino medio": "HEEM", "histórico completo do ensino médio": "HEEM", "historico completo do ensino medio": "HEEM",
    "histórico do ensino superior": "HE", "historico completo do ensino superior": "HE", "histórico escolar completo da primeira graduação": "HE",
    "certidão de casamento": "CC", "certidao de casamento": "CC", "certidão de nascimento e/ou casamento": "CC", "certidao de nascimento ou casamento": "CC", "certidão de casamento ou de nascimento frente e verso": "CC",
    "certidão de nascimento": "CN", "certidao de nascimento": "CN", "certidão de nascimento frente e verso": "CN",
    "comprovante residencial atualizado": "CE",
    "rg": "RG", "rg frente e verso": "RG", "carteira de identidade (rg)": "RG", "carteira de identidade (rg) frente e verso": "RG",
    "cpf": "CPF", "cpf frente e verso": "CPF",
    "titulo de eleitor": "TE", "título de eleitor": "TE", "título de eleitor frente e verso": "TE", "titulo de eleitor frente e verso": "TE", "reservista": "RESERVISTA"
}

UFS_DICT = {
    "AC": "Acre", "AL": "Alagoas", "AP": "Amapá", "AM": "Amazonas", "BA": "Bahia", "CE": "Ceará",
    "DF": "Distrito Federal", "ES": "Espírito Santo", "GO": "Goiás", "MA": "Maranhão", "MT": "Mato Grosso",
    "MS": "Mato Grosso do Sul", "MG": "Minas Gerais", "PA": "Pará", "PB": "Paraíba", "PR": "Paraná",
    "PE": "Pernambuco", "PI": "Piauí", "RJ": "Rio de Janeiro", "RN": "Rio Grande do Norte", "RS": "Rio Grande do Sul",
    "RO": "Rondônia", "RR": "Roraima", "SC": "Santa Catarina", "SP": "São Paulo", "SE": "Sergipe", "TO": "Tocantins",
}

class DocumentacaoInvalidaError(Exception): 
    def __init__(self, message, dossie_parcial=None):
        super().__init__(message)
        self.dossie_parcial = dossie_parcial

# ==========================================
# UTILITÁRIOS E COMPRESSÃO
# ==========================================
def comprimir_pdf_via_api(caminho_arquivo, logger, tracker):
    if not caminho_arquivo or not os.path.exists(caminho_arquivo):
        return
    try:
        limite_tamanho = 1.8 * 1024 * 1024  # 1.8 MB
        tamanho_arquivo = os.path.getsize(caminho_arquivo)
        if tamanho_arquivo < limite_tamanho:
            return
        logger.info(f"{tracker} 🗜️ Arquivo '{os.path.basename(caminho_arquivo)}' tem {tamanho_arquivo / (1024*1024):.2f}MB. Comprimindo via API PHP...")
        with open(caminho_arquivo, "rb") as f:
            files_to_send = {"pdf_file": (os.path.basename(caminho_arquivo), f, "application/pdf")}
            response = requests.post(PHP_HANDLER_URL, files=files_to_send, timeout=120)
        if response.status_code == 200:
            with open(caminho_arquivo, "wb") as f_write:
                f_write.write(response.content)
            logger.info(f"{tracker} ✅ Arquivo '{os.path.basename(caminho_arquivo)}' comprimido com sucesso!")
        else:
            logger.error(f"{tracker} ⚠️ Falha ao comprimir '{os.path.basename(caminho_arquivo)}'. Status {response.status_code}")
    except Exception as e:
        logger.error(f"{tracker} ⚠️ Erro inesperado ao comprimir '{os.path.basename(caminho_arquivo)}': {e}")

def get_and_update_num_oficio():
    caminho_json = "num_oficio.json"
    with oficio_lock:
        if not os.path.exists(caminho_json):
            with open(caminho_json, "w", encoding="utf-8") as f:
                json.dump({"contador": 0}, f)
        with open(caminho_json, "r", encoding="utf-8") as f:
            dados = json.load(f)
        novo_num = dados.get("contador", 0) + 1
        dados["contador"] = novo_num
        with open(caminho_json, "w", encoding="utf-8") as f:
            json.dump(dados, f, indent=4, ensure_ascii=False)
        return novo_num

def descriptografar_secreta(b64_str):
    data = base64.b64decode(b64_str)
    salt, enc = data[8:16], data[16:]
    k_iv, p = b'', b''
    while len(k_iv) < 48:
        p = hashlib.md5(p + CHAVE_SECRETA.encode('utf-8') + salt).digest()
        k_iv += p
    cipher = AES.new(k_iv[:32], AES.MODE_CBC, k_iv[32:48])
    return unpad(cipher.decrypt(enc), AES.block_size).decode('utf-8')

def criptografar_rota(rota):
    salt = os.urandom(8)
    k_iv, p = b'', b''
    while len(k_iv) < 48:
        p = hashlib.md5(p + CHAVE_SECRETA.encode('utf-8') + salt).digest()
        k_iv += p
    cipher = AES.new(k_iv[:32], AES.MODE_CBC, k_iv[32:48])
    enc = cipher.encrypt(pad(rota.encode('utf-8'), AES.block_size))
    return BASE_URL_API + base64.b64encode(b'Salted__' + salt + enc).decode('utf-8')

def bater_na_api_esp(rota, headers, payload=None, method="GET", session=None):
    url = criptografar_rota(rota)
    try:
        req = session.get if method == "GET" else session.post
        kwargs = {"headers": headers, "timeout": 25}
        if payload: kwargs["json"] = payload
        res = req(url, **kwargs)
        if res.status_code == 200: return res.json()
    except: pass
    return None

def obter_codigo_e_nome_ibge(cidade, uf):
    if not cidade or not uf: return "0000000", "Não Informado"
    cidade_limpa = remover_acentos(cidade).strip().lower()
    try:
        res = requests.get(API_IBGE_URL, timeout=10)
        if res.ok:
            municipios = res.json()
            for m in municipios:
                nome_oficial = m.get("nome") or m.get("municipio", "")
                codigo_ibge = m.get("codigo_ibge") or m.get("codigo", "0000000")
                m_cid = remover_acentos(nome_oficial).strip().lower()
                if m_cid == cidade_limpa:
                    return str(codigo_ibge), nome_oficial
            for m in municipios:
                nome_oficial = m.get("nome") or m.get("municipio", "")
                codigo_ibge = m.get("codigo_ibge") or m.get("codigo", "0000000")
                m_cid = remover_acentos(nome_oficial).strip().lower()
                if cidade_limpa in m_cid or m_cid in cidade_limpa:
                    return str(codigo_ibge), nome_oficial
    except Exception as e:
        logger.error(f"Erro ao buscar IBGE: {e}")
    return "0000000", cidade.title()

def fmt_data_extenso(d):
    meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]
    try:
        match = re.search(r'(\d{2,4})[-./](\d{2})[-./](\d{2,4})', str(d))
        if not match: return d
        p1, p2, p3 = match.groups()
        
        if len(p1) == 4: # Formato EUA
            dia, mes, ano = p3, p2, p1
        else: # Formato BR
            dia, mes, ano = p1, p2, p3
            
        return f"{int(dia)} de {meses[int(mes)-1]} de {ano}"
    except: return d

def fmt_data_iso(d):
    if not d: return None
    match = re.search(r'(\d{2,4})[-./](\d{2})[-./](\d{2,4})', str(d))
    if not match: return None
    p1, p2, p3 = match.groups()
    
    if len(p1) == 4: # Já está em AAAA-MM-DD
        return f"{p1}-{p2}-{p3}"
    elif len(p3) == 4: # Está em DD-MM-AAAA
        return f"{p3}-{p2}-{p1}"
    else: # Formato curto
        ano = int(p3)
        ano += 2000 if ano < 50 else 1900
        return f"{ano}-{p2}-{p1}"

# ==========================================
# ROTEADOR DINÂMICO DE TEMPLATES
# ==========================================
def definir_roteamento(curso_alvo, curso_anterior, grau_anterior, lista_historicos, lista_turmas, tracker):
    curso_alvo_upper = curso_alvo.upper()
    grau_upper = grau_anterior.upper() if grau_anterior else ""
    
    hist_escolhido = None
    turma_escolhida = None

    logger.info(f"{tracker} 🔀 Calculando Rota -> Alvo: {curso_alvo_upper} | Anterior: {curso_anterior} ({grau_upper})")

    if "ARTES VISUAIS" in curso_alvo_upper:
        hist_escolhido = "historico-2 lic Artes Visuais.json"
        turma_escolhida = "Solicitações Artes e Geografia.json"
    elif "GEOGRAFIA" in curso_alvo_upper:
        hist_escolhido = "historico-2 lic Geografia.json"
        turma_escolhida = "Solicitações Artes e Geografia.json"
    else:
        turma_escolhida = "Solicitação Pedagogia Bacharel.json"
        if "LICENCIATURA" in grau_upper:
            hist_escolhido = "historico-SEGUNDA GRAD-aluno-lic.json"
        else:
            curso_limpo = re.sub(r'(?i)^(bacharelado|tecn[oó]logo|licenciatura)\s+(em\s+)?', '', curso_anterior).strip().upper()
            hist_candidato = f"historico-{curso_limpo}.json"
            hist_escolhido = None
            for h_api in lista_historicos:
                if remover_acentos(h_api.lower()) == remover_acentos(hist_candidato.lower()):
                    hist_escolhido = h_api
                    break
            if not hist_escolhido:
                hist_escolhido = hist_candidato

    logger.info(f"{tracker} 🎯 Resultado Rota -> Histórico: {hist_escolhido} | Turma: {turma_escolhida}")

    if hist_escolhido not in lista_historicos:
        return None, None, f"Grade não montada para o curso anterior. Template '{hist_escolhido}' não encontrado no servidor."
    if turma_escolhida not in lista_turmas:
        return None, None, f"Template de Turma '{turma_escolhida}' não encontrado no servidor."

    return hist_escolhido, turma_escolhida, None

# ==========================================
# FASES 1 & 2: EXTRAÇÃO ESP E DOCUMENTOS
# ==========================================
def extrair_boletim_esp(cpf, curso_alvo, token, session, tracker):
    headers = {"Accept": "application/json", "Company": "iteq", "User-Agent": "Mozilla/5.0", "Authorization": token, "requestOrigin": "busca-rapida-inscricoes"}
    rota_busca = descriptografar_secreta(CURL_ORIGINAL_BUSCA).replace("38395553889", cpf)
    if "?" in rota_busca: rota_busca += "&limit=200"
    else: rota_busca += "?limit=200"
        
    dados = bater_na_api_esp(rota_busca, headers, session=session)
    if not dados or "data" not in dados: return None
    
    d_block = dados["data"]
    lista_matriculas = d_block.get("paginatedResults", []) if isinstance(d_block, dict) else d_block
    if not isinstance(lista_matriculas, list): lista_matriculas = []
        
    mat_id = None
    curso_alvo_limpo = remover_acentos(curso_alvo).upper().strip()
    
    logger.info(f"{tracker} O aluno tem {len(lista_matriculas)} cursos na base da ESP. Procurando por: '{curso_alvo_limpo}'")
    for mat in lista_matriculas:
        nc = mat.get("registryCourse", {}).get("course", {}).get("_name", "").strip().upper()
        nc_limpo = remover_acentos(nc)
        logger.info(f"{tracker} -> Analisando curso matriculado: '{nc_limpo}'")
        if curso_alvo_limpo in nc_limpo or nc_limpo in curso_alvo_limpo or fuzz.ratio(curso_alvo_limpo, nc_limpo) > 80:
            mat_id = mat.get("_id")
            logger.info(f"{tracker} ✅ Curso Alvo Encontrado (ID: {mat_id})")
            break
            
    if not mat_id: return None
        
    headers["requestOrigin"] = "busca-rapida-detalhes"
    rota_detalhes = descriptografar_secreta(CURL_DETALHES_MATRICULA).replace("66db8be27c5aa7022dda1382", mat_id)
    detalhes = bater_na_api_esp(rota_detalhes, headers, session=session)
    
    boletim = []
    if detalhes and "data" in detalhes:
        d_det = detalhes["data"]
        obj_det = d_det[0] if isinstance(d_det, list) and d_det else d_det.get("paginatedResults", [{}])[0] if isinstance(d_det, dict) and "paginatedResults" in d_det else d_det
        disciplinas = obj_det.get("registryCourse", {}).get("course", {}).get("disciplines", [])
        for disc in disciplinas:
            boletim.append({
                "disciplina": disc.get("_name", "").strip(), 
                "nota": disc.get("grade", 0), 
                "status": disc.get("status", "")
            })
    return boletim

def baixar_docs_esp(cpf, token, session, pasta_aluno, tracker):
    headers = {"Accept": "application/json", "Company": "iteq", "User-Agent": "Mozilla/5.0", "Authorization": token}
    rota = re.sub(r'where=.*', f'where=%7B%22cpf%22:%22{cpf}%22%7D', descriptografar_secreta(CURL_PASTA_ALUNO))
    dados = bater_na_api_esp(rota, headers, session=session)
    if not dados or "data" not in dados: return
    d_block = dados["data"]
    aluno_obj = d_block[0] if isinstance(d_block, list) and d_block else d_block.get("paginatedResults", [{}])[0] if isinstance(d_block, dict) and "paginatedResults" in d_block else d_block if isinstance(d_block, dict) else {}
    gavetas = {}
    for doc in aluno_obj.get("documents", []):
        nd, id_doc = doc.get("name", doc.get("_documentTypeName", "")), doc.get("_id", "")
        urls = [doc.get("url")] if doc.get("url") else []
        for f in doc.get("files", []) + aluno_obj.get("files", []):
            if isinstance(f, dict) and f.get("url") and (f.get("_documentId") == id_doc or f.get("documentId") == id_doc):
                urls.append(f.get("url"))
        if nd and id_doc: gavetas[nd] = list(set(urls))

    for nome_gaveta, urls in gavetas.items():
        if not urls: continue
        sigla = MAPA_NOMES_DOCUMENTOS.get(nome_gaveta.lower().strip(), nome_gaveta.upper().replace(" ", "_")[:15])
        if len(urls) == 1:
            res = session.get(urls[0], timeout=20)
            if res.ok:
                ext = ".pdf" if "pdf" in res.headers.get("content-type", "").lower() or ".pdf" in urls[0].lower() else ".jpg"
                with open(os.path.join(pasta_aluno, f"{sigla}{ext}"), "wb") as f: f.write(res.content)
        else:
            try:
                doc_m = fitz.open()
                for url in urls:
                    res = session.get(url, timeout=20)
                    if res.ok:
                        ext = ".pdf" if "pdf" in res.headers.get("content-type", "").lower() or ".pdf" in url.lower() else ".jpg"
                        if ext == ".pdf":
                            t_pdf = fitz.open("pdf", res.content)
                            doc_m.insert_pdf(t_pdf)
                            t_pdf.close()
                        else:
                            i_doc = fitz.open("image", res.content)
                            p_bytes = i_doc.convert_to_pdf()
                            i_pdf = fitz.open("pdf", p_bytes)
                            doc_m.insert_pdf(i_pdf)
                            i_pdf.close()
                            i_doc.close()
                if len(doc_m) > 0: doc_m.save(os.path.join(pasta_aluno, f"{sigla}.pdf"))
                doc_m.close()
            except Exception as e: logger.error(f"{tracker} Erro ao mesclar {sigla}: {e}")

# ==========================================
# FASE 3: GOOGLE CLOUD VISION API E IA
# ==========================================
def ler_pdf_b64(caminho):
    imgs = []
    try:
        doc = fitz.open(caminho)
        zoom = 300 / 72 
        mat = fitz.Matrix(zoom, zoom)
        for i, page in enumerate(doc):
            if i >= 4: break
            pix = page.get_pixmap(matrix=mat, colorspace=fitz.csGRAY, alpha=False)
            img_bytes = pix.tobytes("jpeg")
            imgs.append(base64.b64encode(img_bytes).decode("utf-8"))
        doc.close()
    except Exception as e:
        logger.error(f"Erro lendo PDF {caminho}: {e}")
    return imgs

def extrair_texto_vision(imgs_b64, tracker, tipo_doc):
    texto_completo = ""
    url = f"https://vision.googleapis.com/v1/images:annotate?key={VISION_API_KEY}"
    logger.info(f"{tracker} 👁️ Solicitando OCR via Google Cloud Vision API para documentos {tipo_doc}...")
    
    for i, img in enumerate(imgs_b64):
        payload = {
            "requests": [{
                "image": {"content": img},
                "features": [{"type": "DOCUMENT_TEXT_DETECTION"}]
            }]
        }
        tentativas = 3
        for tentativa in range(tentativas):
            try:
                res = requests.post(url, json=payload, timeout=60)
                if res.status_code == 200:
                    dados = res.json()
                    res_txt = dados.get("responses", [{}])[0].get("fullTextAnnotation", {}).get("text", "")
                    texto_completo += f"\n--- PÁGINA {i+1} ---\n{res_txt}\n"
                    break
                else:
                    logger.error(f"{tracker} ❌ Erro no Vision API (Página {i+1}): {res.text}")
                    break
            except requests.exceptions.RequestException as e:
                if tentativa < tentativas - 1:
                    logger.warning(f"{tracker} ⚠️ Timeout/Rede no Vision (Pág {i+1}). Tentando de novo em 5s... ({tentativa+1}/{tentativas})")
                    time.sleep(5)
                else:
                    logger.error(f"{tracker} ❌ Falha definitiva na conexão com Vision API após {tentativas} tentativas: {e}")
            
    return texto_completo

def comunicar_com_ia_com_retry(modelo, prompt, logger, tracker, etapa="Pessoais", max_tentativas=3):
    for tentativa in range(max_tentativas):
        try:
            res = modelo.generate_content([prompt])
            return res.text
            
        except Exception as e:
            erro_str = str(e)
            logger.warning(f"{tracker} ⚠️ Falha na IA {etapa} (Tentativa {tentativa+1}/{max_tentativas}): {erro_str}")
            
            if "429" in erro_str or "Quota exceeded" in erro_str:
                logger.warning(f"{tracker} 🔄 Cota do Gemini excedida! Acionando Plano B: OpenAI (GPT-4o mini)...")
                
                if not OPENAI_API_KEY:
                    raise ValueError("Cota do Gemini acabou e a chave da OpenAI não foi configurada no .env!")
                
                try:
                    resposta_openai = openai.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=[
                            {"role": "system", "content": "Você é um auditor acadêmico sênior que deve responder estritamente em formato JSON válido, sem formatações markdown."},
                            {"role": "user", "content": prompt}
                        ],
                        response_format={ "type": "json_object" },
                        temperature=0.1
                    )
                    
                    texto_resposta = resposta_openai.choices[0].message.content
                    logger.info(f"{tracker} ✅ Plano B (OpenAI) respondeu com sucesso para etapa {etapa}.")
                    return texto_resposta
                    
                except Exception as erro_openai:
                    logger.error(f"{tracker} ❌ O Plano B (OpenAI) também falhou: {erro_openai}")
                    raise erro_openai
            
            if tentativa < max_tentativas - 1:
                time.sleep(5)
            else:
                logger.error(f"{tracker} ❌ Erro Crítico ao comunicar com a IA ({etapa}). Todas as tentativas falharam.")
                raise e

def extrair_ia_pessoais_e_academicos(pasta_aluno, tracker, curso_alvo_limpo, cpf_planilha, nome_planilha, aluno_db):
    correcoes = aluno_db.get('correcoes_manuais')

    dados_extraidos_anteriores = aluno_db.get('dados_extraidos', {}) or {}
    texto_pessoais = dados_extraidos_anteriores.get("texto_ocr_pessoais")
    texto_academicos = dados_extraidos_anteriores.get("texto_ocr_academicos")
    
    if not texto_pessoais or not texto_academicos:
        logger.info(f"{tracker} 🔍 Textos não encontrados no banco. Iniciando Leitura OCR (Vision)...")
        imgs_p = []
        for d in ["RG.pdf", "CN.pdf", "CC.pdf"]:
            c = os.path.join(pasta_aluno, d)
            if os.path.exists(c): imgs_p.extend(ler_pdf_b64(c))
            
        imgs_a = []
        for d in ["HE.pdf", "DIPLOMA.pdf"]:
            c = os.path.join(pasta_aluno, d)
            if os.path.exists(c): imgs_a.extend(ler_pdf_b64(c))

        if not imgs_p or not imgs_a: 
            raise DocumentacaoInvalidaError("Faltam documentos básicos (Pessoais ou Acadêmicos) na pasta para análise.")

        texto_pessoais = extrair_texto_vision(imgs_p, tracker, "PESSOAIS")
        texto_academicos = extrair_texto_vision(imgs_a, tracker, "ACADÊMICOS")
        
        try:
            supabase.table('alunos_dossie').update({
                'dados_extraidos': {
                    "texto_ocr_pessoais": texto_pessoais,
                    "texto_ocr_academicos": texto_academicos
                }
            }).eq('id', aluno_db.get('id')).execute()
            logger.info(f"{tracker} 💾 Cache do OCR salvo no banco de dados com sucesso!")
        except Exception as err_cache:
            logger.error(f"{tracker} ⚠️ Não foi possível salvar o cache: {err_cache}")
            
    else:
        logger.info(f"{tracker} ⚡ CACHE ENCONTRADO! Pulando etapa de Leitura OCR (Vision)...")

    reprovado = False
    motivos_reprovacao = []
    dp = {}
    da = {}

    # --- IA PESSOAIS (GRANULARIDADE E STATUS ISOLADOS) ---
    prompt_p = f"""<system_prompt>
Você é um auditor acadêmico sênior especialista em documentos brasileiros. Sua missão é extrair dados e sinalizar o status individual de cada informação, isolando os problemas.
</system_prompt>

<dados_do_sistema>
- Nome esperado: {nome_planilha}
- CPF esperado: {cpf_planilha}
</dados_do_sistema>

<texto_extraido_dos_documentos>
{texto_pessoais}
</texto_extraido_dos_documentos>

<regras_de_auditoria_e_extracao>
1. VALIDAÇÃO DE NOME E CPF:
   - NOME: Extraia EXCLUSIVAMENTE o campo "NOME" impresso (em letras de forma). IGNORE completamente assinaturas cursivas. Se divergência for absurda, defina "status_nome": "DIVERGENTE". Senão, "OK".
   - CPF: Compare o CPF extraído com o esperado. ATENÇÃO ABSOLUTA: IGNORE PONTUAÇÕES (pontos, traços, barras). O número "437775538/24" é EXATAMENTE IGUAL a "43777553824". Se a numeração base for a mesma, defina "status_cpf": "OK". Se for de outra pessoa, "DIVERGENTE".

2. RG / IDENTIDADE:
   - Se a imagem estiver borrada ou o número lido for muito curto (ex: apenas 4 dígitos) ou inválido, deixe "rg" VAZIO e defina "status_rg": "ILEGIVEL". Caso contrário, extraia o número e defina "status_rg": "OK".

3. DATA DE NASCIMENTO (INDEPENDENTE DO RG):
   - Extraia a data de nascimento EXCLUSIVAMENTE do documento de identidade.
   - Mesmo que o RG esteja ilegível (status_rg="ILEGIVEL"), se a data estiver legível, EXTRAIA a data e defina "status_data_nascimento": "OK". Se a data também estiver ilegível, deixe vazio e "status_data_nascimento": "ILEGIVEL".

4. FILIAÇÃO (TOLERÂNCIA DE OCR):
   - Extraia o nome dos pais. Divergências de 1 ou 2 letras (ex: NIVALDO / MIVALDO) são comuns no OCR de certidões antigas e DEVEM ser consideradas "status_filiacao": "OK".

5. DECISÃO FINAL:
   - Se QUALQUER status acima for "ILEGIVEL" ou "DIVERGENTE", "documentos_aprovados" deve ser false.
</regras_de_auditoria_e_extracao>

<formato_de_saida_json>
{{
    "raciocinio_detalhado": "Explique o status de cada item (Nome, CPF, RG, Data, Filiação).",
    "documentos_aprovados": true ou false,
    "motivo_reprovacao": "Liste apenas os campos com problema (ex: RG ilegível).",
    "status_nome": "OK ou DIVERGENTE",
    "status_cpf": "OK ou DIVERGENTE",
    "status_rg": "OK ou ILEGIVEL",
    "status_data_nascimento": "OK ou ILEGIVEL",
    "status_filiacao": "OK ou DIVERGENTE",
    "tipo_certidao": "NASCIMENTO ou CASAMENTO",
    "nome_aluno_certidao": "Nome lido com acentos",
    "sexo": "F ou M",
    "data_nascimento": "DD/MM/AAAA",
    "rg": "Apenas letras e números, ou vazio",
    "orgao_expedidor": "Sigla (Ex: SSP)",
    "uf_emissao_rg": "Sigla da UF (Ex: SP)",
    "municipio": "Nome da cidade de nascimento",
    "uf_municipio": "Sigla do estado",
    "nome_mae": "Nome da mãe",
    "nome_pai": "Nome do pai"
}}
</formato_de_saida_json>"""
    
    logger.info(f"{tracker} 🧠 Enviando OCR pessoal para a IA analisar a estrutura...")
    
    try:
        res_text_p = comunicar_com_ia_com_retry(modelo_gemini, prompt_p, logger, tracker, "Pessoais")
        dp = json.loads(res_text_p)
        
        # --- APLICAR CORREÇÕES HUMANAS (PESSOAIS) ---
        if correcoes:
            logger.info(f"{tracker} 🧑‍⚖️ Aplicando correções manuais do Auditor sobre a IA Pessoal...")
            if correcoes.get("nome"): 
                dp["nome_aluno_certidao"] = correcoes["nome"].strip().upper()
                dp["status_nome"] = "OK"
            if correcoes.get("rg"): 
                dp["rg"] = correcoes["rg"].strip()
                dp["status_rg"] = "OK"
            if correcoes.get("dataNascimento"): 
                dp["data_nascimento"] = correcoes["dataNascimento"].strip()
                dp["status_data_nascimento"] = "OK"
                
            dp["documentos_aprovados"] = True
        
        logger.info(f"{tracker} 💡 Raciocínio Pessoal: {dp.get('raciocinio_detalhado')}") 
        
    except Exception as e:
        logger.error(f"{tracker} ❌ Erro Crítico ao comunicar com a IA (Pessoais). Log: {e}")
        raise DocumentacaoInvalidaError(f"Falha de comunicação com a IA na etapa Pessoal: {str(e)}")
    
    if not dp.get("documentos_aprovados", True):
        reprovado = True
        motivos_reprovacao.append(f"Pessoais: {dp.get('motivo_reprovacao')}")
        
    if not validar_formato_data(dp.get("data_nascimento", "")):
        reprovado = True
        dp["status_data_nascimento"] = "ILEGIVEL"
        motivos_reprovacao.append(f"Data de nascimento inválida ou ausente")

    tipo_certidao_real = dp.get("tipo_certidao", "NASCIMENTO").upper()
    if tipo_certidao_real in ["NASCIMENTO", "CASAMENTO"]:
        nome_certo = "CN.pdf" if tipo_certidao_real == "NASCIMENTO" else "CC.pdf"
        nome_errado = "CC.pdf" if tipo_certidao_real == "NASCIMENTO" else "CN.pdf"
        
        path_errado = os.path.join(pasta_aluno, nome_errado)
        path_certo = os.path.join(pasta_aluno, nome_certo)
        
        if os.path.exists(path_errado) and not os.path.exists(path_certo):
            try:
                os.rename(path_errado, path_certo)
                logger.info(f"{tracker} 🔄 Arquivo '{nome_errado}' renomeado para '{nome_certo}' conforme leitura da IA.")
            except Exception as e:
                logger.error(f"{tracker} ⚠️ Falha ao renomear {nome_errado} para {nome_certo}: {e}")

    # --- IA ACADÊMICOS (GRANULARIDADE E STATUS ISOLADOS) ---
    prompt_a = f"""<system_prompt>
Você é um auditor acadêmico rigoroso analisando textos extraídos por OCR. Isole os problemas reportando o status individual de cada campo.
</system_prompt>

<texto_extraido_dos_documentos>
{texto_academicos}
</texto_extraido_dos_documentos>

<regras_de_auditoria_e_extracao>
1. DATA DE COLAÇÃO DE GRAU:
   - Procure EXCLUSIVAMENTE a data de COLAÇÃO DE GRAU. Data de conclusão não serve.
   - Se encontrar, defina "status_data_colacao": "OK" e extraia OBRIGATORIAMENTE no formato DD/MM/AAAA.
   - Se não houver, "AUSENTE".
2. CLASSIFICAÇÃO DE GRAU E CURSO:
   - Classifique como 'Licenciatura', 'Bacharelado' ou 'Tecnólogo'.
   - Compare o nome do curso impresso no Diploma e Histórico. Se houver divergência absurda, "status_curso": "DIVERGENTE", senão "OK".
3. DECISÃO FINAL:
   - Se algum status não for "OK", "documentos_aprovados" deve ser false.
</regras_de_auditoria_e_extracao>

<formato_de_saida_json>
{{
    "raciocinio_detalhado": "Explique sua análise para a colação e o curso.",
    "documentos_aprovados": true ou false,
    "motivo_reprovacao": "Se reprovado, explique o motivo pontual.",
    "status_data_colacao": "OK ou AUSENTE",
    "status_curso": "OK ou DIVERGENTE",
    "curso_anterior": "Nome do curso",
    "grau_anterior": "Licenciatura, Bacharelado ou Tecnologo",
    "instituicao_anterior": "Nome da instituição",
    "data_colacao_anterior": "DD/MM/AAAA ou vazio se reprovado"
}}
</formato_de_saida_json>"""

    logger.info(f"{tracker} 🧠 Enviando OCR acadêmico para a IA analisar a estrutura...")
    
    try:
        res_text_a = comunicar_com_ia_com_retry(modelo_gemini, prompt_a, logger, tracker, "Acadêmicos")
        da = json.loads(res_text_a)
        
        # --- APLICAR CORREÇÕES HUMANAS (ACADÊMICOS) ---
        if correcoes:
            if correcoes.get("dataColacao"): 
                logger.info(f"{tracker} 🧑‍⚖️ Aplicando correção manual da Data de Colação...")
                da["data_colacao_anterior"] = correcoes["dataColacao"].strip()
                da["status_data_colacao"] = "OK"
                da["documentos_aprovados"] = True
        
        logger.info(f"{tracker} 💡 Raciocínio Acadêmico: {da.get('raciocinio_detalhado')}")
        
    except Exception as e:
        logger.error(f"{tracker} ❌ Erro Crítico ao comunicar com a IA (Acadêmicos). Log: {e}")
        raise DocumentacaoInvalidaError(f"Falha de comunicação com a IA na etapa Acadêmica: {str(e)}")

    if not da.get("documentos_aprovados", True):
        reprovado = True
        motivos_reprovacao.append(f"Acadêmico: {da.get('motivo_reprovacao')}")
        
    if not validar_formato_data(da.get("data_colacao_anterior", "")):
        reprovado = True
        da["status_data_colacao"] = "ILEGIVEL"
        motivos_reprovacao.append(f"Data de colação inválida")

    def gp(n): return os.path.join(pasta_aluno, n).replace("\\", "/") if os.path.exists(os.path.join(pasta_aluno, n)) else ""
    
    rg_limpo = re.sub(r'[^A-Za-z0-9]', '', dp.get("rg", ""))
    nome_final = dp.get("nome_aluno_certidao") or nome_planilha
    cod_ibge, mun_oficial = obter_codigo_e_nome_ibge(dp.get("municipio",""), dp.get("uf_municipio",""))
    
    df = {
        "id_card": "99999", "id_diplomado": "389", 
        "nome": nome_final.strip().upper(),
        "data_nascimento": dp.get("data_nascimento",""),
        "sexo": dp.get("sexo", "F").strip().upper()[:1], 
        "cpf": cpf_planilha, 
        "rg": rg_limpo,
        "orgao_expedidor": dp.get("orgao_expedidor",""), 
        "uf_emissao_rg": f"{dp.get('uf_emissao_rg','SP') or 'SP'} - {UFS_DICT.get((dp.get('uf_emissao_rg','SP') or 'SP').upper(),'')}",
        "codigo_municipio": cod_ibge,
        "municipio": mun_oficial, 
        "uf_municipio": f"{dp.get('uf_municipio','SP') or 'SP'} - {UFS_DICT.get((dp.get('uf_municipio','SP') or 'SP').upper(),'')}",
        "nome_mae": dp.get("nome_mae","").strip().upper(), 
        "nome_pai": dp.get("nome_pai","").strip().upper(),
        "curso_anterior": da.get("curso_anterior",""), 
        "grau_anterior": da.get("grau_anterior", ""),
        "instituicao_anterior": da.get("instituicao_anterior",""),
        "data_colacao_anterior": da.get("data_colacao_anterior",""),
        
        "nome_curso": curso_alvo_limpo, 
        "tipo_certificado": "Segunda Licenciatura", "grau_conferido": "Licenciatura",
        "modalidade": "EAD", "data_conclusao_curso": datetime.now().strftime("%d/%m/%Y"),
        
        "rg_cpf_path": gp("RG.pdf") or gp("CPF.pdf"), 
        "certidao_path": gp("CN.pdf") or gp("CC.pdf"), 
        "tipo_certidao": dp.get("tipo_certidao", "NASCIMENTO").upper(), 
        "comp_endereco_path": gp("CE.pdf"),
        "hist_em_path": gp("HEEM.pdf"), "hist_grad_anterior_path": gp("HE.pdf"), "diploma_grad_anterior_path": gp("DIPLOMA.pdf"),
        
        "validacao_ia": {
            "nome": dp.get("status_nome", "OK"),
            "cpf": dp.get("status_cpf", "OK"),
            "rg": dp.get("status_rg", "OK"),
            "data_nascimento": dp.get("status_data_nascimento", "OK"),
            "filiacao": dp.get("status_filiacao", "OK"),
            "data_colacao": da.get("status_data_colacao", "OK"),
            "curso_anterior": da.get("status_curso", "OK")
        }
    }

    dossie_final = {
        "dados_formulario": df,
        "texto_ocr_pessoais": texto_pessoais,
        "texto_ocr_academicos": texto_academicos
    }

    if reprovado:
        raise DocumentacaoInvalidaError(" | ".join(motivos_reprovacao), dossie_final)

    return dossie_final

# ==========================================
# FASE 4: WORD, iLovePDF e Construção Histórico
# ==========================================
def fase_4_documentos_e_payload(dossie, boletim, pasta_aluno, modelos_word, tpl_json, chaves_pdf, tracker, dados_turma_selecionada):
    p_docx, p_pdf = os.path.join(pasta_aluno, "Arquivos_Editaveis"), os.path.join(pasta_aluno, "Arquivos_PDF")
    os.makedirs(p_docx, exist_ok=True); os.makedirs(p_pdf, exist_ok=True)
    df = dossie["dados_formulario"]
    
    if dados_turma_selecionada:
        if "data_colacao_grau" in dados_turma_selecionada: df["data_colacao_grau"] = dados_turma_selecionada["data_colacao_grau"]
        if "data_conclusao_curso" in dados_turma_selecionada: df["data_conclusao_curso"] = dados_turma_selecionada["data_conclusao_curso"]
        if "periodo_letivo" in dados_turma_selecionada: df["periodo_letivo"] = dados_turma_selecionada["periodo_letivo"]
        if "data_inicio_curso" in dados_turma_selecionada: df["data_inicio_curso"] = dados_turma_selecionada["data_inicio_curso"]
        if "data_emissao_historico" in dados_turma_selecionada: df["data_emissao_historico"] = dados_turma_selecionada["data_emissao_historico"]
        df["periodos_disciplinas"] = dados_turma_selecionada.get("periodos_disciplinas", [])

    d_emissao = df.get("data_emissao_historico") or datetime.now().strftime("%d/%m/%Y")
    d_conclusao = df.get("data_conclusao_curso", "")
    d_inicio = df.get("data_inicio_curso", "")
    d_colacao = df.get("data_colacao_grau", "")
    p_letivo = df.get("periodo_letivo", "")
    num_oficio = get_and_update_num_oficio()
    
    subs = {
        "NOME": df.get("nome","").upper(), "RG": df.get("rg",""), "ORGE": df.get("orgao_expedidor",""), "UFE": df.get("uf_emissao_rg","SP")[:2],
        "NC": df.get("nome_curso","").upper(), "DCCext": fmt_data_extenso(d_conclusao),
        "DCGext": fmt_data_extenso(d_colacao), "DEHext": fmt_data_extenso(d_emissao),
        "DEH": d_emissao, "NUMOFC": f"{int(num_oficio):05d}", "NUMOFC4": f"{int(num_oficio):04d}"
    }

    nome_fmt = df.get("nome","").replace(" ", "_")
    for t_doc, path_mdl in modelos_word.items():
        doc = DocxTemplate(path_mdl)
        doc.render(subs)
        nome_arquivo_base = f"{t_doc}_{nome_fmt}"
        c_docx = os.path.join(p_docx, f"{nome_arquivo_base}.docx")
        c_pdf = os.path.join(p_pdf, f"{nome_arquivo_base}.pdf")
        doc.save(c_docx)
        
        for pk in chaves_pdf:
            try:
                auth = requests.post("https://api.ilovepdf.com/v1/auth", json={"public_key": pk}, timeout=10).json()
                h = {"Authorization": f"Bearer {auth['token']}"}
                sv = requests.get("https://api.ilovepdf.com/v1/start/officepdf", headers=h, timeout=10).json()
                with open(c_docx, "rb") as f: 
                    up = requests.post(f"https://{sv['server']}/v1/upload", headers=h, data={"task": sv['task']}, files={"file": f}, timeout=30).json()
                
                requests.post(f"https://{sv['server']}/v1/process", headers=h, json={
                    "task": sv['task'], "tool": "officepdf", 
                    "files": [{"server_filename": up['server_filename'], "filename": f"{nome_arquivo_base}.docx"}]
                }, timeout=30)
                
                dl = requests.get(f"https://{sv['server']}/v1/download/{sv['task']}", headers=h, timeout=30)
                with open(c_pdf, "wb") as f: f.write(dl.content)
                break
            except Exception as e: 
                continue

    pl = deepcopy(tpl_json)
    dh = pl["dados_historico"]
    
    nome_curso_selecionado = df.get("nome_curso", "")
    tipo_certificado_selecionado = df.get("tipo_certificado", "")
    if nome_curso_selecionado:
        nova_denominacao = f"Licenciatura em {nome_curso_selecionado}"
        if tipo_certificado_selecionado == "Lic ñ Graduados":
            nova_denominacao += " - Formação Pedagógica"
        dh["DadosDiplomaDadosCursoNomeCurso"] = nova_denominacao

    dh["codigo_interno"] = df.get("id_card", "99999")
    dh["DadosDiplomaDiplomadoID"] = df.get("id_diplomado", "99999")
    dh["DadosDiplomaDiplomadoNome"] = df.get("nome","").upper()
    dh["DadosDiplomaDiplomadoCPF"] = df.get("cpf","")
    dh["DadosDiplomaDiplomadoRGNumero"] = df.get("rg","")
    dh["DadosDiplomaDiplomadoRGOrgaoExpedidor"] = df.get("orgao_expedidor","")
    dh["DadosDiplomaDiplomadoRGUF"] = df.get("uf_emissao_rg","SP")[:2]
    dh["DadosDiplomaDiplomadoDataNascimento"] = fmt_data_iso(df.get("data_nascimento",""))
    
    mun = df.get("municipio", "").strip() if df.get("municipio") else ""
    if not mun or mun.lower() == "não informado": mun = "Não Informado"
    dh["DadosDiplomaDiplomadoNaturalidadeCodigoMunicipio"] = df.get("codigo_municipio", "0000000")
    dh["DadosDiplomaDiplomadoNaturalidadeNomeMunicipio"] = mun
    _uf = df.get("uf_municipio", "SP")
    dh["DadosDiplomaDiplomadoNaturalidadeUF"] = _uf[:2].upper() if _uf and len(_uf) >= 2 else "SP"

    filiacao = []
    if df.get("nome_mae"): filiacao.append({"RegistroReqDadosPrivadosDiplomadoFiliacaoGenitorNome": df["nome_mae"].upper(), "RegistroReqDadosPrivadosDiplomadoFiliacaoGenitorSexo": "F", "RegistroReqDadosPrivadosDiplomadoFiliacaoGenitorNomeSocial": None})
    if df.get("nome_pai"): filiacao.append({"RegistroReqDadosPrivadosDiplomadoFiliacaoGenitorNome": df["nome_pai"].upper(), "RegistroReqDadosPrivadosDiplomadoFiliacaoGenitorSexo": "M", "RegistroReqDadosPrivadosDiplomadoFiliacaoGenitorNomeSocial": None})
    dh["RegistroReqDadosPrivadosDiplomadoFiliacaoGenitores"] = filiacao
    
    prefixo_mensagem = (
        f"Aluno portador de diploma no curso de {df.get('curso_anterior','')}, "
        f"realizado na {df.get('instituicao_anterior','')}, "
        f"colação de grau em {df.get('data_colacao_anterior','')}. "
    )
    
    mensagem_hist = prefixo_mensagem
    curso_upper = nome_curso_selecionado.upper()
    
    if "PEDAGOGIA" in curso_upper:
        pass 
    elif "ARTES VISUAIS" in curso_upper:
        mensagem_hist += "Curso reconhecido na forma do art. 11, § 1°, do Decreto n° 9.235, de 15 de dezembro de 2017, e do art. 26, § 1°, da Portaria MEC n° 1.095, de 25/10/2018, DOU n° 207, seção 01, pág. 32, de 26/10/2018."
    elif "GEOGRAFIA" in curso_upper:
        mensagem_hist += "Curso reconhecido na forma do art. 11, § 1°, do Decreto n° 9.235, de 15 de dezembro de 2017, e do art. 26, § 1°, da Portaria MEC n° 1.095, de 25/10/2018, DOU n° 207, seção 01, pág. 32, de 26/10/2018."

    dh["HistoricoInformacoesAdicionais"] = mensagem_hist.strip()
    df["prefixo_mensagem"] = prefixo_mensagem.strip()

    dh["RegistroReqDadosPrivadosDiplomadoHistoricoEscolarDataEmissaoHistorico"] = fmt_data_iso(d_emissao)
    dh["RegistroReqDadosPrivadosDiplomadoHistoricoEscolarIngressoCursoData"] = fmt_data_iso(d_inicio)
    dh["RegistroReqDadosPrivadosDiplomadoHistoricoEscolarSituacaoAtualDiscentePeriodoLetivo"] = p_letivo
    dh["RegistroReqDadosPrivadosDiplomadoHistoricoEscolarSituacaoAtualDiscenteSituacaoDiscenteFormadoDataConclusaoCurso"] = fmt_data_iso(d_conclusao)
    dh["RegistroReqDadosPrivadosDiplomadoHistoricoEscolarSituacaoAtualDiscenteSituacaoDiscenteFormadoDataColacaoGrau"] = fmt_data_iso(d_colacao)
    dh["RegistroReqDadosPrivadosDiplomadoHistoricoEscolarSituacaoAtualDiscenteSituacaoDiscenteFormadoDataExpedicaoDiploma"] = fmt_data_iso(d_emissao)
    
    situacoes_discentes = dh.get("RegistroReqDadosPrivadosDiplomadoHistoricoEscolarMatrizCurricularSituacoesDiscentes", [])
    if situacoes_discentes:
        situacoes_discentes[0]["RegistroReqDadosPrivadosDiplomadoHistoricoEscolarMatrizCurricularSituacaoDiscentePeriodoLetivo"] = p_letivo
        situacoes_discentes[0]["RegistroReqDadosPrivadosDiplomadoHistoricoEscolarMatrizCurricularSituacaoDiscenteSituacaoDiscenteFormadoDataConclusaoCurso"] = fmt_data_iso(d_conclusao)
        situacoes_discentes[0]["RegistroReqDadosPrivadosDiplomadoHistoricoEscolarMatrizCurricularSituacaoDiscenteSituacaoDiscenteFormadoDataColacaoGrau"] = fmt_data_iso(d_colacao)
        situacoes_discentes[0]["RegistroReqDadosPrivadosDiplomadoHistoricoEscolarMatrizCurricularSituacaoDiscenteSituacaoDiscenteFormadoDataExpedicaoDiploma"] = fmt_data_iso(d_emissao)

    atividades = dh.get("RegistroReqDadosPrivadosDiplomadoHistoricoEscolarMatrizCurricularAtividadesComplementares", [])
    if atividades:
        atividades[0]["RegistroReqDadosPrivadosDiplomadoHistoricoEscolarMatrizCurricularAtividadeComplementarDataInicio"] = fmt_data_iso(d_inicio)
        atividades[0]["RegistroReqDadosPrivadosDiplomadoHistoricoEscolarMatrizCurricularAtividadeComplementarDataFim"] = fmt_data_iso(d_conclusao)

    estagios = dh.get("RegistroReqDadosPrivadosDiplomadoHistoricoEscolarMatrizCurricularEstagios", [])
    if estagios:
        estagios[0]["RegistroReqDadosPrivadosDiplomadoHistoricoEscolarMatrizCurricularEstagioDataInicio"] = fmt_data_iso(d_inicio)
        estagios[0]["RegistroReqDadosPrivadosDiplomadoHistoricoEscolarMatrizCurricularEstagioDataFim"] = fmt_data_iso(d_conclusao)

    periodos_turma = df.get("periodos_disciplinas", [])
    disciplinas_mec = dh.get("RegistroReqDadosPrivadosDiplomadoHistoricoEscolarMatrizCurricularDisciplinasCursadas", [])
    
    for i, d_mec in enumerate(disciplinas_mec):
        if periodos_turma and i < len(periodos_turma):
            d_mec["RegistroReqDadosPrivadosDiplomadoHistoricoEscolarMatrizCurricularDisciplinaCursadaPeriodo"] = periodos_turma[i]
            
        nome_mec = d_mec["RegistroReqDadosPrivadosDiplomadoHistoricoEscolarMatrizCurricularDisciplinaCursadaDisciplina"].lower().strip()
        melhor_nota = None
        maior_ratio = 0
        
        for d_bol in boletim:
            nome_bol = d_bol["disciplina"].lower().strip()
            ratio = fuzz.ratio(nome_mec, nome_bol)
            if ratio >= 80 and ratio > maior_ratio:
                maior_ratio = ratio
                melhor_nota = d_bol["nota"]
        if melhor_nota is not None:
            d_mec["RegistroReqDadosPrivadosDiplomadoHistoricoEscolarMatrizCurricularDisciplinaCursadaNota"] = round(float(melhor_nota), 2)
    return pl

# ==========================================
# FASE 5: SOLIS (HISTÓRICO E DIPLOMA)
# ==========================================
def gerar_historico_solis(payload_hist, pasta_aluno, token_solis, nome_fmt, tracker):
    logger.info(f"{tracker} Solicitando geração do Histórico Escolar na Solis...")
    h_solis = {"Content-Type": "application/json", "Accept": "application/json", "Authorization": f"Bearer {token_solis}"}
    p_dip = os.path.join(pasta_aluno, "Documentos_Diploma_API")
    os.makedirs(p_dip, exist_ok=True)
    res_h = requests.post(f"{SOLIS_API_BASE_URL}/historico-escolar/gerar", headers=h_solis, json=payload_hist, timeout=180).json()
    d_hist = res_h.get("data", {})

    if d_hist.get("situacao_historico") != "EM CONFORMIDADE": 
        logger.error(f"{tracker} Erro Histórico: {json.dumps(res_h, ensure_ascii=False)}")
        raise RuntimeError(f"Erro Histórico: {res_h.get('mensagens', d_hist.get('erros', res_h))}")
        
    hx_path = os.path.join(p_dip, f"Historico_{nome_fmt}.xml")
    if d_hist.get("historico"):
        with open(hx_path, "w", encoding="utf-8") as f: f.write(d_hist.get("historico",""))
        dest_hist = os.path.join(DIRETORIO_HISTORICOS_XML, f"Historico_{nome_fmt}.xml")
        shutil.copy(hx_path, dest_hist)
    else: hx_path = None
        
    hp_path = os.path.join(p_dip, f"RVHE_{nome_fmt}.pdf")
    if d_hist.get("rvhe"):
        with open(hp_path, "wb") as f: f.write(base64.b64decode(d_hist["rvhe"]))
    else: hp_path = None

    logger.info(f"{tracker} Histórico gerado com sucesso e cópia salva na pasta de Lotes.")
    return hx_path, hp_path

def gerar_diploma_solis(df, payload_hist, pasta_aluno, token_solis, tracker, tpl_dip):
    nome_fmt = df.get("nome","Aluno").replace(" ", "_")
    h_solis = {"Content-Type": "application/json", "Accept": "application/json", "Authorization": f"Bearer {token_solis}"}
    p_dip = os.path.join(pasta_aluno, "Documentos_Diploma_API")
    os.makedirs(p_dip, exist_ok=True)
    
    tpl_dip["codigo_interno"] = df.get("id_card", "99999")
    tpl_dip["gerar_rv"] = True
    tpl_dip["versao"] = "1.05"
    
    for chave, valor in payload_hist["dados_historico"].items():
        tpl_dip["dados_academicos"][chave] = deepcopy(valor)
    
    da = tpl_dip["dados_academicos"]
    nome_curso = df.get("nome_curso", "")
    if nome_curso: da["DadosDiplomaDadosCursoNomeCurso"] = nome_curso

    da["DadosDiplomaDiplomadoID"] = df.get("id_diplomado", df.get("id_card", "99999"))
    da["DadosDiplomaDataConclusao"] = fmt_data_iso(df.get("data_conclusao_curso",""))
    da["DadosDiplomaDadosCursoGrauConferido"] = df.get("grau_conferido","Licenciatura")
    da["DadosDiplomaDadosCursoTituloConferidoTitulo"] = "Licenciado" if df.get("grau_conferido") == "Licenciatura" else "Bacharel"
    da["DadosDiplomaDadosCursoModalidade"] = df.get("modalidade","EAD")
    da["DadosDiplomaDiplomadoSexo"] = df.get("sexo", "F") 

    mensagem_dip = None
    curso_upper = nome_curso.upper()
    if "PEDAGOGIA" in curso_upper:
        mensagem_dip = df.get("prefixo_mensagem", "").strip()
    elif "ARTES VISUAIS" in curso_upper or "GEOGRAFIA" in curso_upper:
        mensagem_dip = "Curso reconhecido na forma do art. 11, § 1°, do Decreto n° 9.235, de 15 de dezembro de 2017, e do art. 26, § 1°, da Portaria MEC n° 1.095, de 25/10/2018, DOU n° 207, seção 01, pág. 32, de 26/10/2018."
    da["DadosDiplomaDadosCursoReconhecimentoInformacoesTramitacaoEMECTipoProcesso"] = mensagem_dip

    da["DadosDiplomaDadosCursoEnderecoLogradouro"] = da.get("DadosDiplomaIesEmissoraEnderecoLogradouro", "Rua Afonso Pena")
    da["DadosDiplomaDadosCursoEnderecoNumero"] = da.get("DadosDiplomaIesEmissoraEnderecoNumero", "800")
    da["DadosDiplomaDadosCursoEnderecoComplemento"] = da.get("DadosDiplomaIesEmissoraEnderecoComplemento", "Sede")
    da["DadosDiplomaDadosCursoEnderecoBairro"] = da.get("DadosDiplomaIesEmissoraEnderecoBairro", "Centro")
    da["DadosDiplomaDadosCursoEnderecoCEP"] = da.get("DadosDiplomaIesEmissoraEnderecoCEP", "16010-370")
    da["DadosDiplomaDadosCursoEnderecoCodigoMunicipio"] = da.get("DadosDiplomaIesEmissoraEnderecoCodigoMunicipio", "3502804")
    da["DadosDiplomaDadosCursoEnderecoNomeMunicipio"] = da.get("DadosDiplomaIesEmissoraEnderecoNomeMunicipio", "Araçatuba")
    da["DadosDiplomaDadosCursoEnderecoUF"] = da.get("DadosDiplomaIesEmissoraEnderecoUF", "SP")

    c_termo = os.path.join(pasta_aluno, "Arquivos_PDF", f"termo_{nome_fmt}.pdf")
    if os.path.exists(c_termo):
        with open(c_termo, "rb") as f: da["RegistroReqTermoResponsabilidadeAtoDesignacao"] = base64.b64encode(f.read()).decode('utf-8')
    da["RegistroReqTermoResponsabilidadeNome"] = "Maria Rafaella Furlanetti da Silva Natale"
    da["RegistroReqTermoResponsabilidadeCPF"] = "456.614.288-47"
    da["RegistroReqTermoResponsabilidadeCargo"] = "Secretária Geral"
    
    docs_finais = []
    mapa_docs = {"rg_cpf_path": "DocumentoIdentidadeDoAluno", "hist_em_path": "ProvaConclusaoEnsinoMedio", "comp_endereco_path": "Outros", "hist_grad_anterior_path": "Outros", "diploma_grad_anterior_path": "Outros"}
    for k, t in mapa_docs.items():
        if df.get(k) and os.path.exists(df[k]):
            with open(df[k], "rb") as f: docs_finais.append({"RegistroReqDocumentacaoComprobatoriaDocumentoTipo": t, "RegistroReqDocumentacaoComprobatoriaDocumentoDocumento": base64.b64encode(f.read()).decode('utf-8'), "RegistroReqDocumentacaoComprobatoriaDocumentoObservacoes": f"Documento {t}."})
    
    if df.get("certidao_path") and os.path.exists(df["certidao_path"]):
        t_cert = "CertidaoCasamento" if df.get("tipo_certidao") == "CASAMENTO" else "CertidaoNascimento"
        with open(df["certidao_path"], "rb") as f: docs_finais.append({"RegistroReqDocumentacaoComprobatoriaDocumentoTipo": t_cert, "RegistroReqDocumentacaoComprobatoriaDocumentoDocumento": base64.b64encode(f.read()).decode('utf-8'), "RegistroReqDocumentacaoComprobatoriaDocumentoObservacoes": f"Documento {t_cert}."})

    for arq in ["oficio", "certificado"]:
        c = os.path.join(pasta_aluno, "Arquivos_PDF", f"{arq}_{nome_fmt}.pdf")
        if os.path.exists(c):
            with open(c, "rb") as f: docs_finais.append({"RegistroReqDocumentacaoComprobatoriaDocumentoTipo": "Outros", "RegistroReqDocumentacaoComprobatoriaDocumentoDocumento": base64.b64encode(f.read()).decode('utf-8'), "RegistroReqDocumentacaoComprobatoriaDocumentoObservacoes": "Documento gerado pelo sistema."})

    da["RegistroReqDocumentacaoComprobatoriaDocumentos"] = docs_finais
    da["DadosDiplomaAssinantes"] = []
    da["DadosRegistroAssinantes"] = []

    logger.info(f"{tracker} Emitindo Diploma na Solis versão 1.05...")
    res_d = requests.post(f"{SOLIS_API_BASE_URL}/diploma-digital/gerar", headers=h_solis, json=tpl_dip, timeout=180).json()
        
    d_dip = res_d.get("data", {})
    if d_dip.get("situacao_diploma") != "EM CONFORMIDADE": 
        raise RuntimeError(f"Erro Diploma: {res_d.get('mensagens', d_dip.get('erros', res_d))}")
        
    x_path = os.path.join(p_dip, f"Diploma_{nome_fmt}.xml")
    with open(x_path, "w", encoding="utf-8") as f: f.write(d_dip.get("documentacao",""))
    dest_dip = os.path.join(DIRETORIO_LOTE, f"Diploma_{nome_fmt}.xml")
    shutil.copy(x_path, dest_dip)
    
    p_path = os.path.join(p_dip, f"RVDD_{nome_fmt}.pdf")
    if d_dip.get("rvdd"):
        with open(p_path, "wb") as f: f.write(base64.b64decode(d_dip["rvdd"]))

    logger.info(f"{tracker} ✅ DIPLOMA CONCLUÍDO COM SUCESSO (Cópia salva no Lote)!")
    return x_path, p_path

# ==========================================
# ENVIO EM LOTE PARA A SOLIS
# ==========================================
def enviar_lote_assinatura(token_solis):
    xmls_diploma = [f for f in os.listdir(DIRETORIO_LOTE) if f.endswith(".xml") and os.path.isfile(os.path.join(DIRETORIO_LOTE, f))]
    if not xmls_diploma:
        logger.info("Nenhum XML de diploma encontrado na pasta Lote. Pulando assinatura em lote.")
        return
        
    logger.info("Empacotando lote de diplomas para assinatura automatizada...")
    nome_zip = f"LOTE_ESP_{datetime.now().strftime('%d%m%Y_%H%M%S')}.zip"
    caminho_zip = os.path.join(DIRETORIO_LOTE, nome_zip)
    
    with zipfile.ZipFile(caminho_zip, 'w', zipfile.ZIP_DEFLATED) as z:
        for xml_file in xmls_diploma:
            caminho_xml = os.path.join(DIRETORIO_LOTE, xml_file)
            z.write(caminho_xml, xml_file)
            
    with open(caminho_zip, "rb") as f: b64_zip = base64.b64encode(f.read()).decode('utf-8')
    
    s_d = SIGNER_DATA
    pl_ass = {
        "author_email": SOLIS_EMAIL, 
        "description": f"LOTE_ESP_{datetime.now().strftime('%d%m%Y')}", 
        "arquivoZip": b64_zip,
        "signers": [
            {"name": s_d["signer0_name"], "cpf_cnpj": s_d["signer0_cpf"], "email": s_d["email"], "section": "DadosDiploma"},
            {"name": s_d["school_name"], "cpf_cnpj": s_d["school_cnpj"], "email": s_d["email"], "section": "DadosDiploma"},
            {"name": s_d["school_name"], "cpf_cnpj": s_d["school_cnpj"], "email": s_d["email"], "section": "DocumentacaoAcademicaRegistro"}
        ]
    }
    
    h_solis = {"Content-Type": "application/json", "Accept": "application/json", "Authorization": f"Bearer {token_solis}"}
    
    logger.info("Enviando ZIP do Lote para a Solis...")
    try:
        res = requests.post(f"{SOLIS_API_BASE_URL}/assinaturas/novo", headers=h_solis, json=pl_ass, timeout=180)
        res.raise_for_status()
        logger.info("✅ LOTE ENVIADO COM SUCESSO PARA ASSINATURA NA SOLIS!")
    except Exception as e:
        logger.error(f"Erro ao enviar lote: {e}")

# ==========================================
# ORQUESTRADOR CENTRAL (1 Aluno) - VERSÃO SUPABASE
# ==========================================
def processar_aluno(aluno_db, t_esp, t_solis, mods_w, chaves_pdf, listas_hostinger):
    aluno_id = aluno_db.get('id')
    nome_bruto = str(aluno_db.get('nome_planilha', '')).strip()
    cpf = str(aluno_db.get('cpf', '')).strip()
    curso_alvo = str(aluno_db.get('curso_alvo', '')).strip()
    tracker = f"[{cpf}]"
    nome_fmt = nome_bruto.replace(" ", "_")
    if not nome_bruto or not cpf: return
    pasta = os.path.join(DIRETORIO_BASE_SERVIDOR, f"{nome_bruto} - {cpf}".replace("/", "-"))
    
    supabase.table('alunos_dossie').update({'status': 'EM_ANALISE_IA'}).eq('id', aluno_id).execute()
    os.makedirs(pasta, exist_ok=True)
    sessao = requests.Session()
    
    try:
        logger.info(f"{tracker} Iniciando aluno pelo Supabase: {nome_bruto} | Curso: {curso_alvo}")
        curso_alvo_limpo = "Pedagogia" if curso_alvo.upper() == "SEGUNDA GRADUAÇÃO" else re.sub(r'(?i)^(2[ªaao°]?\s*)?licenciatura\s+(em\s+)?', '', curso_alvo).strip().title()
        
        boletim = extrair_boletim_esp(cpf, curso_alvo, t_esp, sessao, tracker)
        if not boletim: raise ValueError("Boletim não encontrado na ESP.")
        baixar_docs_esp(cpf, t_esp, sessao, pasta, tracker)

        for doc_name in ["RG.pdf", "CN.pdf", "CC.pdf", "HE.pdf", "DIPLOMA.pdf", "HEEM.pdf", "CE.pdf"]:
            comprimir_pdf_via_api(os.path.join(pasta, doc_name), logger, tracker)
        
        dossie = extrair_ia_pessoais_e_academicos(pasta, tracker, curso_alvo_limpo, cpf, nome_bruto, aluno_db)
        df = dossie["dados_formulario"]
        hist_escolhido, turma_escolhida, erro_rota = definir_roteamento(curso_alvo, df.get("curso_anterior", ""), df.get("grau_anterior", ""), listas_hostinger["historicos"], listas_hostinger["turmas"], tracker)
        
        if erro_rota: raise DocumentacaoInvalidaError(erro_rota)

        res_hist = requests.get(API_TEMPLATES_URL, params={"action": "get_content", "institution": "ESP", "template": hist_escolhido}).json()
        res_turma = requests.get(API_TURMAS_URL, params={"action": "get_content", "institution": "ESP", "turma_file": turma_escolhida}).json()
        
        payload_hist = fase_4_documentos_e_payload(dossie, boletim, pasta, mods_w, res_hist, chaves_pdf, tracker, res_turma)
        
        hx_path, hp_path = gerar_historico_solis(payload_hist, pasta, t_solis, nome_fmt, tracker)
        tpl_dip_base = requests.get(API_TEMPLATES_URL, params={"action": "get_content", "institution": "ESP", "template": "diploma-template.json"}).json()
        dx_path, dp_path = gerar_diploma_solis(dossie["dados_formulario"], payload_hist, pasta, t_solis, tracker, tpl_dip_base)
        
        # --- UPLOAD PARA A GAVETA 'documentos_finais' ---
        url_historico = None
        url_xml = None
        try:
            if hp_path and os.path.exists(hp_path):
                nome_storage_hist = f"{aluno_id}_historico.pdf"
                with open(hp_path, "rb") as f:
                    supabase.storage.from_("documentos_finais").upload(nome_storage_hist, f, file_options={"upsert": "true", "content-type": "application/pdf"})
                url_historico = supabase.storage.from_("documentos_finais").get_public_url(nome_storage_hist)
            
            if dx_path and os.path.exists(dx_path):
                nome_storage_xml = f"{aluno_id}_diploma.xml"
                with open(dx_path, "rb") as f:
                    supabase.storage.from_("documentos_finais").upload(nome_storage_xml, f, file_options={"upsert": "true", "content-type": "application/xml"})
                url_xml = supabase.storage.from_("documentos_finais").get_public_url(nome_storage_xml)
        except Exception as e_up:
            logger.error(f"{tracker} Erro ao subir para Storage: {e_up}")
            
        dossie["urls_finais"] = {"historico_pdf": url_historico, "diploma_xml": url_xml}

        # 🎉 SUCESSO TOTAL
        supabase.table('alunos_dossie').update({'status': 'EMITIDO_SOLIS', 'dados_extraidos': dossie}).eq('id', aluno_id).execute()
        
    except DocumentacaoInvalidaError as de:
        logger.error(f"{tracker} ❌ DOCUMENTAÇÃO REPROVADA / ERRO DE ROTA: {de}")
        url_publica = None
        try:
            nome_arquivo_mesclado = "DOSSIE_AUDITORIA.pdf"
            caminho_mesclado = os.path.join(pasta, nome_arquivo_mesclado)
            doc_mesclado = fitz.open()
            tem_documento = False
            for doc_nome in ["RG.pdf", "CPF.pdf", "CN.pdf", "CC.pdf", "HE.pdf", "DIPLOMA.pdf"]:
                if os.path.exists(os.path.join(pasta, doc_nome)):
                    try:
                        pdf_temp = fitz.open(os.path.join(pasta, doc_nome))
                        doc_mesclado.insert_pdf(pdf_temp)
                        pdf_temp.close()
                        tem_documento = True
                    except: pass
            if tem_documento:
                doc_mesclado.save(caminho_mesclado)
                doc_mesclado.close()
                nome_arquivo_storage = f"{aluno_id}_{nome_arquivo_mesclado}"
                with open(caminho_mesclado, "rb") as f:
                    supabase.storage.from_("documentos_auditoria").upload(nome_arquivo_storage, f, file_options={"upsert": "true", "content-type": "application/pdf"})
                url_publica = supabase.storage.from_("documentos_auditoria").get_public_url(nome_arquivo_storage)
        except: pass

        dados_salvar_erro = {'status': 'REPROVADO_IA', 'motivo_reprovacao': str(de), 'documento_erro_url': url_publica}
        if getattr(de, 'dossie_parcial', None): dados_salvar_erro['dados_extraidos'] = de.dossie_parcial
        supabase.table('alunos_dossie').update(dados_salvar_erro).eq('id', aluno_id).execute()
        
        # --- INÍCIO DA ADIÇÃO: WEBHOOK DO BITRIX ---
        try:
            # Vai no banco de dados ver o que o Admin digitou na tela de configurações!
            resp_config = supabase.table('config_sistema').select('bitrix_webhook_url').eq('id', 1).execute()
            webhook_bitrix = resp_config.data[0].get('bitrix_webhook_url') if resp_config.data else None
            
            if webhook_bitrix and webhook_bitrix.strip() != "":
                logger.info(f"{tracker} 🔔 [WEBHOOK] Iniciando notificação de diligência para o Bitrix...")
                
                # Monta a mensagem que vai chegar no Bitrix para a equipe
                payload_bitrix = {
                    "aluno": nome_bruto,
                    "cpf": cpf,
                    "motivo_reprovacao": str(de),
                    # Ajuste o domínio abaixo para a URL real onde sua aplicação React está hospedada
                    "link_auditoria": "https://seu-sistema.com/auditoria" 
                }
                
                # Dispara o aviso via POST
                resposta_bitrix = requests.post(webhook_bitrix, json=payload_bitrix, timeout=15)
                
                if resposta_bitrix.ok:
                    logger.info(f"{tracker} ✅ [WEBHOOK] Equipe notificada com sucesso no Bitrix!")
                else:
                    logger.warning(f"{tracker} ⚠️ [WEBHOOK] O Bitrix retornou status {resposta_bitrix.status_code}")
                    
        except Exception as erro_webhook:
            logger.error(f"{tracker} ❌ [WEBHOOK] Falha ao consultar banco ou comunicar com o Bitrix: {erro_webhook}")
        # --- FIM DA ADIÇÃO ---
        
    except Exception as e:
        logger.error(f"{tracker} ❌ Falha geral: {e}", exc_info=True)
        supabase.table('alunos_dossie').update({'status': 'REPROVADO_IA', 'motivo_reprovacao': f"Erro Geral: {str(e)}"}).eq('id', aluno_id).execute()
    finally:
        sessao.close()

# ==========================================
# BOOT E MULTITHREADING (O NOVO MOTOR SUPABASE)
# ==========================================
def motor_certificacao_autonomo():
    logger.info("🌟 VERIFICANDO FILA NO SUPABASE 🌟")
    os.makedirs(DIRETORIO_LOTE, exist_ok=True)
    os.makedirs(DIRETORIO_HISTORICOS_XML, exist_ok=True)
    
    resposta = supabase.table("alunos_dossie").select("*").eq("status", "AGUARDANDO_ROBO").execute()
    tarefas = resposta.data
    
    if not tarefas:
        logger.info("Nenhum aluno na fila de processamento. Vou dormir! 💤")
        return
        
    lotes_ids = list(set([t.get("lote_id") for t in tarefas if t.get("lote_id")]))
    for lote_id in lotes_ids:
        supabase.table("lotes").update({"status": "PROCESSANDO"}).eq("id", lote_id).execute()
        
    logger.info(f"Encontrados {len(tarefas)} alunos na fila. Autenticando nos portais ESP e SOLIS...")
    t_esp = requests.post(URL_LOGIN_ESTATICA, json={"email": EMAIL_PORTAL, "password": SENHA_PORTAL}, headers={"Accept":"application/json","Company":"iteq","Content-Type":"application/json"}).json().get("data",{}).get("user",{}).get("authorization")
    t_solis = requests.post(f"{SOLIS_API_BASE_URL}/login", headers={"Accept":"application/json","Client": SOLIS_CLIENT_SECRET}, json={"email": SOLIS_EMAIL, "password": SOLIS_SENHA}).json().get("data",{}).get("token")
    chaves_pdf = requests.get(API_KEYS_URL, params={"service": "ilovepdf"}).json()
    
    logger.info("Mapeando acervo de Templates e Turmas na Hostinger...")
    historicos_disp = requests.get(API_TEMPLATES_URL, params={"action": "list_templates", "institution": "ESP"}).json()
    turmas_disp = requests.get(API_TURMAS_URL, params={"action": "list_turmas", "institution": "ESP"}).json()
    
    listas_hostinger = {
        "historicos": historicos_disp if historicos_disp else [],
        "turmas": turmas_disp if turmas_disp else []
    }

    logger.info("Baixando modelos Word locais do servidor...")
    tmp_dir = tempfile.mkdtemp(prefix="spa_mods_")
    mods_w = {}
    for t in ["certificado", "oficio", "termo"]:
        r = requests.get(API_MODELOS_URL, params={"institution": "ESP", "type": t})
        c = os.path.join(tmp_dir, f"{t}.docx")
        with open(c, "wb") as f: f.write(r.content)
        mods_w[t] = c

    logger.info(f"🚀 Disparando agentes simultâneos para {len(tarefas)} alunos... (SaaS Mode)")
    with ThreadPoolExecutor(max_workers=3) as exc:
        futs = [exc.submit(processar_aluno, aluno_db, t_esp, t_solis, mods_w, chaves_pdf, listas_hostinger) for aluno_db in tarefas]
        for f in as_completed(futs):
            try: f.result()
            except Exception as e: logger.error(f"Erro de thread na root: {e}")

    shutil.rmtree(tmp_dir)
    enviar_lote_assinatura(t_solis)
    
    for lote_id in lotes_ids:
        resp_lote = supabase.table("alunos_dossie").select("status").eq("lote_id", lote_id).execute()
        tem_erro = any(aluno.get("status") in ["REPROVADO_IA", "REPROVADO_ROTA"] for aluno in resp_lote.data)
        status_final = "COM_ERRO" if tem_erro else "CONCLUIDO"
        supabase.table("lotes").update({"status": status_final}).eq("id", lote_id).execute()

    logger.info("🏁 LOTE FINALIZADO NO SUPABASE!")

if __name__ == "__main__":
    logger.info("🤖 Robô em modo Sentinela ativado! Monitorando o Supabase em tempo real...")
    
    while True:
        try:
            # Roda o motor
            motor_certificacao_autonomo()
        except Exception as e:
            logger.error(f"❌ Erro crítico no motor: {e}")
        
        # Espera 10 segundos e tenta de novo infinitamente
        time.sleep(10)