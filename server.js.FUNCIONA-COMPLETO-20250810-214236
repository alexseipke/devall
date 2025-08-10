const express = require('express');
const cors = require('cors');
const { Anthropic } = require('@anthropic-ai/sdk');
const { Octokit } = require('@octokit/rest');
require('dotenv').config();

const app = express();

// Claude API
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

// GitHub API
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Variables globales
let projectContext = {
  repository: null,
  files: {},
  structure: {},
  analysis: {},
  memory: []
};

// Endpoint: Cargar repositorio
app.post('/api/load-repo', async (req, res) => {
  const { owner, repo } = req.body;
  
  try {
    const { data: repoData } = await octokit.repos.get({ owner, repo });
    const { data: tree } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: repoData.default_branch,
      recursive: true
    });
    
    projectContext.repository = { owner, repo, data: repoData };
    projectContext.structure = tree;
    
    res.json({ 
      success: true, 
      repository: repoData, 
      structure: tree,  // AGREGADO: Enviar estructura
      fileCount: tree.tree.length 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: Obtener archivo
app.post('/api/get-file', async (req, res) => {
  const { path } = req.body;
  const { owner, repo } = projectContext.repository;
  
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path
    });
    
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    projectContext.files[path] = content;
    
    res.json({ content, sha: data.sha });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: Chat con Claude
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  
  try {
    const context = buildIntelligentContext(message);
    
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: context + '\n\nUser request: ' + message
        }
      ]
    });
    
    projectContext.memory.push({
      message,
      response: response.content[0].text,
      timestamp: new Date()
    });
    
    res.json({ response: response.content[0].text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Función de construcción de contexto
function buildIntelligentContext(query) {
  let context = 'You are analyzing a software project.\n';
  if (projectContext.repository) {
    context += 'Repository: ' + projectContext.repository.data.full_name + '\n';
    context += 'Language: ' + projectContext.repository.data.language + '\n';
  }
  context += 'Files loaded: ' + Object.keys(projectContext.files).length + '\n\n';
  
  if (Object.keys(projectContext.files).length > 0) {
    context += 'Relevant files:\n';
    for (const [path, content] of Object.entries(projectContext.files)) {
      context += '\n--- ' + path + ' ---\n' + content.substring(0, 1000) + '...\n';
    }
  }
  
  return context;
}

app.listen(3005, '127.0.0.1', () => {
  console.log('devall.app running on port 3005');
});
