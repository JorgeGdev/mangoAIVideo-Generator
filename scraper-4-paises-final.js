require('dotenv').config();
const Parser = require('rss-parser');
const axios = require('axios');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const TelegramBot = require('node-telegram-bot-api');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// TELEGRAM CONFIG
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const parser = new Parser();
const bot = new TelegramBot(BOT_TOKEN);

// Global variable to store titles
let titulosRecolectados = [];

// THE SAME 4 SOURCES FROM YOUR ORIGINAL N8N
const fuentesRSS = [
  {
    url: 'https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/world/?_website=nzh&outputType=xml',
    seccion: 'International',
    pais: 'New Zealand',
    bandera: 'nz'
  },
  {
    url: 'https://www.abc.net.au/news/feed/45910/rss.xml',
    seccion: 'NZnews',
    pais: 'Australia',
    bandera: '🇦🇺'
  },
  {
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    seccion: 'world',
    pais: 'United Kingdom',
    bandera: '🇬🇧'
  },
  {
    url: 'https://feeds.npr.org/1004/rss.xml',
    seccion: 'international',
    pais: 'USA',
    bandera: '🇺🇸'
  }
];

// ===== FUNCTION TO SEND TELEGRAM =====
async function enviarTelegram(message) {
  try {
    await bot.sendMessage(CHAT_ID, message, { parse_mode: 'HTML' });
    console.log('✅ Message sent to Telegram');
  } catch (error) {
    console.error('❌ Error sending Telegram:', error.message);
  }
}

// ===== HELPER FUNCTIONS =====

function esperar(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

// Extract content (optimized version for international sites)
async function extraerContenido(url) {
  try {
    console.log(`🔍 Extracting: ${url.substring(0, 50)}...`);
    
    const response = await axios.get(url, {
      timeout: 25000, // More time for international sites
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9,es;q=0.8,fr;q=0.7,it;q=0.6'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Expanded selectors for international sites
    const selectores = [
      'main article p',           // Modern sites
      '.article-content p',       // Marca, Spanish sites
      '.content p',               // Generic
      'article p',                // BBC, English sites
      '.post-content p',          // French blogs
      '.story-body p',            // BBC specific
      '.entry-content p',         // WordPress
      '.articolo-body p',         // Italian Gazzetta
      '.text p',                  // Gazzetta alternative
      'div[data-module="ArticleBody"] p' // Modern Gazzetta
    ];
    
    let paragrafos = [];
    
    for (const selector of selectores) {
      $(selector).each((i, elem) => {
        const texto = $(elem).text().trim();
        if (texto.length > 30 && !texto.includes('Cookie') && !texto.includes('JavaScript')) {
          paragrafos.push(texto);
        }
      });
      
      if (paragrafos.length > 0) {
        console.log(`✅ Content extracted with: ${selector}`);
        break;
      }
    }
    
    // If nothing is found, try generic paragraphs
    if (paragrafos.length === 0) {
      $('p').each((i, elem) => {
        const texto = $(elem).text().trim();
        if (texto.length > 50 && !texto.includes('Cookie')) {
          paragrafos.push(texto);
        }
      });
      
      if (paragrafos.length > 0) {
        console.log(`Content extracted with generic selector`);
      }
    }
    
    // Mantener máximo 5 párrafos
    paragrafos = paragrafos.slice(0, 5);
    
    const contentLimpio = paragrafos
      .join('\n\n')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\[.*?\]/g, '') // Remove [links]
      .substring(0, 2000);
    
    return contentLimpio;
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return '';
  }
}

// Create embeddings
async function crearEmbedding(texto) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texto.substring(0, 8000)
    });
    
    return response.data[0].embedding;
    
  } catch (error) {
    console.error('❌ Error embedding:', error.message);
    return null;
  }
}

// Split into chunks
function dividirEnChunks(texto, tamanoChunk = 800, overlap = 100) {
  const chunks = [];
  let inicio = 0;
  
  while (inicio < texto.length && chunks.length < 3) {
    const fin = Math.min(inicio + tamanoChunk, texto.length);
    const chunk = texto.substring(inicio, fin);
    
    if (chunk.trim().length > 50) {
      chunks.push(chunk.trim());
    }
    
    inicio = fin - overlap;
    if (inicio >= texto.length) break;
  }
  
  return chunks;
}

