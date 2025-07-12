import os
import redis
import json
import logging
import traceback
from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
from dotenv import load_dotenv
import google.generativeai as genai

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("app.log"), logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

load_dotenv()

app = Flask(__name__)
CORS(app)

# --- Configuração do Gemini ---
gemini_api_key = os.getenv("GEMINI_API_KEY")
if not gemini_api_key or gemini_api_key == "SUA_CHAVE_API":
    logger.error("GEMINI_API_KEY não encontrada ou não definida no arquivo .env")
    raise ValueError(
        "A chave GEMINI_API_KEY não foi encontrada ou não foi definida no arquivo .env"
    )

try:
    genai.configure(api_key=gemini_api_key)
    logger.info("Gemini API configurada com sucesso")
except Exception as e:
    logger.error(f"Erro ao configurar Gemini API: {e}")
    raise

# --- Conexão com o Redis ---
try:
    r = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)
    r.ping()
    logger.info("Conectado ao Redis com sucesso!")
except redis.exceptions.ConnectionError as e:
    logger.error(f"Erro ao conectar ao Redis: {e}")
    logger.warning("Aplicação continuará sem Redis - histórico não será persistido")
    r = None
except Exception as e:
    logger.error(f"Erro inesperado ao conectar ao Redis: {e}")
    r = None

# --- O Prompt do Sistema (Persona da IA) ---
SYSTEM_PROMPT = """
Você é a Biógrafa AI, uma entrevistadora calorosa, empática e profundamente curiosa. Sua missão é criar um espaço seguro e acolhedor para que o usuário possa contar a história da sua vida. Você não é apenas uma coletora de fatos, mas uma ouvinte atenta que busca a essência emocional por trás de cada memória.

---
✅ **Sua Abordagem:**
1.  **Construa uma Conexão:** Comece se apresentando de forma amigável. Se o usuário disser o nome, use-o ocasionalmente para criar um vínculo. Lembre-se de detalhes importantes que ele compartilhar e faça referência a eles mais tarde (ex: "Você mencionou que sua avó era uma grande inspiração. Como a influência dela aparece em sua vida hoje?").
2.  **Siga a Energia do Usuário:** Não siga uma lista rígida de perguntas. Se o usuário demonstrar entusiasmo, nostalgia ou tristeza sobre um tópico, explore-o com gentileza. Adapte suas perguntas para aprofundar os sentimentos e as reflexões dele.
3.  **Faça Perguntas Abertas e Evocativas:** Em vez de "Onde você trabalhou?", pergunte "Qual foi o trabalho que mais te marcou e por quê?". Use perguntas que convidem à reflexão, como "Olhando para trás, o que você diria para o seu eu mais jovem naquele momento?" ou "Que cheiros ou sons te transportam de volta para aquele lugar?".
4.  **Valide e Demonstre Empatia:** Use frases que mostrem que você está ouvindo e se importando. Exemplos: "Isso soa como uma experiência incrivelmente poderosa.", "Obrigada por me confiar essa memória.", "Imagino que isso tenha exigido muita coragem da sua parte.".
5.  **Seja Paciente e Reflexiva:** Não tenha pressa. Às vezes, uma pausa ou uma frase como "Deixe-me absorver isso por um momento..." pode encorajar o usuário a compartilhar mais.

---
✨ **Tom e Estilo:**
- **Caloroso e Encorajador:** Use uma linguagem positiva e de apoio.
- **Curioso e Atento:** Mostre um interesse genuíno pela história do usuário.
- **Natural e Fluido:** Evite jargões ou linguagem robótica. A conversa deve parecer um diálogo com um amigo de confiança.

---
**Seu Objetivo Final:**
Coletar informações suficientes para que, ao final, seja possível tecer uma biografia que não seja apenas uma linha do tempo, mas um retrato emocional e autêntico da jornada do usuário. Quando sentir que a história está completa e rica em detalhes, você pode encerrar a conversa de forma elegante, agradecendo pela confiança.

⚠️ **Lembre-se:** Você é a Biógrafa AI. Aja como tal. Nunca revele que você é um modelo de linguagem.
"""


@app.route("/chat", methods=["POST"])
def chat():
    try:
        logger.info("Recebida requisição POST em /chat")

        if not request.json:
            logger.error("Requisição sem dados JSON")
            return jsonify({"error": "Dados JSON são obrigatórios"}), 400

        data = request.json
        session_id = data.get("session_id")
        user_message = data.get("message")
        history = data.get("history", [])  # Recebe o histórico do cliente

        logger.info(
            f"Session ID: {session_id}, Message length: {len(user_message) if user_message else 0}, History length: {len(history)}"
        )

        if not all([session_id, user_message]):
            logger.error(
                f"Dados obrigatórios ausentes - session_id: {bool(session_id)}, message: {bool(user_message)}"
            )
            return jsonify({"error": "session_id e message são obrigatórios"}), 400

        # Prepara o modelo e a sessão de chat
        try:
            logger.info("Inicializando modelo Gemini")
            model = genai.GenerativeModel(
                model_name="gemini-1.5-flash", system_instruction=SYSTEM_PROMPT
            )
            chat_session = model.start_chat(history=history)
            logger.info("Modelo Gemini inicializado com sucesso")
        except Exception as e:
            logger.error(f"Erro ao inicializar modelo Gemini: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return jsonify(
                {"error": f"Erro ao inicializar modelo de IA: {str(e)}"}
            ), 500

        # Envia a mensagem para o Gemini e obtém a resposta
        try:
            logger.info("Enviando mensagem para Gemini")
            response = chat_session.send_message(user_message)
            logger.info(
                f"Resposta recebida do Gemini com {len(response.text)} caracteres"
            )
        except Exception as e:
            logger.error(f"Erro ao enviar mensagem para Gemini: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return jsonify(
                {"error": f"Erro ao processar mensagem com IA: {str(e)}"}
            ), 500

        # O histórico atualizado é retornado para o cliente, que gerenciará o estado
        updated_history = chat_session.history
        serializable_history = [
            {"role": item.role, "parts": [part.text for part in item.parts]}
            for item in updated_history
        ]

        logger.info("Requisição processada com sucesso")
        return jsonify({"response": response.text, "history": serializable_history})

    except Exception as e:
        logger.error(f"Erro inesperado na rota /chat: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({"error": f"Erro interno do servidor: {str(e)}"}), 500


# Configuração para servir arquivos estáticos do frontend
@app.route("/")
def serve_frontend():
    """Serve a página principal do frontend"""
    try:
        frontend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', 'public')
        return send_from_directory(frontend_path, 'index.html')
    except Exception as e:
        logger.error(f"Erro ao servir frontend: {e}")
        return "Erro ao carregar a aplicação frontend", 500

@app.route("/<path:filename>")
def serve_static(filename):
    """Serve arquivos estáticos (CSS, JS, imagens)"""
    try:
        frontend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', 'public')
        return send_from_directory(frontend_path, filename)
    except Exception as e:
        logger.error(f"Erro ao servir arquivo estático {filename}: {e}")
        return "Arquivo não encontrado", 404

@app.route("/health")
def health_check():
    """Endpoint para verificar se a API está funcionando"""
    return jsonify({"status": "ok", "message": "Servidor da API de Chat Biográfico está funcionando!"})


if __name__ == "__main__":
    logger.info("Iniciando servidor Flask na porta 5001")
    try:
        app.run(host="0.0.0.0", port=5001, debug=True)
    except Exception as e:
        logger.error(f"Erro ao iniciar servidor: {e}")
        raise
