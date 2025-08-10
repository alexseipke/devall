// ============================================================================
// SISTEMA DE CONTEXTO INTELIGENTE COMPLETO
// context-manager.js
// ============================================================================

const { Octokit } = require('@octokit/rest');

class IntelligentContextManager {
    constructor() {
        this.projectContext = {
            // Metadatos del proyecto
            metadata: {
                name: null,
                language: null,
                framework: null,
                dependencies: [],
                version: null,
                description: null
            },

            // Estructura del proyecto
            structure: {
                tree: [],           // Árbol de archivos
                modules: {},        // Módulos/componentes identificados
                entryPoints: [],    // Puntos de entrada (main, index, etc)
                routes: [],         // Rutas de API o páginas
                databases: {},      // Esquemas de DB detectados
                configs: {}         // Archivos de configuración
            },
// Estructura del proyecto
        structure: {
            tree: [],           // Árbol de archivos
            modules: {},        // Módulos/componentes identificados
            entryPoints: [],    // Puntos de entrada (main, index, etc)
            routes: [],         // Rutas de API o páginas
            databases: {},      // Esquemas de DB detectados
            configs: {}         // Archivos de configuración
        },

        // Análisis de código
        analysis: {
            patterns: [],       // Patrones arquitectónicos detectados
            dependencies: {},   // Grafo de dependencias
            complexity: {},     // Complejidad ciclomática por archivo
            quality: {},        // Métricas de calidad
            smells: [],        // Code smells detectados
            security: []       // Vulnerabilidades potenciales
        },

        // Contenido indexado
        content: {
            files: {},         // Contenido completo de archivos
            functions: {},     // Funciones indexadas
            classes: {},       // Clases indexadas
            variables: {},     // Variables globales importantes
            comments: {},      // Comentarios importantes/TODOs
            tests: {}         // Tests identificados
        },

        // Memoria y aprendizaje
        memory: {
            conversations: [], // Historial de conversaciones
            modifications: [], // Cambios realizados
            decisions: [],     // Decisiones arquitectónicas
            preferences: {},   // Preferencias del desarrollador
            patterns: {}      // Patrones de código del usuario
        },

        // Contexto dinámico
        dynamic: {
            recentFiles: [],   // Archivos recientes
            hotspots: [],      // Áreas con más cambios
            currentFocus: null, // Foco actual del desarrollo
            workingSet: []     // Conjunto de trabajo actual
        }
    };

    this.contextCache = new Map();
    this.compressionStrategies = new Map();
    this.relevanceScores = new Map();
}

// Método auxiliar para cargar archivos (será proporcionado por el caller)
async loadFile(path) {
    // Este método será sobrescrito por el servidor
    return '';
}

// ========================================================================
// ANÁLISIS INICIAL DEL PROYECTO
// ========================================================================

async analyzeProject(repository) {
    console.log('🔍 Starting deep project analysis...');

    // 1. Detectar tipo de proyecto
    await this.detectProjectType(repository);

    // 2. Analizar estructura
    await this.analyzeStructure(repository);

    // 3. Construir grafo de dependencias
    await this.buildDependencyGraph();

    // 4. Analizar patrones arquitectónicos
    await this.detectArchitecturalPatterns();

    // 5. Indexar contenido importante
    await this.indexImportantContent();

    // 6. Calcular métricas de calidad
    await this.calculateQualityMetrics();

    return this.projectContext;
}

async detectProjectType(repository) {
    const files = repository.tree.tree.map(f => f.path);

    // Detectar framework/tecnología principal
    if (files.includes('package.json')) {
        const packageJson = await this.loadFile('package.json');
        try {
            const pkg = JSON.parse(packageJson);

            this.projectContext.metadata.dependencies = Object.keys(pkg.dependencies || {});

            // Detectar framework
            if (pkg.dependencies?.react) this.projectContext.metadata.framework = 'React';
            else if (pkg.dependencies?.vue) this.projectContext.metadata.framework = 'Vue';
            else if (pkg.dependencies?.angular) this.projectContext.metadata.framework = 'Angular';
            else if (pkg.dependencies?.express) this.projectContext.metadata.framework = 'Express';
            else if (pkg.dependencies?.next) this.projectContext.metadata.framework = 'Next.js';

            this.projectContext.metadata.name = pkg.name;
            this.projectContext.metadata.version = pkg.version;
            this.projectContext.metadata.description = pkg.description;
        } catch (e) {
            console.error('Error parsing package.json:', e);
        }
    }

    // Detectar lenguaje principal
    const extensions = files.map(f => f.split('.').pop());
    const langCount = {};
    extensions.forEach(ext => langCount[ext] = (langCount[ext] || 0) + 1);

    const sorted = Object.entries(langCount).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
        this.projectContext.metadata.language = sorted[0][0];
    }
}

