// Configurações e variáveis globais
const CONFIG = {
    API_BASE_URL: 'http://localhost:5001',
    SESSION_ID: generateSessionId(),
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000
};

// Estado da aplicação
let isTyping = false;
let messageHistory = [];

// Elementos DOM
const elements = {
    welcomeScreen: document.getElementById('welcomeScreen'),
    chatInterface: document.getElementById('chatInterface'),
    chatMessages: document.getElementById('chatMessages'),
    messageInput: document.getElementById('messageInput'),
    sendButton: document.getElementById('sendButton'),
    startButton: document.getElementById('startChat'),
    clearButton: document.getElementById('clearChat'),
    exportButton: document.getElementById('exportChat'),
    typingIndicator: document.getElementById('typingIndicator'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    themeToggle: document.getElementById('themeToggle'),
    connectionStatus: document.getElementById('connectionStatus')
};

// Estado adicional
let currentTheme = localStorage.getItem('theme') || 'light';
let typingTimeout = null;
const TYPING_DELAY = 1500;

// Inicialização
document.addEventListener('DOMContentLoaded', initializeApp);

// Inicializar tema
initializeTheme();

function initializeApp() {
    setupEventListeners();
    loadChatHistory();
    
    // Auto-resize do textarea
    autoResizeTextarea();
    
    console.log('🚀 Chat Biográfico inicializado com sucesso!');
}

function setupEventListeners() {
    // Botão de iniciar chat
    elements.startButton.addEventListener('click', startChat);
    
    // Botão de enviar mensagem
    elements.sendButton.addEventListener('click', sendMessage);
    
    // Enter para enviar (Shift+Enter para nova linha)
    elements.messageInput.addEventListener('keydown', handleKeyDown);
    
    // Auto-resize do textarea
    elements.messageInput.addEventListener('input', autoResizeTextarea);
    
    // Botão de limpar chat
    elements.clearButton.addEventListener('click', clearChat);
    
    // Botão de exportar
    elements.exportButton.addEventListener('click', exportChat);
    
    // Toggle de tema
    if (elements.themeToggle) {
        elements.themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Atalhos de teclado
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Verificar conexão periodicamente
    setInterval(checkConnection, 30000);
    
    // Verificar conexão inicial
    checkConnection();
    
    // Prevenir envio de formulário vazio
    elements.messageInput.addEventListener('input', toggleSendButton);
    
    // Adicionar efeitos de hover aos elementos interativos
    addHoverEffects();
}

function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function startChat() {
    elements.welcomeScreen.style.display = 'none';
    elements.chatInterface.style.display = 'flex';
    
    // Adicionar mensagem de boas-vindas da IA
    setTimeout(() => {
        addMessage(
            'ai',
            'Olá! Sou sua entrevistadora biográfica. Estou aqui para ajudá-lo a contar sua história de vida de forma única e significativa. Vamos começar pelo começo - me conte um pouco sobre onde você nasceu e como foi sua infância.',
            false
        );
        elements.messageInput.focus();
    }, 500);
}

function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

function autoResizeTextarea() {
    const textarea = elements.messageInput;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    
    toggleSendButton();
}

function toggleSendButton() {
    const hasText = elements.messageInput.value.trim().length > 0;
    elements.sendButton.disabled = !hasText || isTyping;
    elements.sendButton.style.opacity = hasText && !isTyping ? '1' : '0.5';
}

async function sendMessage() {
    const message = elements.messageInput.value.trim();
    
    if (!message || isTyping) return;
    
    // Adicionar mensagem do usuário
    addMessage('user', message);
    
    // Limpar input
    elements.messageInput.value = '';
    autoResizeTextarea();
    
    // Mostrar indicador de digitação
    showTypingIndicator();
    
    try {
        const response = await sendToAPI(message, messageHistory);
        hideTypingIndicator();
        
        if (response && response.response) {
            addMessage('ai', response.response);
            // Atualiza o histórico com a resposta da IA
            messageHistory = response.history;
            saveChatHistory();
        } else {
            throw new Error('Resposta inválida da API');
        }
    } catch (error) {
        hideTypingIndicator();
        console.error('Erro ao enviar mensagem:', error);
        addMessage('ai', 'Desculpe, ocorreu um erro ao processar sua mensagem. Pode tentar novamente?', true);
    }
    
    // Focar no input novamente
    elements.messageInput.focus();
}

async function sendToAPI(message, history, retryCount = 0) {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                session_id: CONFIG.SESSION_ID,
                message: message,
                history: history
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        if (retryCount < CONFIG.MAX_RETRIES) {
            console.log(`Tentativa ${retryCount + 1} falhou, tentando novamente...`);
            await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
            return sendToAPI(message, retryCount + 1);
        }
        throw error;
    }
}

function addMessage(sender, text, isError = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    if (isError) content.style.borderLeft = '4px solid var(--error-color)';
    
    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    messageText.textContent = text;
    
    const messageTime = document.createElement('div');
    messageTime.className = 'message-time';
    messageTime.textContent = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    content.appendChild(messageText);
    content.appendChild(messageTime);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    
    elements.chatMessages.appendChild(messageDiv);
    
    // Salvar no histórico
    messageHistory.push({
        sender,
        text,
        timestamp: new Date().toISOString(),
        isError
    });
    
    // Scroll para a última mensagem
    scrollToBottom();
    
    // Salvar no localStorage
    saveChatHistory();
}

function scrollToBottom() {
    setTimeout(() => {
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    }, 100);
}

function showTypingIndicator() {
    isTyping = true;
    elements.typingIndicator.style.display = 'flex';
    toggleSendButton();
    scrollToBottom();
}

function hideTypingIndicator() {
    isTyping = false;
    elements.typingIndicator.style.display = 'none';
    toggleSendButton();
}

function clearChat() {
    if (confirm('Tem certeza que deseja limpar todo o histórico do chat?')) {
        elements.chatMessages.innerHTML = '';
        messageHistory = [];
        localStorage.removeItem(`chat_history_${CONFIG.SESSION_ID}`);
        
        // Mostrar tela de boas-vindas novamente
        elements.chatInterface.style.display = 'none';
        elements.welcomeScreen.style.display = 'flex';
        
        // Gerar nova sessão
        CONFIG.SESSION_ID = generateSessionId();
        
        showNotification('Chat limpo com sucesso!', 'success');
    }
}

function exportChat() {
    if (messageHistory.length === 0) {
        showNotification('Não há mensagens para exportar.', 'warning');
        return;
    }
    
    const chatData = {
        sessionId: CONFIG.SESSION_ID,
        exportDate: new Date().toISOString(),
        messages: messageHistory
    };
    
    // Criar arquivo de texto formatado
    let textContent = `ENTREVISTA BIOGRÁFICA
`;
    textContent += `Data: ${new Date().toLocaleDateString('pt-BR')}
`;
    textContent += `Sessão: ${CONFIG.SESSION_ID}
`;
    textContent += `${'='.repeat(50)}

`;
    
    messageHistory.forEach((msg, index) => {
        const time = new Date(msg.timestamp).toLocaleTimeString('pt-BR');
        const sender = msg.sender === 'user' ? 'VOCÊ' : 'ENTREVISTADORA';
        textContent += `[${time}] ${sender}:
${msg.text}

`;
    });
    
    // Download do arquivo
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `entrevista_biografica_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Chat exportado com sucesso!', 'success');
}

// Sistema de tema
function initializeTheme() {
    document.body.setAttribute('data-theme', currentTheme);
    updateThemeToggle();
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
    updateThemeToggle();
    
    // Adicionar animação suave
    document.body.style.transition = 'all 0.3s ease';
    setTimeout(() => {
        document.body.style.transition = '';
    }, 300);
}

function updateThemeToggle() {
    if (elements.themeToggle) {
        const icon = elements.themeToggle.querySelector('i');
        if (icon) {
            icon.className = currentTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
        }
    }
}

// Atalhos de teclado
function handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + Enter para enviar mensagem
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
    }
    
    // Ctrl/Cmd + K para limpar chat
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        clearChat();
    }
    
    // Ctrl/Cmd + E para exportar
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        exportChat();
    }
    
    // Ctrl/Cmd + T para alternar tema
    if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        toggleTheme();
    }
}

// Efeitos visuais
function addHoverEffects() {
    // Adicionar efeitos de ripple aos botões
    const buttons = document.querySelectorAll('button, .btn');
    buttons.forEach(button => {
        button.addEventListener('click', createRippleEffect);
    });
}

function createRippleEffect(e) {
    const button = e.currentTarget;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple');
    
    button.appendChild(ripple);
    
    setTimeout(() => {
        ripple.remove();
    }, 600);
}

// Verificar conexão com a API
async function checkConnection() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/health`, {
            method: 'GET',
            timeout: 5000
        });
        
        if (response.ok) {
            updateConnectionStatus(true);
        } else {
            throw new Error('API não respondeu');
        }
    } catch (error) {
        updateConnectionStatus(false);
    }
}

