// ============================================
// DEVALL.APP - APLICACIÓN COMPLETA
// ============================================

class DevAllApp {
    constructor() {
        this.currentRepo = null;
        this.projectAnalysis = null;
        this.fileTree = [];
        this.openFiles = new Map();
        this.activeFile = null;
        this.chatHistory = [];
        this.contextManager = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.showWelcomeMessage();
        this.loadSavedRepo();
    }
    
    setupEventListeners() {
        // Chat input
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
            
            chatInput.addEventListener('input', (e) => {
                const count = e.target.value.length;
                const charCount = document.querySelector('.char-count');
                if (charCount) charCount.textContent = `${count}/2000`;
            });
        }
        
        // Repo input
        const repoInput = document.getElementById('repo-input');
        if (repoInput) {
            repoInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.loadRepository();
                }
            });
        }
        
        // Window resize
        window.addEventListener('resize', () => this.handleResize());
    }
    
    async loadRepository() {
        const repoInput = document.getElementById('repo-input');
        const repoValue = repoInput.value.trim();
        
        if (!repoValue.includes('/')) {
            this.showNotification('Please use format: owner/repository', 'error');
            return;
        }
        
        const [owner, repo] = repoValue.split('/');
        
        // Mostrar loading
        this.setLoadingState(true);
        
        try {
            const response = await fetch('/api/load-repo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ owner, repo })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Guardar datos
            this.currentRepo = data.repository;
            this.projectAnalysis = data.analysis;
            this.fileTree = data.structure;
            
            // Actualizar UI
            this.updateRepoInfo();
            this.renderFileTree();
            this.analyzeProject();
            
            // Guardar en localStorage
            localStorage.setItem('lastRepo', repoValue);
            
            this.showNotification('Repository loaded successfully!', 'success');
            
        } catch (error) {
            console.error('Error loading repository:', error);
            this.showNotification(`Failed to load repository: ${error.message}`, 'error');
        } finally {
            this.setLoadingState(false);
        }
    }
    
    updateRepoInfo() {
        if (!this.currentRepo) return;
        
        // Nombre del repo
        const repoName = document.getElementById('repo-name');
        if (repoName) {
            repoName.textContent = this.currentRepo.name;
        }
        
        // Descripción
        const repoDesc = document.getElementById('repo-description');
        if (repoDesc && this.currentRepo.description) {
            repoDesc.textContent = this.currentRepo.description;
            repoDesc.style.display = 'block';
        }
        
        // Stats
        const repoStats = document.getElementById('repo-stats');
        if (repoStats) {
            repoStats.innerHTML = `
                <div class="stat-item">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/>
                    </svg>
                    <span>${this.currentRepo.stargazers_count || 0}</span>
                </div>
                <div class="stat-item">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M5 3.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm0 2.122a2.25 2.25 0 10-1.5 0v.878A2.25 2.25 0 005.75 8.5h1.5v2.128a2.251 2.251 0 101.5 0V8.5h1.5a2.25 2.25 0 002.25-2.25v-.878a2.25 2.25 0 10-1.5 0v.878a.75.75 0 01-.75.75h-4.5A.75.75 0 015 6.25v-.878zm3.75 7.378a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm3-8.75a.75.75 0 100-1.5.75.75 0 000 1.5z"/>
                    </svg>
                    <span>${this.currentRepo.forks_count || 0}</span>
                </div>
                <div class="stat-item">
                    <span>${this.projectAnalysis?.language || 'Unknown'}</span>
                </div>
            `;
        }
        
        // Project info panel
        const projectInfo = document.getElementById('project-info');
        if (projectInfo && this.projectAnalysis) {
            projectInfo.innerHTML = `
                <div class="info-card">
                    <h3>Project Analysis</h3>
                    <div class="info-item">
                        <span class="label">Framework:</span>
                        <span class="value">${this.projectAnalysis.framework || 'None detected'}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Language:</span>
                        <span class="value">${this.projectAnalysis.language || 'Unknown'}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Total Files:</span>
                        <span class="value">${this.projectAnalysis.totalFiles || 0}</span>
                    </div>
                    ${this.projectAnalysis.patterns?.length > 0 ? `
                    <div class="info-item">
                        <span class="label">Patterns:</span>
                        <span class="value">${this.projectAnalysis.patterns.map(p => p.type).join(', ')}</span>
                    </div>
                    ` : ''}
                </div>
            `;
            projectInfo.style.display = 'block';
        }
    }
    
    renderFileTree() {
        if (!this.fileTree || !this.fileTree.tree) return;
        
        const treeContainer = document.getElementById('file-tree');
        if (!treeContainer) return;
        
        // Construir estructura de árbol
        const files = this.fileTree.tree.filter(item => item.type === 'blob');
        const treeStructure = this.buildTreeStructure(files);
        
        // Renderizar HTML
        treeContainer.innerHTML = this.renderTreeHTML(treeStructure);
        
        // Ocultar welcome screen
        const welcomeScreen = document.querySelector('.welcome-screen');
        if (welcomeScreen) {
            welcomeScreen.style.display = 'none';
        }
    }
    
    buildTreeStructure(files) {
        const tree = {};
        
        files.forEach(file => {
            const parts = file.path.split('/');
            let current = tree;
            
            parts.forEach((part, index) => {
                if (index === parts.length - 1) {
                    // Es un archivo
                    current[part] = {
                        type: 'file',
                        path: file.path,
                        name: part,
                        size: file.size
                    };
                } else {
                    // Es una carpeta
                    if (!current[part]) {
                        current[part] = {
                            type: 'folder',
                            name: part,
                            children: {},
                            expanded: false
                        };
                    }
                    current = current[part].children;
                }
            });
        });
        
        return tree;
    }
    
    renderTreeHTML(tree, level = 0) {
        let html = '';
        
        // Ordenar: carpetas primero, luego archivos
        const entries = Object.entries(tree).sort((a, b) => {
            if (a[1].type === 'folder' && b[1].type !== 'folder') return -1;
            if (a[1].type !== 'folder' && b[1].type === 'folder') return 1;
            return a[0].localeCompare(b[0]);
        });
        
        entries.forEach(([name, node]) => {
            if (node.type === 'folder') {
                const folderId = `folder_${name}_${level}_${Math.random().toString(36).substr(2, 9)}`;
                html += `
                    <div class="tree-item-container">
                        <div class="tree-folder" 
                             onclick="app.toggleFolder('${folderId}')" 
                             style="padding-left: ${level * 20}px"
                             data-folder-id="${folderId}">
                            <svg class="folder-arrow" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                                <path d="M4.5 3L7.5 6L4.5 9"/>
                            </svg>
                            <svg class="folder-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M1.75 1A1.75 1.75 0 000 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0016 13.25v-8.5A1.75 1.75 0 0014.25 3h-6.5a.25.25 0 01-.2-.1l-.9-1.2C6.07 1.12 5.85 1 5.62 1H1.75z"/>
                            </svg>
                            <span class="folder-name">${name}</span>
                        </div>
                        <div id="${folderId}" class="folder-children" style="display: none;">
                            ${this.renderTreeHTML(node.children, level + 1)}
                        </div>
                    </div>
                `;
            } else {
                const fileIcon = this.getFileIcon(name);
                const isActive = this.activeFile === node.path;
                html += `
                    <div class="tree-file ${isActive ? 'active' : ''}" 
                         onclick="app.loadFile('${node.path}')" 
                         style="padding-left: ${(level + 1) * 20}px"
                         data-file-path="${node.path}">
                        ${fileIcon}
                        <span class="file-name">${name}</span>
                    </div>
                `;
            }
        });
        
        return html;
    }
    
    toggleFolder(folderId) {
        const folderChildren = document.getElementById(folderId);
        const folderElement = document.querySelector(`[data-folder-id="${folderId}"]`);
        
        if (!folderChildren || !folderElement) return;
        
        const arrow = folderElement.querySelector('.folder-arrow');
        
        if (folderChildren.style.display === 'none' || !folderChildren.style.display) {
            folderChildren.style.display = 'block';
            folderElement.classList.add('expanded');
            if (arrow) arrow.style.transform = 'rotate(90deg)';
        } else {
            folderChildren.style.display = 'none';
            folderElement.classList.remove('expanded');
            if (arrow) arrow.style.transform = 'rotate(0deg)';
        }
    }
    
    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            js: '<svg width="16" height="16" viewBox="0 0 16 16" fill="#f1e05a"><rect width="16" height="16" rx="3" fill="#f1e05a"/><path d="M10.5 10.5c0 .5-.4 1-1 1s-1-.5-1-1v-2h1v2h1v-4h-2v3c0 1-.8 2-2 2s-2-1-2-2" fill="#000"/></svg>',
            jsx: '<svg width="16" height="16" viewBox="0 0 16 16" fill="#61dafb"><rect width="16" height="16" rx="3" fill="#20232a"/><path d="M8 6.5c1.5 0 2.5.3 2.5 1s-1 1-2.5 1-2.5-.3-2.5-1 1-1 2.5-1" stroke="#61dafb" fill="none"/></svg>',
            ts: '<svg width="16" height="16" viewBox="0 0 16 16" fill="#3178c6"><rect width="16" height="16" rx="3" fill="#3178c6"/><path d="M9.5 8v3h1v-3h1.5v-1h-4v1h1.5zM4 7h3v1h-2v1h2v2h-3v-1h2v-1h-2v-2z" fill="#fff"/></svg>',
            tsx: '<svg width="16" height="16" viewBox="0 0 16 16" fill="#3178c6"><rect width="16" height="16" rx="3" fill="#20232a"/><path d="M8 6.5c1.5 0 2.5.3 2.5 1s-1 1-2.5 1-2.5-.3-2.5-1 1-1 2.5-1" stroke="#61dafb" fill="none"/></svg>',
            json: '<svg width="16" height="16" viewBox="0 0 16 16" fill="#cbcb41"><rect width="16" height="16" rx="3" fill="#1e1e1e"/><path d="M4 4h2v2h-2zM10 4h2v2h-2zM4 10h2v2h-2zM10 10h2v2h-2zM7 7h2v2h-2z" fill="#cbcb41"/></svg>',
            html: '<svg width="16" height="16" viewBox="0 0 16 16" fill="#e34c26"><rect width="16" height="16" rx="3" fill="#e34c26"/><path d="M4 4l.5 7L8 12l3.5-1L12 4H4zm4 3h2l-.2 2.5L8 10l-1.8-.5L6 7h2z" fill="#fff"/></svg>',
            css: '<svg width="16" height="16" viewBox="0 0 16 16" fill="#1572b6"><rect width="16" height="16" rx="3" fill="#1572b6"/><path d="M4 4l.5 7L8 12l3.5-1L12 4H4zm4 3h2l-.2 2.5L8 10l-1.8-.5L6 7h2z" fill="#fff"/></svg>',
            scss: '<svg width="16" height="16" viewBox="0 0 16 16" fill="#cf649a"><rect width="16" height="16" rx="3" fill="#cf649a"/><path d="M8 5c2 0 3 1 3 2s-1 2-3 2-3-1-3-2 1-2 3-2z" fill="#fff"/></svg>',
            md: '<svg width="16" height="16" viewBox="0 0 16 16" fill="#083fa1"><rect width="16" height="16" rx="3" fill="#000"/><path d="M3 5v6h2v-4l2 2.5L9 7v4h2V5h-2L7 8 5 5H3z" fill="#fff"/></svg>',
            yml: '<svg width="16" height="16" viewBox="0 0 16 16" fill="#cb171e"><rect width="16" height="16" rx="3" fill="#cb171e"/><path d="M4 5l2 3v3h2v-3l2-3h-2l-1 2-1-2H4z" fill="#fff"/></svg>',
            yaml: '<svg width="16" height="16" viewBox="0 0 16 16" fill="#cb171e"><rect width="16" height="16" rx="3" fill="#cb171e"/><path d="M4 5l2 3v3h2v-3l2-3h-2l-1 2-1-2H4z" fill="#fff"/></svg>',
            env: '<svg width="16" height="16" viewBox="0 0 16 16" fill="#000"><rect width="16" height="16" rx="3" fill="#32CD32"/><path d="M4 5h8v1H4zm0 2h8v1H4zm0 2h5v1H4z" fill="#000"/></svg>',
            gitignore: '<svg width="16" height="16" viewBox="0 0 16 16" fill="#f05032"><rect width="16" height="16" rx="3" fill="#f05032"/><path d="M8 4L4 8l4 4 4-4-4-4zm0 2l2 2-2 2-2-2 2-2z" fill="#fff"/></svg>'
        };
        
        return icons[ext] || '<svg width="16" height="16" viewBox="0 0 16 16" fill="#6a737d"><path d="M2 1.75C2 .784 2.784 0 3.75 0h5.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v8.586A1.75 1.75 0 0112.25 15h-8.5A1.75 1.75 0 012 13.25V1.75z"/></svg>';
    }
    
    async loadFile(filePath) {
        if (!filePath) return;
        
        this.activeFile = filePath;
        
        // Actualizar UI para mostrar archivo activo
        document.querySelectorAll('.tree-file').forEach(el => {
            el.classList.remove('active');
            if (el.dataset.filePath === filePath) {
                el.classList.add('active');
            }
        });
        
        // Mostrar loading en editor
        const codeDisplay = document.getElementById('code-display');
        if (codeDisplay) {
            codeDisplay.innerHTML = '<div class="loading-editor">Loading file...</div>';
        }
        
        try {
            const response = await fetch('/api/get-file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: filePath })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Guardar en cache
            this.openFiles.set(filePath, data.content);
            
            // Mostrar código
            this.displayCode(data.content, filePath);
            
            // Actualizar tab
            const currentFileTab = document.getElementById('current-file');
            if (currentFileTab) {
                currentFileTab.textContent = filePath.split('/').pop();
            }
            
        } catch (error) {
            console.error('Error loading file:', error);
            this.showNotification(`Failed to load file: ${error.message}`, 'error');
            if (codeDisplay) {
                codeDisplay.innerHTML = `<div class="error-message">Failed to load file: ${error.message}</div>`;
            }
        }
    }
    
    displayCode(content, filename) {
        const codeDisplay = document.getElementById('code-display');
        if (!codeDisplay) return;
        
        const lines = content.split('\n');
        const ext = filename.split('.').pop().toLowerCase();
        
        let html = '<div class="code-wrapper"><table class="code-table"><tbody>';
        
        lines.forEach((line, index) => {
            const lineNumber = index + 1;
            const highlightedLine = this.highlightSyntax(line, ext);
            html += `
                <tr class="code-line">
                    <td class="line-number" data-line-number="${lineNumber}">${lineNumber}</td>
                    <td class="line-content"><pre>${highlightedLine}</pre></td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
        codeDisplay.innerHTML = html;
    }
    
    highlightSyntax(line, extension) {
        // Escapar HTML primero
        let highlighted = this.escapeHtml(line);
        
        if (['js', 'jsx', 'ts', 'tsx'].includes(extension)) {
            // Keywords
            const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'class', 'extends', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'new', 'this', 'super', 'typeof', 'instanceof', 'in', 'of', 'delete', 'void'];
            const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
            highlighted = highlighted.replace(keywordRegex, '<span class="keyword">$1</span>');
            
            // Strings
            highlighted = highlighted.replace(/(['"`])([^'"`]*)(['"`])/g, '<span class="string">$1$2$3</span>');
            
            // Comments
            highlighted = highlighted.replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>');
            
            // Numbers
            highlighted = highlighted.replace(/\b(\d+)\b/g, '<span class="number">$1</span>');
            
            // Functions
            highlighted = highlighted.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g, '<span class="function">$1</span>(');
        }
        
        return highlighted;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    async analyzeProject() {
        if (!this.currentRepo || !this.projectAnalysis) return;
        
        // Mensaje inicial de análisis
        this.addChatMessage('System', `Analyzing ${this.currentRepo.name} project...`, 'system');
        
        setTimeout(() => {
            const analysisMessage = `
Project Analysis Complete for **${this.currentRepo.name}**

**Framework:** ${this.projectAnalysis.framework || 'Vanilla JavaScript'}
**Language:** ${this.projectAnalysis.language}
**Total Files:** ${this.projectAnalysis.totalFiles}
${this.projectAnalysis.patterns?.length > 0 ? `\n**Patterns Detected:** ${this.projectAnalysis.patterns.map(p => p.type).join(', ')}` : ''}

I'm ready to help you:
- Understand complex code sections
- Identify and fix bugs
- Improve code quality and performance
- Add new features
- Write documentation
- Create tests

What would you like to work on?
            `.trim();
            
            this.addChatMessage('devall.ai', analysisMessage, 'assistant');
            
            // Sugerencias proactivas basadas en el análisis
            if (this.projectAnalysis.totalFiles > 50) {
                this.addQuickSuggestion("This is a large project. Would you like me to create an architecture overview?");
            }
            
            if (!this.projectAnalysis.framework) {
                this.addQuickSuggestion("I notice you're not using a framework. Would you like suggestions for modernizing your stack?");
            }
        }, 1500);
    }
    
    addQuickSuggestion(text) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;
        
        const suggestionEl = document.createElement('div');
        suggestionEl.className = 'quick-suggestion';
        suggestionEl.innerHTML = `
            <div class="suggestion-content">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 1.5a6.5 6.5 0 106.016 4.035.75.75 0 011.388-.57 8 8 0 11-2.275-3.923.75.75 0 01.826 1.253A6.5 6.5 0 008 1.5z"/>
                    <path d="M8 4a.75.75 0 01.75.75v3.5h3.5a.75.75 0 010 1.5h-4.25A.75.75 0 017.25 9V4.75A.75.75 0 018 4z"/>
                </svg>
                <span>${text}</span>
                <button onclick="app.acceptSuggestion('${text.replace(/'/g, "\\'")}')" class="suggestion-btn">Yes, please</button>
                <button onclick="this.parentElement.parentElement.remove()" class="suggestion-btn secondary">Not now</button>
            </div>
        `;
        messagesContainer.appendChild(suggestionEl);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    acceptSuggestion(text) {
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.value = text;
            this.sendMessage();
        }
        
        // Remover la sugerencia
        document.querySelectorAll('.quick-suggestion').forEach(el => {
            if (el.textContent.includes(text.substring(0, 20))) {
                el.remove();
            }
        });
    }
    
    async sendMessage() {
        const chatInput = document.getElementById('chat-input');
        if (!chatInput) return;
        
        const message = chatInput.value.trim();
        if (!message) return;
        
        // Limpiar input
        chatInput.value = '';
        document.querySelector('.char-count').textContent = '0/2000';
        
        // Agregar mensaje del usuario
        this.addChatMessage('You', message, 'user');
        
        // Mostrar typing indicator
        const typingId = this.showTypingIndicator();
        
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message,
                    context: {
                        activeFile: this.activeFile,
                        repository: this.currentRepo?.name,
                        framework: this.projectAnalysis?.framework
                    }
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Remover typing indicator
            this.removeTypingIndicator(typingId);
            
            // Agregar respuesta
            this.addChatMessage('devall.ai', data.response || data.error || 'No response received', 'assistant');
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.removeTypingIndicator(typingId);
            this.addChatMessage('System', `Error: ${error.message}`, 'error');
        }
    }
    
    addChatMessage(sender, content, type = 'user') {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;
        
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        
        // Formatear el contenido con markdown básico
        let formattedContent = content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`\n]+)`/g, '<code>$1</code>')
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/^• (.+)$/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
            .replace(/\n/g, '<br>');
        
        const timestamp = new Date().toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageEl.innerHTML = `
            <div class="message-header">
                <span class="message-sender">${sender}</span>
                <span class="message-time">${timestamp}</span>
            </div>
            <div class="message-content">${formattedContent}</div>
        `;
        
        messagesContainer.appendChild(messageEl);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Guardar en historial
        this.chatHistory.push({
            sender,
            content,
            type,
            timestamp: new Date()
        });
    }
    
    showTypingIndicator() {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return null;
        
        const typingId = `typing-${Date.now()}`;
        const typingEl = document.createElement('div');
        typingEl.id = typingId;
        typingEl.className = 'typing-indicator';
        typingEl.innerHTML = `
            <span></span>
            <span></span>
            <span></span>
        `;
        
        messagesContainer.appendChild(typingEl);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        return typingId;
    }
    
    removeTypingIndicator(typingId) {
        if (!typingId) return;
        const typingEl = document.getElementById(typingId);
        if (typingEl) {
            typingEl.remove();
        }
    }
    
    showNotification(message, type = 'info') {
        const notificationsContainer = document.getElementById('notifications') || document.body;
        
        const notificationEl = document.createElement('div');
        notificationEl.className = `notification ${type}`;
        notificationEl.innerHTML = `
            <div class="notification-content">
                ${this.getNotificationIcon(type)}
                <span>${message}</span>
            </div>
        `;
        
        notificationsContainer.appendChild(notificationEl);
        
        // Trigger animation
        setTimeout(() => {
            notificationEl.classList.add('show');
        }, 10);
        
        // Auto remove after 4 seconds
        setTimeout(() => {
            notificationEl.classList.remove('show');
            setTimeout(() => {
                notificationEl.remove();
            }, 300);
        }, 4000);
    }
    
    getNotificationIcon(type) {
        const icons = {
            success: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 110 16A8 8 0 018 0zm3.78 5.22a.75.75 0 00-1.06 0L7 8.94 5.28 7.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.06 0l4.25-4.25a.75.75 0 000-1.06z"/></svg>',
            error: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 110 16A8 8 0 018 0zM5.47 5.47a.75.75 0 011.06 0L8 6.94l1.47-1.47a.75.75 0 111.06 1.06L9.06 8l1.47 1.47a.75.75 0 11-1.06 1.06L8 9.06l-1.47 1.47a.75.75 0 01-1.06-1.06L6.94 8 5.47 6.53a.75.75 0 010-1.06z"/></svg>',
            warning: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 110 16A8 8 0 018 0zm0 10.5a.75.75 0 100 1.5.75.75 0 000-1.5zm0-7a.75.75 0 00-.75.75v4.5a.75.75 0 001.5 0v-4.5A.75.75 0 008 3.5z"/></svg>',
            info: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 110 16A8 8 0 018 0zm0 10.5a.75.75 0 00-.75.75v.5a.75.75 0 001.5 0v-.5A.75.75 0 008 10.5zm0-7a.75.75 0 00-.75.75v4.5a.75.75 0 001.5 0v-4.5A.75.75 0 008 3.5z"/></svg>'
        };
        return icons[type] || icons.info;
    }
    
    setLoadingState(loading) {
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = loading ? 'flex' : 'none';
        }
        
        const loadButton = document.querySelector('.btn-primary');
        if (loadButton) {
            loadButton.disabled = loading;
            loadButton.textContent = loading ? 'Loading...' : 'Load';
        }
    }
    
    showWelcomeMessage() {
        this.addChatMessage(
            'devall.ai',
            'Welcome to devall.app! I\'m your AI-powered coding assistant. Load a GitHub repository to get started, and I\'ll help you understand, improve, and build upon your code.',
            'assistant'
        );
    }
    
    loadSavedRepo() {
        const lastRepo = localStorage.getItem('lastRepo');
        if (lastRepo) {
            const repoInput = document.getElementById('repo-input');
            if (repoInput) {
                repoInput.value = lastRepo;
            }
        }
    }
    
    handleResize() {
        // Ajustar layout en móviles
        if (window.innerWidth < 768) {
            document.body.classList.add('mobile');
        } else {
            document.body.classList.remove('mobile');
        }
    }
}