async analyzeStructure(repository) {
    const tree = repository.tree.tree;

    // Identificar estructura de carpetas
    const folders = tree.filter(item => item.type === 'tree');
    const files = tree.filter(item => item.type === 'blob');

    // Detectar módulos/componentes
    const componentPaths = files.filter(f =>
        f.path.includes('components/') ||
        f.path.includes('modules/') ||
        f.path.includes('features/')
    );

    for (const comp of componentPaths) {
        const name = comp.path.split('/').pop().replace(/\.[^/.]+$/, '');
        this.projectContext.structure.modules[name] = {
            path: comp.path,
            type: this.detectModuleType(comp.path),
            dependencies: []
        };
    }

    // Detectar entry points
    this.projectContext.structure.entryPoints = files
        .filter(f =>
            f.path.includes('index.') ||
            f.path.includes('main.') ||
            f.path.includes('app.') ||
            f.path.includes('server.')
        )
        .map(f => f.path);

    // Detectar rutas
    const routeFiles = files.filter(f =>
        f.path.includes('routes/') ||
        f.path.includes('api/') ||
        f.path.includes('pages/')
    );

    for (const routeFile of routeFiles) {
        const content = await this.loadFile(routeFile.path);
        const routes = this.extractRoutes(content);
        this.projectContext.structure.routes.push(...routes);
    }

    // Detectar configuraciones
    const configFiles = files.filter(f =>
        f.path.includes('config') ||
        f.path.endsWith('.config.js') ||
        f.path.endsWith('.json')
    );

    for (const config of configFiles) {
        this.projectContext.structure.configs[config.path] = {
            path: config.path,
            type: this.detectConfigType(config.path)
        };
    }
}

async buildDependencyGraph() {
    const files = Object.keys(this.projectContext.content.files);
    const graph = {};

    for (const file of files) {
        if (!file.endsWith('.js') && !file.endsWith('.ts') &&
            !file.endsWith('.jsx') && !file.endsWith('.tsx')) continue;

        const content = this.projectContext.content.files[file];
        const dependencies = this.extractDependencies(content);

        graph[file] = {
            imports: dependencies.imports,
            exports: dependencies.exports,
            dependents: [],
            complexity: this.calculateComplexity(content)
        };
    }

    // Calcular dependientes
    for (const [file, deps] of Object.entries(graph)) {
        for (const imp of deps.imports) {
            if (graph[imp]) {
                graph[imp].dependents.push(file);
            }
        }
    }

    this.projectContext.analysis.dependencies = graph;
}

extractDependencies(content) {
    const imports = [];
    const exports = [];

    // Extraer imports
    const importRegex = /import\s+(?:(?:\{[^}]*\})|(?:\w+)|(?:\*\s+as\s+\w+))\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[1]);
    }

    // Extraer requires
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
        imports.push(match[1]);
    }

    // Extraer exports
    const exportRegex = /export\s+(?:default\s+)?(?:const|let|var|function|class)\s+(\w+)/g;
    while ((match = exportRegex.exec(content)) !== null) {
        exports.push(match[1]);
    }

    return { imports, exports };
}

async detectArchitecturalPatterns() {
    const patterns = [];

    // Detectar MVC
    if (this.projectContext.structure.modules.controller ||
        this.projectContext.structure.modules.model ||
        this.projectContext.structure.modules.view) {
        patterns.push({
            type: 'MVC',
            confidence: 0.8,
            evidence: ['Folders structure suggests MVC pattern']
        });
    }

    // Detectar Microservicios
    if (this.projectContext.structure.modules.services &&
        Object.keys(this.projectContext.structure.modules.services).length > 3) {
        patterns.push({
            type: 'Microservices',
            confidence: 0.7,
            evidence: ['Multiple service modules detected']
        });
    }

    // Detectar Component-Based
    if (this.projectContext.metadata.framework === 'React' ||
        this.projectContext.metadata.framework === 'Vue') {
        patterns.push({
            type: 'Component-Based',
            confidence: 0.9,
            evidence: [`${this.projectContext.metadata.framework} framework`]
        });
    }

    // Detectar API REST
    if (this.projectContext.structure.routes.some(r => r.includes('GET') || r.includes('POST'))) {
        patterns.push({
            type: 'RESTful API',
            confidence: 0.85,
            evidence: ['HTTP methods in routes']
        });
    }

    this.projectContext.analysis.patterns = patterns;
}

async indexImportantContent() {
    const files = Object.entries(this.projectContext.content.files);

    for (const [path, content] of files) {
        // Indexar funciones
        const functions = this.extractFunctions(content);
        for (const func of functions) {
            this.projectContext.content.functions[`${path}:${func.name}`] = {
                name: func.name,
                path: path,
                params: func.params,
                body: func.body,
                complexity: this.calculateComplexity(func.body),
                calls: this.extractFunctionCalls(func.body)
            };
        }

        // Indexar clases
        const classes = this.extractClasses(content);
        for (const cls of classes) {
            this.projectContext.content.classes[`${path}:${cls.name}`] = {
                name: cls.name,
                path: path,
                methods: cls.methods,
                properties: cls.properties,
                extends: cls.extends
            };
        }

        // Indexar comentarios importantes
        const comments = this.extractImportantComments(content);
        if (comments.length > 0) {
            this.projectContext.content.comments[path] = comments;
        }

        // Indexar tests
        if (path.includes('test') || path.includes('spec')) {
            const tests = this.extractTests(content);
            this.projectContext.content.tests[path] = tests;
        }
    }
}

