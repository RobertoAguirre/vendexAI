#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Configurando Vendex AI para desarrollo local...\n');

// Verificar si existe .env
if (!fs.existsSync('.env')) {
  console.log('📝 Creando archivo .env desde .env.example...');
  fs.copyFileSync('.env.example', '.env');
  console.log('✅ Archivo .env creado');
  console.log('⚠️  IMPORTANTE: Edita el archivo .env con tus configuraciones reales\n');
} else {
  console.log('✅ Archivo .env ya existe\n');
}

// Verificar dependencias
console.log('📦 Verificando dependencias...');
try {
  execSync('npm list', { stdio: 'ignore' });
  console.log('✅ Dependencias instaladas\n');
} catch (error) {
  console.log('📦 Instalando dependencias...');
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencias instaladas\n');
}

// Crear directorio de logs
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
  console.log('✅ Directorio de logs creado\n');
}

console.log('🎯 Setup completado! Próximos pasos:\n');
console.log('1. Asegúrate de tener MongoDB y Redis ejecutándose localmente:');
console.log('   - MongoDB: mongod');
console.log('   - Redis: redis-server\n');
console.log('2. Edita el archivo .env con tu ANTHROPIC_API_KEY\n');
console.log('3. Ejecuta el seeder para datos de ejemplo:');
console.log('   npm run seed\n');
console.log('4. Inicia el servidor de desarrollo:');
console.log('   npm run dev\n');
console.log('🌟 ¡Tu asistente de ventas estará listo en http://localhost:3000!');