// Quick action functions globales
window.askExplain = function() {
    const message = "Can you explain the code in the current file? Break down the main components and their purposes.";
    document.getElementById('chat-input').value = message;
    app.sendMessage();
};

window.askImprove = function() {
    const message = "How can I improve the code in this file? Suggest optimizations and best practices.";
    document.getElementById('chat-input').value = message;
    app.sendMessage();
};

window.askDebug = function() {
    const message = "Can you help me debug this code? Are there any potential issues or bugs?";
    document.getElementById('chat-input').value = message;
    app.sendMessage();
};

window.askTest = function() {
    const message = "Can you help me write comprehensive tests for this code?";
    document.getElementById('chat-input').value = message;
    app.sendMessage();
};

window.toggleTheme = function() {
    document.body.classList.toggle('light-theme');
    localStorage.setItem('theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
};

window.toggleSidebar = function() {
    document.getElementById('sidebar').classList.toggle('show');
};

window.formatCode = function() {
    app.showNotification('Code formatting will be available soon!', 'info');
};

window.copyCode = function() {
    const codeContent = document.querySelector('.code-content');
    if (codeContent) {
        const text = codeContent.textContent;
        navigator.clipboard.writeText(text).then(() => {
            app.showNotification('Code copied to clipboard!', 'success');
        });
    }
};

window.collapseAll = function() {
    document.querySelectorAll('.folder-children').forEach(el => {
        el.style.display = 'none';
    });
    document.querySelectorAll('.tree-folder').forEach(el => {
        el.classList.remove('expanded');
    });
    document.querySelectorAll('.folder-arrow').forEach(el => {
        el.style.transform = 'rotate(0deg)';
    });
};

window.loadRepository = function() {
    app.loadRepository();
};

window.sendMessage = function() {
    app.sendMessage();
};

// Inicializar aplicación
const app = new DevAllApp();

// Hacer app global para las funciones onclick
window.app = app;