// Process a whole country (MODIFIED to collect titles)
async function procesarPais(fuente, numerosPais) {
  console.log(`\n${fuente.bandera} PROCESSING ${fuente.pais.toUpperCase()}`);
  console.log('='.repeat(50));
  
  let vectoresCreados = 0;
  let articulosProcesados = 0;
  let articulosSuccessfuls = 0;
  let titulosPais = []; // Store country titles
  
  try {
    // Read RSS
    console.log(`Reading RSS feed from ${fuente.pais}...`);
    const feed = await parser.parseURL(fuente.url);
    const noticias = feed.items.slice(0, 10);
    
    console.log(`${noticias.length} news articles obtained from ${fuente.pais}`);
    
    // Process in batches of 2 (proven formula)
    for (let lote = 0; lote < noticias.length; lote += 2) {
      const noticiasBatch = noticias.slice(lote, lote + 2);
      
      console.log(`\n${fuente.bandera} BATCH ${Math.floor(lote/2) + 1}: Articles ${lote + 1}-${Math.min(lote + 2, noticias.length)}`);
      
      for (let i = 0; i < noticiasBatch.length; i++) {
        const noticia = noticiasBatch[i];
        const numeroLocal = lote + i + 1;
        const numeroGlobal = numerosPais.inicio + articulosProcesados;
        
        console.log(`\n${numeroGlobal}/40: [${fuente.pais}] ${noticia.title.substring(0, 45)}...`);
        
        // Extraer content
        const content = await extraerContenido(noticia.link);
        
        if (content.length > 100) {
          // SAVE SUCCESSFUL TITLE
          titulosPais.push({
            titulo: noticia.title,
            url: noticia.link,
            fecha: noticia.pubDate
          });
          
          // Create full text
          const textoCompleto = `${noticia.title}\n\n${content}`;
          
          // Split into chunks
          const chunks = dividirEnChunks(textoCompleto);
          
          console.log(`${chunks.length} chunks created`);
          
          // Process each chunk
          for (let j = 0; j < chunks.length; j++) {
            const chunk = chunks[j];
            
            console.log(`  Embedding ${j + 1}/${chunks.length}...`);
            
            // Create embedding
            const embedding = await crearEmbedding(chunk);
            
            if (embedding) {
              // Insert into Supabase
              const { error } = await supabase.from('documents').insert({
                content: chunk,
                metadata: {
                  title: noticia.title,
                  url: noticia.link,
                  pubDate: noticia.pubDate,
                  section: fuente.seccion,
                  pais: fuente.pais,
                  chunk_index: j,
                  articulo_numero: numeroGlobal
                },
                embedding: embedding
              });
              
              if (!error) {
                vectoresCreados++;
                console.log(`  Vector ${numerosPais.vectorStart + vectoresCreados} inserted`);
              } else {
                console.error(`  Error: ${error.message}`);
              }
            }
            
            await esperar(0.5);
          }
          
          articulosSuccessfuls++;
        } else {
          console.log(`  Insufficient content, skipping...`);
        }
        
        articulosProcesados++;
        await esperar(2);
      }
      
      // Delay between batches
      console.log(`Batch completed. Waiting 5 seconds...`);
      await esperar(5);
      
      if (global.gc) {
        global.gc();
      }
      
      console.log(`${fuente.pais}: ${articulosSuccessfuls}/${articulosProcesados} successes | ${vectoresCreados} vectors`);
    }
    
  } catch (error) {
    console.error(`Error processing ${fuente.pais}:`, error.message);
  }
  
  // ADD TITLES TO THE GLOBAL COLLECTION
  titulosRecolectados.push({
    pais: fuente.pais,
    bandera: fuente.bandera,
    titulos: titulosPais
  });
  
  console.log(`\n${fuente.bandera} ${fuente.pais.toUpperCase()} COMPLETED:`);
  console.log(`Articles processed: ${articulosProcesados}/10`);
  console.log(`Articles successes: ${articulosSuccessfuls}`);
  console.log(`Vectors created: ${vectoresCreados}`);
  
  return {
    articulos: articulosProcesados,
    successes: articulosSuccessfuls,
    vectores: vectoresCreados
  };
}