extractFunctions(content) {
    const functions = [];

    // Funciones normales
    const funcRegex = /function\s+(\w+)\s*\(([^)]*)\)\s*\{/g;
    let match;
    while ((match = funcRegex.exec(content)) !== null) {
        const startIndex = match.index;
        const body = this.extractFunctionBody(content, startIndex);
        functions.push({
            name: match[1],
            params: match[2].split(',').map(p => p.trim()),
            body: body
        });
    }

    // Arrow functions
    const arrowRegex = /(?:const|let|var)\s+(\w+)\s*=\s*(?:\([^)]*\)|[^=])\s*=>/g;
    while ((match = arrowRegex.exec(content)) !== null) {
        functions.push({
            name: match[1],
            params: [],
            body: ''
        });
    }

    // Métodos de clase
    const methodRegex = /(\w+)\s*\([^)]*\)\s*\{/g;
    while ((match = methodRegex.exec(content)) !== null) {
        if (!['if', 'for', 'while', 'switch', 'catch', 'function'].includes(match[1])) {
            functions.push({
                name: match[1],
                params: [],
                body: ''
            });
        }
    }

    return functions;
}

extractFunctionBody(content, startIndex) {
    let braceCount = 0;
    let inBody = false;
    let body = '';

    for (let i = startIndex; i < content.length; i++) {
        if (content[i] === '{') {
            braceCount++;
            inBody = true;
        } else if (content[i] === '}') {
            braceCount--;
            if (braceCount === 0 && inBody) {
                return body;
            }
        }

        if (inBody) {
            body += content[i];
        }
    }

    return body;
}

