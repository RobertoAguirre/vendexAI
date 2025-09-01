const fs = require('fs');
const path = require('path');

function setupEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  
  if (fs.existsSync(envPath)) {
    console.log('📝 El archivo .env ya existe');
    return;
  }
  
  const envContent = `# MongoDB Atlas Configuration
MONGODB_URI=mongodb+srv://your_username:your_password@your_cluster.mongodb.net/vendexai?retryWrites=true&w=majority

# Anthropic API Key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Server Configuration
PORT=3000
NODE_ENV=development

# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379
`;
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Archivo .env creado');
  console.log('📝 Por favor, edita el archivo .env con tus credenciales reales');
}

if (require.main === module) {
  setupEnv();
}

module.exports = { setupEnv };