// ===== FUNCTION TO GENERATE TELEGRAM SUMMARY =====
async function enviarResumenTelegram(results, tiempoMinutos, vectoresTotales) {
  const ahora = new Date();
  const fecha = ahora.toLocaleDateString();
  const hora = ahora.toLocaleTimeString();
  
  // MAIN MESSAGE
  let message = `<b>RAG SUCCESSFULLY UPDATED</b>\n\n`;
  message += `<b>Date:</b> ${fecha}\n`;
  message += `<b>Time:</b> ${hora}\n`;
  message += `<b>Time:</b> ${tiempoMinutos} minutes\n`;
  message += `<b>Total vectors:</b> ${vectoresTotales}\n\n`;
  
  // SUMMARY BY COUNTRY
  message += `<b>SUMMARY BY COUNTRY:</b>\n`;
  titulosRecolectados.forEach(paisData => {
    message += `${paisData.bandera} <b>${paisData.pais}:</b> ${paisData.titulos.length} news\n`;
  });
  
  message += `\n<b>NEWS ADDED TO THE RAG:</b>\n\n`;
  
  // Enviar message principal
  await enviarTelegram(message);
  
  // SEND TITLES PER COUNTRY (in separate messages to avoid limit)
  for (const paisData of titulosRecolectados) {
    if (paisData.titulos.length > 0) {
      let messagePais = `${paisData.bandera} <b>${paisData.pais.toUpperCase()}</b>\n\n`;
      
      paisData.titulos.forEach((noticia, index) => {
        messagePais += `${index + 1}. ${noticia.titulo}\n\n`;
      });
      
      // Split message if it is too long
      if (messagePais.length > 4000) {
        const messages = [];
        let messageActual = `${paisData.bandera} <b>${paisData.pais.toUpperCase()}</b>\n\n`;
        
        paisData.titulos.forEach((noticia, index) => {
          const linea = `${index + 1}. ${noticia.titulo}\n\n`;
          
          if (messageActual.length + linea.length > 4000) {
            messages.push(messageActual);
            messageActual = linea;
          } else {
            messageActual += linea;
          }
        });
        
        if (messageActual.trim()) {
          messages.push(messageActual);
        }
        
        // Send all split messages
        for (const msg of messages) {
          await enviarTelegram(msg);
          await esperar(1); // Avoid rate limit
        }
      } else {
        await enviarTelegram(messagePais);
      }
      
      await esperar(1);
    }
  }
  
  // FINAL MESSAGE
  const messageFinal = `<b>RAG FULLY UPDATED</b>\n\nEl sistema está listo para generar videos con las últimas news deportivas internacionales.`;
  await enviarTelegram(messageFinal);
}

