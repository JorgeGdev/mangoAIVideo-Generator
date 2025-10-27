#!/usr/bin/env node

/**
 * RAILWAY DEPLOYMENT VERIFICATION SCRIPT
 * Verifica que todas las configuraciones estén correctas antes de deployment
 */

console.log('🔍 RAILWAY DEPLOYMENT VERIFICATION\n');

let errors = [];
let warnings = [];
let success = [];

// ============================================================================
// 1. VERIFICAR VERSIÓN DE NODE.JS
// ============================================================================
console.log('📦 Checking Node.js version...');
const nodeVersion = process.version;
const nodeMajor = parseInt(nodeVersion.split('.')[0].substring(1));

if (nodeMajor >= 20) {
  success.push(`✅ Node.js version: ${nodeVersion} (compatible)`);
} else if (nodeMajor >= 18) {
  warnings.push(`⚠️  Node.js version: ${nodeVersion} (works but v20+ recommended)`);
} else {
  errors.push(`❌ Node.js version: ${nodeVersion} (INCOMPATIBLE - requires v20+)`);
}

// ============================================================================
// 2. VERIFICAR PACKAGE.JSON
// ============================================================================
console.log('📋 Checking package.json...');
try {
  const packageJson = require('./package.json');
  
  // Verificar engines
  if (packageJson.engines && packageJson.engines.node) {
    const required = packageJson.engines.node;
    success.push(`✅ Package.json engines.node: ${required}`);
  } else {
    errors.push('❌ Package.json missing engines.node specification');
  }
  
  // Verificar dependencias críticas
  const criticalDeps = [
    'express',
    'node-cron',
    'axios',
    '@supabase/supabase-js',
    'openai',
    'dotenv'
  ];
  
  criticalDeps.forEach(dep => {
    if (packageJson.dependencies[dep]) {
      success.push(`✅ Dependency: ${dep} v${packageJson.dependencies[dep]}`);
    } else {
      errors.push(`❌ Missing critical dependency: ${dep}`);
    }
  });
  
} catch (error) {
  errors.push(`❌ Cannot read package.json: ${error.message}`);
}

// ============================================================================
// 3. VERIFICAR DOCKERFILE
// ============================================================================
console.log('🐳 Checking Dockerfile...');
const fs = require('fs');
const path = require('path');

try {
  const dockerfile = fs.readFileSync(path.join(__dirname, 'Dockerfile'), 'utf8');
  
  // Verificar Node version en Dockerfile
  if (dockerfile.includes('FROM node:20')) {
    success.push('✅ Dockerfile uses Node.js v20');
  } else if (dockerfile.includes('FROM node:18')) {
    errors.push('❌ Dockerfile still uses Node.js v18 (should be v20)');
  } else {
    warnings.push('⚠️  Could not verify Node version in Dockerfile');
  }
  
  // Verificar tzdata
  if (dockerfile.includes('tzdata')) {
    success.push('✅ Dockerfile installs tzdata for timezone support');
  } else {
    errors.push('❌ Dockerfile missing tzdata installation');
  }
  
  // Verificar TZ environment variable
  if (dockerfile.includes('TZ=America/Mexico_City')) {
    success.push('✅ Dockerfile sets TZ=America/Mexico_City');
  } else {
    errors.push('❌ Dockerfile missing TZ environment variable');
  }
  
  // Verificar garbage collection flag
  if (dockerfile.includes('--expose-gc')) {
    success.push('✅ Dockerfile enables garbage collection');
  } else {
    warnings.push('⚠️  Dockerfile missing --expose-gc flag (recommended)');
  }
  
} catch (error) {
  errors.push(`❌ Cannot read Dockerfile: ${error.message}`);
}

// ============================================================================
// 4. VERIFICAR ARCHIVOS CRÍTICOS
// ============================================================================
console.log('📁 Checking critical files...');

const criticalFiles = [
  'server.js',
  'scraper-4-paises-final.js',
  'package.json',
  'Dockerfile',
  '.env' // Should exist locally
];

criticalFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    success.push(`✅ File exists: ${file}`);
  } else {
    if (file === '.env') {
      warnings.push(`⚠️  File missing: ${file} (ensure Railway has env vars configured)`);
    } else {
      errors.push(`❌ File missing: ${file}`);
    }
  }
});

// ============================================================================
// 5. VERIFICAR VARIABLES DE ENTORNO (locales)
// ============================================================================
console.log('🔐 Checking environment variables...');

try {
  require('dotenv').config();
  
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_KEY',
    'OPENAI_API_KEY',
    'ELEVENLABS_API_KEY',
    'HEDRA_API_KEY',
    'BOT_TOKEN',
    'CHAT_ID'
  ];
  
  requiredEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
      success.push(`✅ Environment variable set: ${envVar}`);
    } else {
      warnings.push(`⚠️  Environment variable missing: ${envVar} (ensure configured in Railway)`);
    }
  });
  
} catch (error) {
  warnings.push(`⚠️  Cannot load .env file: ${error.message}`);
}

// ============================================================================
// 6. VERIFICAR CRON CONFIGURATION EN SERVER.JS
// ============================================================================
console.log('⏰ Checking cron job configuration...');

try {
  const serverJs = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
  
  // Verificar que existan los 4 horarios
  const schedules = ['0 6 * * *', '0 10 * * *', '0 14 * * *', '0 18 * * *'];
  
  schedules.forEach(schedule => {
    if (serverJs.includes(schedule)) {
      success.push(`✅ Cron schedule configured: ${schedule}`);
    } else {
      errors.push(`❌ Missing cron schedule: ${schedule}`);
    }
  });
  
  // Verificar timezone
  if (serverJs.includes('timezone: "America/Mexico_City"')) {
    success.push('✅ Cron jobs use timezone: America/Mexico_City');
  } else {
    errors.push('❌ Cron jobs missing timezone configuration');
  }
  
} catch (error) {
  errors.push(`❌ Cannot verify cron configuration: ${error.message}`);
}

// ============================================================================
// 7. RESULTADO FINAL
// ============================================================================
console.log('\n' + '='.repeat(70));
console.log('📊 VERIFICATION RESULTS\n');

if (success.length > 0) {
  console.log('✅ SUCCESS:\n');
  success.forEach(msg => console.log(`   ${msg}`));
  console.log('');
}

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS:\n');
  warnings.forEach(msg => console.log(`   ${msg}`));
  console.log('');
}

if (errors.length > 0) {
  console.log('❌ ERRORS:\n');
  errors.forEach(msg => console.log(`   ${msg}`));
  console.log('');
}

console.log('='.repeat(70));

// Exit code
if (errors.length > 0) {
  console.log('\n❌ VERIFICATION FAILED - Fix errors before deploying to Railway\n');
  process.exit(1);
} else if (warnings.length > 0) {
  console.log('\n⚠️  VERIFICATION PASSED WITH WARNINGS - Review before deploying\n');
  process.exit(0);
} else {
  console.log('\n✅ VERIFICATION PASSED - Ready for Railway deployment!\n');
  console.log('Next steps:');
  console.log('1. git add .');
  console.log('2. git commit -m "Fix: Node 20 + timezone for Railway"');
  console.log('3. git push');
  console.log('4. Monitor Railway build logs\n');
  process.exit(0);
}