function updateConnectionStatus(isConnected) {
    if (elements.connectionStatus) {
        elements.connectionStatus.className = `connection-status ${isConnected ? 'connected' : 'disconnected'}`;
        elements.connectionStatus.title = isConnected ? 'Conectado ao servidor' : 'Desconectado do servidor';
    }
}

function saveChatHistory() {
    try {
        localStorage.setItem(`chat_history_${CONFIG.SESSION_ID}`, JSON.stringify(messageHistory));
    } catch (error) {
        console.warn('Não foi possível salvar o histórico:', error);
    }
}

function loadChatHistory() {
    try {
        const saved = localStorage.getItem(`chat_history_${CONFIG.SESSION_ID}`);
        if (saved) {
            messageHistory = JSON.parse(saved);
            
            // Recriar mensagens na interface
            if (messageHistory.length > 0) {
                elements.welcomeScreen.style.display = 'none';
                elements.chatInterface.style.display = 'flex';
                
                messageHistory.forEach(msg => {
                    addMessageToDOM(msg.sender, msg.text, msg.isError);
                });
            }
        }
    } catch (error) {
        console.warn('Não foi possível carregar o histórico:', error);
        messageHistory = [];
    }
}

function addMessageToDOM(sender, text, isError = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    if (isError) content.style.borderLeft = '4px solid var(--error-color)';
    
    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    messageText.textContent = text;
    
    content.appendChild(messageText);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    
    elements.chatMessages.appendChild(messageDiv);
}

