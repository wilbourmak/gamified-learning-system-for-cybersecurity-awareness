#!/usr/bin/env node

/**
 * Deployment Preparation Script
 * Run this before deploying to update configuration files
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
    console.log('🚀 CyberGuard Academy - Deployment Preparation\n');
    
    // Get backend URL from user
    const backendUrl = await question('Enter your backend URL (e.g., https://cyberguard-api.onrender.com): ');
    
    if (!backendUrl || !backendUrl.startsWith('http')) {
        console.log('❌ Invalid URL. Please provide a valid URL starting with http:// or https://');
        process.exit(1);
    }
    
    // Update api.js
    const apiJsPath = path.join(__dirname, 'FRONTEND', 'api.js');
    let apiJsContent = fs.readFileSync(apiJsPath, 'utf8');
    
    // Replace the baseURL line
    apiJsContent = apiJsContent.replace(
        /this\.baseURL\s*=\s*['"][^'"]+['"];/,
        `this.baseURL = '${backendUrl}/api';`
    );
    
    fs.writeFileSync(apiJsPath, apiJsContent);
    console.log('✅ Updated FRONTEND/api.js');
    
    // Update render.yaml
    const renderYamlPath = path.join(__dirname, 'render.yaml');
    if (fs.existsSync(renderYamlPath)) {
        let renderYamlContent = fs.readFileSync(renderYamlPath, 'utf8');
        
        // Update the FRONTEND_URL in render.yaml
        const frontendUrl = await question('\nEnter your frontend URL (e.g., https://cyberguard.onrender.com): ');
        
        renderYamlContent = renderYamlContent.replace(
            /FRONTEND_URL[\s\S]*?value:.*$/m,
            `FRONTEND_URL\n        value: ${frontendUrl}`
        );
        
        fs.writeFileSync(renderYamlPath, renderYamlContent);
        console.log('✅ Updated render.yaml');
    }
    
    // Update CORS in server-sqlite.js
    const serverPath = path.join(__dirname, 'BACKEND', 'server-sqlite.js');
    let serverContent = fs.readFileSync(serverPath, 'utf8');
    
    // Add frontend URL to CORS origins
    const frontendUrl = await question('\nEnter your frontend URL again for CORS: ');
    
    serverContent = serverContent.replace(
        /app\.use\(cors\({\s*origin:\s*true,\s*credentials:\s*true\s*}\)\);/,
        `app.use(cors({
    origin: [
        'http://localhost:8000',
        '${frontendUrl}'
    ],
    credentials: true
}));`
    );
    
    fs.writeFileSync(serverPath, serverContent);
    console.log('✅ Updated BACKEND/server-sqlite.js CORS configuration');
    
    console.log('\n✨ Preparation complete!\n');
    console.log('Next steps:');
    console.log('1. Push your code to GitHub');
    console.log('2. Go to https://render.com and create a new Blueprint');
    console.log('3. Connect your GitHub repository');
    console.log('4. Render will deploy both frontend and backend automatically!\n');
    
    rl.close();
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