extractClasses(content) {
    const classes = [];
    const classRegex = /class\s+(\w+)(?:\s+extends\s+(\w+))?\s*\{/g;
    let match;

    while ((match = classRegex.exec(content)) !== null) {
        const className = match[1];
        const extendsClass = match[2];
        const classBody = this.extractFunctionBody(content, match.index);

        classes.push({
            name: className,
            extends: extendsClass,
            methods: this.extractClassMethods(classBody),
            properties: this.extractClassProperties(classBody)
        });
    }

    return classes;
}

extractClassMethods(classBody) {
    const methods = [];
    const methodRegex = /(\w+)\s*\([^)]*\)\s*\{/g;
    let match;

    while ((match = methodRegex.exec(classBody)) !== null) {
        methods.push(match[1]);
    }

    return methods;
}

extractClassProperties(classBody) {
    const properties = [];
    const propRegex = /this\.(\w+)\s*=/g;
    let match;

    while ((match = propRegex.exec(classBody)) !== null) {
        if (!properties.includes(match[1])) {
            properties.push(match[1]);
        }
    }

    return properties;
}

extractImportantComments(content) {
    const comments = [];

    // TODO comments
    const todoRegex = /\/\/\s*TODO:?\s*(.+)$/gm;
    let match;
    while ((match = todoRegex.exec(content)) !== null) {
        comments.push({ type: 'TODO', text: match[1] });
    }

    // FIXME comments
    const fixmeRegex = /\/\/\s*FIXME:?\s*(.+)$/gm;
    while ((match = fixmeRegex.exec(content)) !== null) {
        comments.push({ type: 'FIXME', text: match[1] });
    }

    // NOTE comments
    const noteRegex = /\/\/\s*NOTE:?\s*(.+)$/gm;
    while ((match = noteRegex.exec(content)) !== null) {
        comments.push({ type: 'NOTE', text: match[1] });
    }

    // JSDoc comments
    const jsdocRegex = /\/\*\*[\s\S]*?\*\//g;
    while ((match = jsdocRegex.exec(content)) !== null) {
        comments.push({ type: 'JSDoc', text: match[0] });
    }

    return comments;
}

extractTests(content) {
    const tests = [];

    // Jest/Mocha style tests
    const testRegex = /(?:test|it|describe)\s*\(['"]([^'"]+)['"]/g;
    let match;
    while ((match = testRegex.exec(content)) !== null) {
        tests.push({
            name: match[1],
            type: 'unit'
        });
    }

    return tests;
}

calculateComplexity(code) {
    let complexity = 1;
    if (!code || typeof code !== 'string') return complexity;

    try {
        // Palabras clave que aumentan complejidad
        const keywords = ['if', 'else', 'for', 'while', 'case', 'catch'];
        for (const keyword of keywords) {
            // CORRECCIÓN: Usar doble escape para que llegue correctamente a RegExp
            const regex = new RegExp('\\b' + keyword + '\\b', 'g');
            const matches = code.match(regex);
            if (matches) complexity += matches.length;
        }

        // Operadores lógicos
        const operators = code.match(/&&|\|\|/g);
        if (operators) complexity += operators.length;

        // Operador ternario
        const ternary = code.match(/\?/g);
        if (ternary) complexity += ternary.length;
    } catch (error) {
        console.error('Error in calculateComplexity:', error.message);
        return 1;
    }

    return complexity;
}

async calculateQualityMetrics() {
    const metrics = {
        totalFiles: Object.keys(this.projectContext.content.files).length,
        totalFunctions: Object.keys(this.projectContext.content.functions).length,
        totalClasses: Object.keys(this.projectContext.content.classes).length,
        avgComplexity: 0,
        codeSmells: [],
        coverage: 0
    };

    // Calcular complejidad promedio
    const complexities = Object.values(this.projectContext.content.functions)
        .map(f => f.complexity);
    if (complexities.length > 0) {
        metrics.avgComplexity = complexities.reduce((a, b) => a + b, 0) / complexities.length;
    }

    // Detectar code smells
    for (const [path, funcs] of Object.entries(this.projectContext.content.functions)) {
        // Funciones muy largas
        if (funcs.body && funcs.body.length > 500) {
            metrics.codeSmells.push({
                type: 'Long Function',
                location: path,
                severity: 'medium'
            });
        }

        // Alta complejidad
        if (funcs.complexity > 10) {
            metrics.codeSmells.push({
                type: 'High Complexity',
                location: path,
                severity: 'high',
                complexity: funcs.complexity
            });
        }
    }

    // Calcular cobertura de tests
    const testCount = Object.keys(this.projectContext.content.tests).length;
    const funcCount = Object.keys(this.projectContext.content.functions).length;
    if (funcCount > 0) {
        metrics.coverage = (testCount / funcCount) * 100;
    }

    this.projectContext.analysis.quality = metrics;
}

// ========================================================================
// CONSTRUCCIÓN DE CONTEXTO INTELIGENTE
// ========================================================================

async buildContext(query, options = {}) {
    const {
        maxTokens = 100000,
        includeAnalysis = true,
        includeMemory = true,
        focusArea = null
    } = options;

    console.log('🧠 Building intelligent context for query:', query);

    // 1. Analizar la query para entender la intención
    const intent = this.analyzeQueryIntent(query);

    // 2. Calcular relevancia de cada parte del proyecto
    const relevanceMap = this.calculateRelevance(query, intent);

    // 3. Seleccionar contenido más relevante
    const selectedContent = this.selectRelevantContent(relevanceMap, maxTokens);

    // 4. Construir contexto estructurado
    const context = this.structureContext(selectedContent, intent);

    // 5. Agregar análisis si es necesario
    if (includeAnalysis) {
        context.analysis = this.getRelevantAnalysis(intent);
    }

    // 6. Agregar memoria relevante
    if (includeMemory) {
        context.memory = this.getRelevantMemory(query);
    }

    // 7. Comprimir si excede límites
    if (this.estimateTokens(context) > maxTokens) {
        context = await this.compressContext(context, maxTokens);
    }

    return context;
}

analyzeQueryIntent(query) {
    const intent = {
        type: null,
        targets: [],
        action: null,
        scope: null
    };

    // Detectar tipo de consulta
    if (query.match(/fix|bug|error|issue/i)) {
        intent.type = 'debugging';
    } else if (query.match(/create|add|implement|build/i)) {
        intent.type = 'creation';
    } else if (query.match(/refactor|improve|optimize/i)) {
        intent.type = 'refactoring';
    } else if (query.match(/explain|understand|what|how/i)) {
        intent.type = 'explanation';
    } else if (query.match(/analyze|review|check/i)) {
        intent.type = 'analysis';
    } else {
        intent.type = 'general';
    }

    // Detectar targets (archivos, funciones, etc mencionados)
    const fileRegex = /(\w+\.\w+)/g;
    const matches = query.match(fileRegex);
    if (matches) {
        intent.targets = matches;
    }

    // Detectar acción específica
    const actionWords = ['create', 'modify', 'delete', 'fix', 'add', 'remove', 'update'];
    for (const action of actionWords) {
        if (query.toLowerCase().includes(action)) {
            intent.action = action;
            break;
        }
    }

    // Detectar scope
    if (query.match(/whole|entire|all|project/i)) {
        intent.scope = 'project';
    } else if (query.match(/function|method/i)) {
        intent.scope = 'function';
    } else if (query.match(/file|module/i)) {
        intent.scope = 'file';
    } else {
        intent.scope = 'local';
    }

    return intent;
}

calculateRelevance(query, intent) {
    console.log("🔍 Calculating relevance for", Object.keys(this.projectContext.content.files).length, "files");
    const relevanceMap = new Map();

    // Palabras clave de la query
    const queryWords = query.toLowerCase().split(/\s+/);

    // Calcular relevancia para cada archivo
    const fileEntries = Object.entries(this.projectContext.content.files);
    if (fileEntries.length > 5) {
        console.log("⚡ Limiting to 5 most important files for performance");
        fileEntries.length = 5;
    }
    for (const [path, content] of fileEntries) {
    for (const [path, content] of Object.entries(this.projectContext.content.files)) {
        let score = 0;

        // Si el archivo está específicamente mencionado
        if (intent.targets.includes(path)) {
            score += 100;
        }

        // Relevancia por contenido
        const contentLower = content.toLowerCase();
        for (const word of queryWords) {
            if (word.length > 3) { // Ignorar palabras muy cortas
                const occurrences = (contentLower.match(new RegExp(word, 'g')) || []).length;
                score += occurrences * 2;
            }
        }

        // Relevancia por tipo de intent
        if (intent.type === 'debugging' && path.includes('test')) {
            score += 20;
        }
        if (intent.type === 'creation' && path.includes('template')) {
            score += 15;
        }

        // Relevancia por complejidad (archivos complejos pueden necesitar más contexto)
        const complexity = this.projectContext.analysis.dependencies[path]?.complexity || 0;
        if (complexity > 10) {
            score += 10;
        }

        // Relevancia por dependencias
        const deps = this.projectContext.analysis.dependencies[path];
        if (deps) {
            // Si tiene muchos dependientes, es importante
            score += deps.dependents.length * 3;
        }

        // Relevancia por actividad reciente
        if (this.projectContext.dynamic.recentFiles.includes(path)) {
            score += 25;
        }

        relevanceMap.set(path, score);
    }

    // Calcular relevancia para funciones
    for (const [key, func] of Object.entries(this.projectContext.content.functions)) {
        let score = relevanceMap.get(func.path) || 0;

        // Bonus si la función es mencionada
        if (queryWords.includes(func.name.toLowerCase())) {
            score += 50;
        }

        relevanceMap.set(`function:${key}`, score);
    }

    return relevanceMap;
}

selectRelevantContent(relevanceMap, maxTokens) {
    // Ordenar por relevancia
    const sorted = Array.from(relevanceMap.entries())
        .sort((a, b) => b[1] - a[1]);

    const selected = {
        files: [],
        functions: [],
        classes: [],
        context: []
    };

    let currentTokens = 0;
    const tokenBudget = maxTokens * 0.8; // Dejar espacio para metadata

    for (const [key, score] of sorted) {
        if (currentTokens >= tokenBudget) break;

        if (key.startsWith('function:')) {
            const funcKey = key.replace('function:', '');
            const func = this.projectContext.content.functions[funcKey];
            const tokens = this.estimateTokens(func);

            if (currentTokens + tokens < tokenBudget) {
                selected.functions.push(func);
                currentTokens += tokens;
            }
        } else if (key.startsWith('class:')) {
            const classKey = key.replace('class:', '');
            const cls = this.projectContext.content.classes[classKey];
            const tokens = this.estimateTokens(cls);

            if (currentTokens + tokens < tokenBudget) {
                selected.classes.push(cls);
                currentTokens += tokens;
            }
        } else {
            // Es un archivo
            const content = this.projectContext.content.files[key];
            if (content) {
                const tokens = this.estimateTokens(content);

                if (currentTokens + tokens < tokenBudget) {
                    selected.files.push({
                        path: key,
                        content: content,
                        relevance: score
                    });
                    currentTokens += tokens;
                } else {
                    // Si no cabe completo, incluir resumen
                    const summary = this.summarizeFile(content, tokenBudget - currentTokens);
                    selected.files.push({
                        path: key,
                        content: summary,
                        relevance: score,
                        summarized: true
                    });
                    currentTokens += this.estimateTokens(summary);
                }
            }
        }
    }

    return selected;
}

structureContext(selectedContent, intent) {
    const context = {
        project: {
            name: this.projectContext.metadata.name,
            language: this.projectContext.metadata.language,
            framework: this.projectContext.metadata.framework,
            description: this.projectContext.metadata.description
        },
        intent: intent,
        relevantFiles: selectedContent.files.map(f => ({
            path: f.path,
            content: f.content,
            summarized: f.summarized || false
        })),
        relevantFunctions: selectedContent.functions,
        relevantClasses: selectedContent.classes,
        dependencies: this.getRelevantDependencies(selectedContent),
        patterns: this.projectContext.analysis.patterns,
        structure: this.getSimplifiedStructure()
    };

    return context;
}

getRelevantDependencies(selectedContent) {
    const deps = {};

    for (const file of selectedContent.files) {
        const fileDeps = this.projectContext.analysis.dependencies[file.path];
        if (fileDeps) {
            deps[file.path] = {
                imports: fileDeps.imports,
                exports: fileDeps.exports,
                complexity: fileDeps.complexity
            };
        }
    }

    return deps;
}

getSimplifiedStructure() {
    return {
        entryPoints: this.projectContext.structure.entryPoints,
        mainModules: Object.keys(this.projectContext.structure.modules).slice(0, 10),
        routes: this.projectContext.structure.routes.slice(0, 20),
        totalFiles: Object.keys(this.projectContext.content.files).length
    };
}

getRelevantAnalysis(intent) {
    const analysis = {};

    if (intent.type === 'debugging' || intent.type === 'analysis') {
        analysis.quality = this.projectContext.analysis.quality;
        analysis.codeSmells = this.projectContext.analysis.smells;
    }

    if (intent.type === 'refactoring') {
        analysis.patterns = this.projectContext.analysis.patterns;
        analysis.complexity = this.getHighComplexityAreas();
    }

    return analysis;
}

getHighComplexityAreas() {
    return Object.entries(this.projectContext.content.functions)
        .filter(([_, func]) => func.complexity > 10)
        .map(([key, func]) => ({
            location: key,
            complexity: func.complexity
        }))
        .sort((a, b) => b.complexity - a.complexity)
        .slice(0, 5);
}

getRelevantMemory(query) {
    const memory = {
        recentConversations: [],
        relevantDecisions: [],
        similarQueries: []
    };

    // Obtener conversaciones recientes relacionadas
    const recentConvs = this.projectContext.memory.conversations
        .slice(-5)
        .filter(conv => this.isRelated(conv.query, query));

    memory.recentConversations = recentConvs;

    // Obtener decisiones arquitectónicas relevantes
    memory.relevantDecisions = this.projectContext.memory.decisions
        .filter(decision => this.isRelated(decision.description, query))
        .slice(0, 3);

    return memory;
}

isRelated(text1, text2) {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);

    const commonWords = words1.filter(w => words2.includes(w) && w.length > 3);
    return commonWords.length > 2;
}

// ========================================================================
// COMPRESIÓN DE CONTEXTO
// ========================================================================

async compressContext(context, targetTokens) {
    console.log('📦 Compressing context to fit token limit...');

    let compressed = JSON.parse(JSON.stringify(context)); // Deep clone
    let currentTokens = this.estimateTokens(compressed);

    // Estrategias de compresión en orden de agresividad
    const strategies = [
        () => this.removeComments(compressed),
        () => this.removeWhitespace(compressed),
        () => this.summarizeLongFunctions(compressed),
        () => this.removeLeadImplementations(compressed),
        () => this.abstractPatterns(compressed),
        () => this.removeNonEssentialFiles(compressed)
    ];

    for (const strategy of strategies) {
        if (currentTokens <= targetTokens) break;

        compressed = strategy();
        currentTokens = this.estimateTokens(compressed);
        console.log(`After compression: ${currentTokens} tokens`);
    }

    return compressed;
}

removeComments(context) {
    for (const file of context.relevantFiles || []) {
        if (!file.summarized) {
            file.content = file.content.replace(/\/\*[\s\S]*?\*\//g, '');
            file.content = file.content.replace(/\/\/.*/g, '');
        }
    }
    return context;
}

removeWhitespace(context) {
    for (const file of context.relevantFiles || []) {
        if (!file.summarized) {
            file.content = file.content.replace(/\s+/g, ' ');
            file.content = file.content.replace(/\n\s*\n/g, '\n');
        }
    }
    return context;
}

summarizeLongFunctions(context) {
    for (const func of context.relevantFunctions || []) {
        if (func.body && func.body.length > 500) {
            func.body = `[Function body: ${func.body.length} chars, complexity: ${func.complexity}]`;
            func.summarized = true;
        }
    }
    return context;
}

removeLeadImplementations(context) {
    // Mantener solo interfaces/signatures
    for (const cls of context.relevantClasses || []) {
        delete cls.methodImplementations;
        cls.summary = `Class with ${cls.methods?.length || 0} methods`;
    }
    return context;
}

abstractPatterns(context) {
    // Reemplazar código repetitivo con descripciones
    const patterns = this.detectRepetitivePatterns(context);
    for (const pattern of patterns) {
        context = this.replaceWithAbstraction(context, pattern);
    }
    return context;
}

removeNonEssentialFiles(context) {
    // Mantener solo los más relevantes
    if (context.relevantFiles && context.relevantFiles.length > 0) {
        context.relevantFiles = context.relevantFiles
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, Math.floor(context.relevantFiles.length * 0.6));
    }
    return context;
}

detectRepetitivePatterns(context) {
    // Simplificado: detectar patrones comunes
    return [];
}

replaceWithAbstraction(context, pattern) {
    // Reemplazar patrón con descripción
    return context;
}

// ========================================================================
// UTILIDADES
// ========================================================================

estimateTokens(obj) {
    // Estimación simple: ~4 caracteres por token
    const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
    return Math.ceil(str.length / 4);
}

summarizeFile(content, maxTokens) {
    const maxChars = maxTokens * 4;

    if (content.length <= maxChars) {
        return content;
    }

    // Mantener inicio y fin del archivo
    const halfChars = Math.floor(maxChars / 2);
    const start = content.substring(0, halfChars);
    const end = content.substring(content.length - halfChars);

    return `${start}\n\n[... ${content.length - maxChars} characters omitted ...]\n\n${end}`;
}

detectModuleType(path) {
    if (path.includes('component')) return 'component';
    if (path.includes('service')) return 'service';
    if (path.includes('controller')) return 'controller';
    if (path.includes('model')) return 'model';
    if (path.includes('util')) return 'utility';
    return 'module';
}

detectConfigType(path) {
    if (path.includes('webpack')) return 'webpack';
    if (path.includes('babel')) return 'babel';
    if (path.includes('eslint')) return 'eslint';
    if (path.includes('tsconfig')) return 'typescript';
    if (path.includes('package.json')) return 'npm';
    return 'config';
}

extractRoutes(content) {
    const routes = [];

    // Express style routes
    const routeRegex = /app\.(get|post|put|delete|patch)\s*\(['"]([^'"]+)['"]/g;
    let match;
    while ((match = routeRegex.exec(content)) !== null) {
        routes.push({
            method: match[1].toUpperCase(),
            path: match[2]
        });
    }

    // Router style
    const routerRegex = /router\.(get|post|put|delete|patch)\s*\(['"]([^'"]+)['"]/g;
    while ((match = routerRegex.exec(content)) !== null) {
        routes.push({
            method: match[1].toUpperCase(),
            path: match[2]
        });
    }

    return routes;
}

extractFunctionCalls(body) {
    const calls = [];
    const callRegex = /(\w+)\s*\(/g;
    let match;

    while ((match = callRegex.exec(body)) !== null) {
        if (!['if', 'for', 'while', 'switch', 'catch', 'function'].includes(match[1])) {
            calls.push(match[1]);
        }
    }

    return [...new Set(calls)]; // Unique calls
}

// ========================================================================
// MEMORIA Y APRENDIZAJE
// ========================================================================

async updateMemory(interaction) {
    // Guardar conversación
    this.projectContext.memory.conversations.push({
        query: interaction.query,
        response: interaction.response,
        timestamp: new Date(),
        context: interaction.context
    });

    // Limitar historial
    if (this.projectContext.memory.conversations.length > 100) {
        this.projectContext.memory.conversations =
            this.projectContext.memory.conversations.slice(-100);
    }

    // Actualizar archivos recientes
    if (interaction.filesModified) {
        for (const file of interaction.filesModified) {
            this.addToRecentFiles(file);
        }
    }

    // Detectar y guardar decisiones importantes
    if (this.isArchitecturalDecision(interaction)) {
        this.projectContext.memory.decisions.push({
            description: interaction.query,
            decision: interaction.response,
            timestamp: new Date(),
            impact: this.assessImpact(interaction)
        });
    }

    // Actualizar patrones del usuario
    this.updateUserPatterns(interaction);
}

addToRecentFiles(file) {
    const recent = this.projectContext.dynamic.recentFiles;

    // Remover si ya existe
    const index = recent.indexOf(file);
    if (index > -1) {
        recent.splice(index, 1);
    }

    // Agregar al principio
    recent.unshift(file);

    // Mantener solo los últimos 20
    if (recent.length > 20) {
        recent.pop();
    }
}

isArchitecturalDecision(interaction) {
    const keywords = ['architecture', 'design', 'pattern', 'structure', 'refactor', 'migrate'];
    return keywords.some(keyword =>
        interaction.query.toLowerCase().includes(keyword) ||
        interaction.response.toLowerCase().includes(keyword)
    );
}

assessImpact(interaction) {
    let impact = 'low';

    if (interaction.filesModified && interaction.filesModified.length > 5) {
        impact = 'high';
    } else if (interaction.filesModified && interaction.filesModified.length > 2) {
        impact = 'medium';
    }

    return impact;
}

updateUserPatterns(interaction) {
    // Detectar preferencias de código
    if (interaction.response.includes('const')) {
        this.projectContext.memory.patterns.preferConst = true;
    }

    if (interaction.response.includes('async/await')) {
        this.projectContext.memory.patterns.preferAsync = true;
    }

    // Más patrones pueden ser detectados aquí
}

// ========================================================================
// ANÁLISIS HOLÍSTICO ESTILO LOVABLE
// ========================================================================

async analyzeProjectHealth() {
    const health = {
        strengths: [],
        weaknesses: [],
        opportunities: [],
        risks: [],
        score: 0,
        recommendations: []
    };

    // Analizar fortalezas
    if (this.projectContext.analysis.patterns.some(p => p.confidence > 0.8)) {
        health.strengths.push({
            area: 'Architecture',
            description: 'Clear architectural patterns detected',
            impact: 'high'
        });
    }

    if (this.projectContext.analysis.quality.coverage > 70) {
        health.strengths.push({
            area: 'Testing',
            description: `Good test coverage (${this.projectContext.analysis.quality.coverage.toFixed(1)}%)`,
            impact: 'high'
        });
    }

    if (this.projectContext.metadata.dependencies.length > 0) {
        health.strengths.push({
            area: 'Dependencies',
            description: 'Using modern libraries and frameworks',
            impact: 'medium'
        });
    }

    // Analizar debilidades
    if (this.projectContext.analysis.quality.avgComplexity > 10) {
        health.weaknesses.push({
            area: 'Complexity',
            description: `High average complexity (${this.projectContext.analysis.quality.avgComplexity.toFixed(1)})`,
            impact: 'high',
            suggestion: 'Consider breaking down complex functions'
        });
    }

    if (this.projectContext.analysis.quality.codeSmells.length > 10) {
        health.weaknesses.push({
            area: 'Code Quality',
            description: `${this.projectContext.analysis.quality.codeSmells.length} code smells detected`,
            impact: 'medium',
            suggestion: 'Refactor problematic areas'
        });
    }

    if (!this.projectContext.content.comments || Object.keys(this.projectContext.content.comments).length < 5) {
        health.weaknesses.push({
            area: 'Documentation',
            description: 'Limited code documentation',
            impact: 'low',
            suggestion: 'Add JSDoc comments to main functions'
        });
    }

    // Analizar oportunidades
    if (!this.projectContext.metadata.framework) {
        health.opportunities.push({
            area: 'Framework',
            description: 'Could benefit from a modern framework',
            potential: 'high'
        });
    }

    if (this.projectContext.analysis.quality.coverage < 50) {
        health.opportunities.push({
            area: 'Testing',
            description: 'Increase test coverage for better reliability',
            potential: 'high'
        });
    }

    // Analizar riesgos
    const outdatedDeps = this.checkOutdatedDependencies();
    if (outdatedDeps.length > 0) {
        health.risks.push({
            area: 'Dependencies',
            description: `${outdatedDeps.length} potentially outdated dependencies`,
            severity: 'medium',
            mitigation: 'Update dependencies regularly'
        });
    }

    if (this.projectContext.analysis.security && this.projectContext.analysis.security.length > 0) {
        health.risks.push({
            area: 'Security',
            description: `${this.projectContext.analysis.security.length} potential security issues`,
            severity: 'high',
            mitigation: 'Review and fix security vulnerabilities'
        });
    }

    // Calcular score general
    health.score = this.calculateHealthScore(health);

    // Generar recomendaciones
    health.recommendations = this.generateRecommendations(health);

    return health;
}

checkOutdatedDependencies() {
    // Simplificado: verificar dependencias conocidas como outdated
    const outdated = [];
    const deps = this.projectContext.metadata.dependencies || [];

    // Aquí podrías hacer checks reales contra npm registry
    // Por ahora, ejemplo simplificado
    for (const dep of deps) {
        if (dep.includes('jquery') || (dep.includes('angular') && !dep.includes('@angular'))) {
            outdated.push(dep);
        }
    }

    return outdated;
}

calculateHealthScore(health) {
    let score = 50; // Base score

    // Sumar por fortalezas
    score += health.strengths.length * 10;

    // Restar por debilidades
    score -= health.weaknesses.filter(w => w.impact === 'high').length * 15;
    score -= health.weaknesses.filter(w => w.impact === 'medium').length * 10;
    score -= health.weaknesses.filter(w => w.impact === 'low').length * 5;

    // Restar por riesgos
    score -= health.risks.filter(r => r.severity === 'high').length * 20;
    score -= health.risks.filter(r => r.severity === 'medium').length * 10;

    // Normalizar entre 0 y 100
    return Math.max(0, Math.min(100, score));
}

generateRecommendations(health) {
    const recommendations = [];

    // Prioridad alta: riesgos severos
    for (const risk of health.risks.filter(r => r.severity === 'high')) {
        recommendations.push({
            priority: 'high',
            area: risk.area,
            action: risk.mitigation,
            impact: 'Reduces critical risk',
            effort: 'medium'
        });
    }

    // Prioridad media: debilidades de alto impacto
    for (const weakness of health.weaknesses.filter(w => w.impact === 'high')) {
        recommendations.push({
            priority: 'medium',
            area: weakness.area,
            action: weakness.suggestion,
            impact: 'Improves code quality',
            effort: 'medium'
        });
    }

    // Prioridad baja: oportunidades
    for (const opportunity of health.opportunities.slice(0, 3)) {
        recommendations.push({
            priority: 'low',
            area: opportunity.area,
            action: opportunity.description,
            impact: 'Enhances capabilities',
            effort: 'high'
        });
    }

    return recommendations.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    }
}

// Exportar para uso en el servidor
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IntelligentContextManager;
}
        const priorityOrder = { high: 0, medium: 1, low: 2 };