function showNotification(message, type = 'info') {
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--bg-card);
        color: var(--text-primary);
        padding: 1rem 1.5rem;
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-lg);
        border-left: 4px solid var(--${type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'primary'}-color);
        z-index: 1001;
        animation: slideInRight 0.3s ease;
        max-width: 300px;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remover após 3 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Adicionar estilos de animação para notificações
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Verificar conexão com a API ao carregar
window.addEventListener('load', async () => {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/`);
        if (response.ok) {
            console.log('✅ Conexão com API estabelecida');
        } else {
            throw new Error('API não respondeu corretamente');
        }
    } catch (error) {
        console.warn('⚠️ Não foi possível conectar com a API:', error);
        showNotification('Aviso: Não foi possível conectar com o servidor. Verifique se o backend está rodando.', 'warning');
    }
});

// Prevenir perda de dados ao fechar a página
window.addEventListener('beforeunload', (event) => {
    if (messageHistory.length > 0) {
        saveChatHistory();
    }
});

// Detectar se o usuário está offline
window.addEventListener('online', () => {
    showNotification('Conexão restaurada!', 'success');
});

window.addEventListener('offline', () => {
    showNotification('Você está offline. As mensagens serão enviadas quando a conexão for restaurada.', 'warning');
});

console.log('🎉 Chat Biográfico carregado e pronto para uso!');
