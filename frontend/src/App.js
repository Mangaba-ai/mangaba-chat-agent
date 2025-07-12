import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

// Gera um ID de sessão simples (em um app real, use UUID)
const getSessionId = () => {
  let sessionId = localStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
};

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mensagem inicial do entrevistador
  useEffect(() => {
    setMessages([
      {
        text: 'Olá! Sou seu entrevistador biográfico. Sinta-se à vontade para começar a compartilhar sua história. Que tal começarmos pelas suas origens? Onde você cresceu?',
        isUser: false,
      },
    ]);
  }, []);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { text: input, isUser: true };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const sessionId = getSessionId();
      const response = await axios.post('http://localhost:5001/chat', {
        session_id: sessionId,
        message: input,
      });

      const botMessage = { text: response.data.response, isUser: false };
      setMessages((prev) => [...prev, botMessage]);

    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);
      const errorMessage = {
        text: 'Desculpe, ocorreu um erro ao conectar ao servidor. Verifique se o backend está rodando e tente novamente.',
        isUser: false,
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
      setError('Falha ao comunicar com a API.');
    }
    setIsLoading(false);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Entrevista Biográfica</h1>
        <p>Converse com a IA para construir sua história</p>
      </header>
      <div className="chat-container">
        <div className="message-list">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message-bubble ${msg.isUser ? 'user' : 'bot'} ${msg.isError ? 'error' : ''}`}>
              {msg.text}
            </div>
          ))}
          {isLoading && (
            <div className="message-bubble bot typing-indicator">
              <span></span><span></span><span></span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={sendMessage} className="message-form">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua resposta aqui..."
            aria-label="Sua resposta"
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Enviando...' : 'Enviar'}
          </button>
        </form>
        {error && <p className="error-message">{error}</p>}
      </div>
      <footer className="App-footer">
        <p>Powered by Gemini, LangChain, React & Flask</p>
      </footer>
    </div>
  );
}

export default App;