# Chat de Entrevista Biográfica com IA

Este projeto é uma aplicação web que simula uma entrevista biográfica conduzida por uma Inteligência Artificial. A IA atua como um entrevistador empático e curioso, guiando o usuário através de uma conversa para coletar informações e construir uma história de vida rica e coerente.

O objetivo é criar uma experiência de entrevista fluida e natural, onde o usuário se sinta à vontade para compartilhar suas memórias e reflexões.

## Tecnologias Utilizadas

O projeto é construído com uma arquitetura moderna de aplicação web, separando o frontend do backend.

- **Frontend:**
  - **React:** Uma biblioteca JavaScript para construir interfaces de usuário interativas.
  - **Axios:** Um cliente HTTP para fazer requisições à API do backend.
  - **CSS:** Estilização personalizada para criar uma interface de chat limpa e agradável.

- **Backend:**
  - **Flask:** Um micro-framework Python para criar a API que serve o modelo de IA.
  - **Google Gemini:** O modelo de linguagem avançado que alimenta a lógica do entrevistador.
  - **Redis:** Um banco de dados em memória usado para armazenar o histórico da conversa, garantindo que a IA mantenha o contexto ao longo da entrevista.
  - **Flask-CORS:** Uma extensão para lidar com o compartilhamento de recursos entre origens (Cross-Origin Resource Sharing), permitindo que o frontend se comunique com o backend.

---

## Como Executar o Projeto

Para rodar a aplicação em seu ambiente local, você precisará ter o **Node.js**, **npm**, **Python**, **pip** e **Redis** instalados.

### 1. Pré-requisitos

- **Node.js e npm:** [https://nodejs.org/](https://nodejs.org/)
- **Python e pip:** [https://www.python.org/](https://www.python.org/)
- **Redis:** [https://redis.io/download](https://redis.io/download)
- **Chave de API do Gemini:** Você precisará de uma chave de API do Google AI Studio. Você pode obter uma em [https://aistudio.google.com/](https://aistudio.google.com/).

### 2. Configuração do Backend

Abra um terminal e siga os passos abaixo:

```bash
# 1. Navegue até a pasta do backend
cd backend

# 2. (Opcional, mas recomendado) Crie e ative um ambiente virtual
python -m venv venv
source venv/bin/activate  # No Windows, use `venv\Scripts\activate`

# 3. Instale as dependências do Python
pip install -r requirements.txt

# 4. Configure sua chave de API
#    - Renomeie o arquivo .env.example para .env (se existir) ou crie um.
#    - Abra o arquivo .env e substitua "SUA_CHAVE_API" pela sua chave real do Gemini.
#      GEMINI_API_KEY="SUA_CHAVE_API_AQUI"

# 5. Inicie o servidor Redis
#    Certifique-se de que o serviço do Redis esteja rodando na sua máquina.
#    (A inicialização pode variar dependendo do seu sistema operacional).

# 6. Inicie o servidor Flask
python app.py
```

O backend estará em execução em `http://localhost:5001`.

### 3. Configuração do Frontend

Abra um **segundo terminal** e siga os passos:

```bash
# 1. Navegue até a pasta do frontend
cd frontend

# 2. Instale as dependências do Node.js
npm install

# 3. Inicie a aplicação React
npm start
```

Seu navegador abrirá automaticamente no endereço `http://localhost:3000`, e você poderá começar a interagir com o entrevistador.

---

## Arquitetura

1.  **Interface do Usuário (React):** O usuário digita suas respostas em uma interface de chat.
2.  **Requisição HTTP (Axios):** A mensagem do usuário é enviada para o backend via uma requisição POST para o endpoint `/chat`.
3.  **Servidor (Flask):**
    - Recebe a mensagem.
    - Recupera o histórico da conversa da sessão atual no **Redis**.
    - Envia o histórico e a nova mensagem para a API do **Gemini**, junto com o prompt do sistema que define a persona do entrevistador.
4.  **IA (Gemini):** Processa a conversa e gera a próxima pergunta com base no contexto e nas instruções do prompt.
5.  **Atualização do Histórico (Redis):** A resposta da IA é adicionada ao histórico da conversa no Redis.
6.  **Resposta HTTP (Flask):** A resposta gerada pela IA é enviada de volta para o frontend.
7.  **Exibição na Tela (React):** A resposta do entrevistador é exibida na interface do chat, e o ciclo recomeça.