// ===== EPIC MAIN FUNCTION =====
async function scraperRAGCompleto4Paises() {
  console.log('FOOTBALL RAG - FULL REPLACEMENT OF N8N');
  console.log('PROCESSING 4 COUNTRIES × 10 ARTICLES = 40 TOTAL');
  console.log('GOAL: ~120 VECTORS IN INTERNATIONAL RAG\n');
  console.log('='.repeat(70));
  
  const horaStart = new Date();
  console.log(`Start: ${horaStart.toLocaleTimeString()}`);
  
  // Clear titles array
  titulosRecolectados = [];
  
  // NOTIFY START
  await enviarTelegram(`<b>STARTING RAG UPDATE</b>\n\nStart: ${horaStart.toLocaleTimeString()}\nProcessing 4 countries...\n~40 sports articles`);
  
  // PASO 1: Limpiar base de data
  console.log('\nCLEANING DATABASE...');
  try {
    const { error } = await supabase.from('documents').delete().gt('id', 0);
    if (error) throw error;
    console.log('Database cleaned - ready for fresh data');
  } catch (error) {
    console.error('Error cleaning DB:', error.message);
  }
  
  await esperar(3);
  
  // STEP 2: Process the 4 countries
  const results = {};
  let vectoresTotales = 0;
  let articulosTotales = 0;
  let articulosSuccessfulsTotales = 0;
  
  for (let i = 0; i < fuentesRSS.length; i++) {
    const fuente = fuentesRSS[i];
    
    // Calcular números para tracking global
    const numerosPais = {
      inicio: articulosTotales + 1,
      vectorStart: vectoresTotales
    };
    
    console.log(`\nCOUNTRY ${i + 1}/4: ${fuente.bandera} ${fuente.pais.toUpperCase()}`);
    
    const result = await procesarPais(fuente, numerosPais);
    
    results[fuente.pais] = result;
    vectoresTotales += result.vectores;
    articulosTotales += result.articulos;
    articulosSuccessfulsTotales += result.successs;
    
    // Pausa entre countries (más larga para procesos grandes)
    if (i < fuentesRSS.length - 1) {
      console.log(`\nPAUSE BETWEEN COUNTRIES: Waiting 25 seconds...`);
      console.log(`Overall progress: ${articulosSuccessfulsTotales} successes | ${vectoresTotales} vectors`);
      await esperar(25);
    }
  }
  
  const horaFin = new Date();
  const tiempoTotal = Math.round((horaFin - horaStart) / 1000 / 60);
  
  console.log('\nEPIC PROCESS COMPLETED!');
  console.log('='.repeat(70));
  console.log(`Total Time: ${tiempoTotal} minutes`);
  console.log(`Countries processed: ${fuentesRSS.length}/4`);
  console.log(`Total articles: ${articulosTotales}/40`);
  console.log(`Articles successes: ${articulosSuccessfulsTotales}`);
  console.log(`Total vectors: ${vectoresTotales}`);
  console.log(`Success rate: ${((articulosSuccessfulsTotales/articulosTotales)*100).toFixed(1)}%`);
  console.log(`Average: ${(vectoresTotales/articulosSuccessfulsTotales).toFixed(1)} vectors/article`);
  
  console.log('\nBREAKDOWN BY COUNTRY:');
  Object.entries(results).forEach(([pais, result]) => {
    const fuente = fuentesRSS.find(f => f.pais === pais);
    console.log(`${fuente.bandera} ${pais}: ${result.successes}/${result.articulos} → ${result.vectors} vectors`);
  });
  
  console.log(`\nINTERNATIONAL RAG COMPLETE - READY FOR ADVANCED QUERIES`);
  
  
  // ENVIAR RESUMEN COMPLETO A TELEGRAM
  console.log('\nSending full summary to Telegram...');
  await enviarResumenTelegram(results, tiempoTotal, vectoresTotales);
  
  return {
    totalArticulos: articulosTotales,
    articulosSuccessfuls: articulosSuccessfulsTotales,
    totalVectores: vectoresTotales,
    tiempoMinutos: tiempoTotal,
    paises: results
  };
}

// EJECUTAR EL PROCESO ÉPICO
console.log('AI VIDEO GENERATOR');
console.log('Creating/updating RAG with international news articles');
console.log('New Zealand + Australia + United Kingdom + USA');
console.log(`Node version: ${process.version}`);
console.log(`Platform: ${process.platform}`);

// Verificar compatibilidad de Node.js
const nodeMajorVersion = parseInt(process.version.split('.')[0].substring(1));
if (nodeMajorVersion < 20) {
  console.error('WARNING: Node.js version is below 20. This may cause compatibility issues.');
  console.error('Recommended: Node.js v20 or higher');
  console.error('Current version:', process.version);
}

scraperRAGCompleto4Paises()
  .then((result) => {
    console.log(`\nLEGENDARY SUCCESS!`);
    console.log(`${result.articulosSuccessfuls} articles → ${result.totalVectors} vectors`);
    console.log(`Completed in ${result.tiempoMinutos} minutes`);
    console.log(`multi-country RAG operational`);
    console.log(`N8N OFFICIALLY REPLACED!`);
    console.log(`Summary sent to Telegram`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\nERROR:', error.message);
    console.error('Stack trace:', error.stack);
    
    // Diagnóstico específico para errores comunes
    if (error.message.includes('File is not defined')) {
      console.error('\nDIAGNOSTIC: This error is caused by incompatible Node.js version');
      console.error('SOLUTION: Update to Node.js v20 or higher');
      console.error('Current version:', process.version);
    } else if (error.message.includes('fetch')) {
      console.error('\nDIAGNOSTIC: Fetch API error - check network connection');
    } else if (error.message.includes('SUPABASE')) {
      console.error('\nDIAGNOSTIC: Supabase connection error - check credentials');
    }
    
    process.exit(1);
  });