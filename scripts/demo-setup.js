#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Configurando demo de Vendex AI...\n');

// Verificar si existe .env
if (!fs.existsSync('.env')) {
  console.log('📝 Creando archivo .env...');
  fs.copyFileSync('.env.example', '.env');
  console.log('✅ Archivo .env creado');
  console.log('⚠️  IMPORTANTE: Configura tu ANTHROPIC_API_KEY en el archivo .env\n');
} else {
  console.log('✅ Archivo .env ya existe\n');
}

// Crear directorio de logs
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
  console.log('✅ Directorio de logs creado\n');
}

console.log('📦 Instalando dependencias...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencias instaladas\n');
} catch (error) {
  console.error('❌ Error instalando dependencias');
  process.exit(1);
}

console.log('🎯 Demo configurado! Próximos pasos:\n');
console.log('1. Edita el archivo .env con tu ANTHROPIC_API_KEY');
console.log('2. Inicia MongoDB: mongod');
console.log('3. Inicia Redis: redis-server');
console.log('4. Ejecuta: npm run seed');
console.log('5. Ejecuta: npm run dev');
console.log('6. Ve a: http://localhost:3000\n');
console.log('🌟 ¡Tu asistente de ventas estará listo para probar!');