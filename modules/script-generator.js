const { createClient } = require("@supabase/supabase-js");
const OpenAI = require("openai");

// Configuration
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

console.log("🤖 SCRIPT GENERATOR INITIALIZED");

// Function RAG para buscar en la base de data usando búsqueda semántica inteligente
async function queryrRAG(query) {
  try {
    console.log(`🔍 [RAG] Intelligent semantic search for: "${query}"`);

    // PASO 1: Usar IA para expandir y entender el contexto de la query
    const contextualQuery = await expandQueryWithAI(query);
    console.log(`🧠 [RAG] AI understood query as: "${contextualQuery}"`);

    // PASO 2: Búsqueda semántica usando vectores
    let semanticResults = [];
    try {
      const embedding = await generateEmbedding(contextualQuery);

      // Llamar función de similitud en Supabase
      const { data: vectorResults, error: vectorError } = await supabase.rpc(
        "match_documents",
        {
          query_embedding: embedding,
          match_threshold: 0.2, // Umbral más bajo para más resultados
          match_count: 10,
        }
      );

      if (!vectorError && vectorResults && vectorResults.length > 0) {
        semanticResults = vectorResults;
        console.log(
          `✅ [RAG] Semantic search found ${semanticResults.length} relevant documents`
        );
      }
    } catch (embeddingError) {
      console.error(
        "❌ [RAG] Embedding search failed:",
        embeddingError.message
      );
    }

    // PASO 3: Si búsqueda semántica falla, usar búsqueda inteligente por texto
    if (semanticResults.length === 0) {
      console.log(`🔄 [RAG] Falling back to intelligent text search...`);
      semanticResults = await intelligentTextSearch(contextualQuery, query);
    }

    // PASO 4: Usar IA para seleccionar los mejores resultados
    if (semanticResults.length > 0) {
      const bestResults = await selectBestResults(query, semanticResults);

      if (bestResults.length > 0) {
        const topResult = bestResults[0];
        console.log(
          `🏆 [RAG] Best match: "${
            topResult?.metadata?.title || topResult?.title
          }" (relevance: ${topResult?.similarity?.toFixed(3) || "high"})`
        );
        console.log(
          `📄 [RAG] Content preview: "${(topResult?.content || "").substring(
            0,
            200
          )}..."`
        );

        return bestResults.slice(0, 3); // Máximo 3 resultados más relevantes
      }
    }

    console.log(`⚠️ [RAG] No relevant documents found for query: "${query}"`);
    return [];
  } catch (error) {
    console.error("❌ [RAG] General error:", error.message);
    return [];
  }
}

// Función para expandir query usando IA para entender contexto
async function expandQueryWithAI(query) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Expande esta consulta de noticias con términos relacionados. Ejemplos: "Hamas" → "Hamas Gaza Israel Palestinian conflict", "Netanyahu" → "Netanyahu Israel Prime Minister politics". Solo responde la query expandida.`,
        },
        {
          role: "user",
          content: query,
        },
      ],
      max_completion_tokens: 80,
      temperature: 0.2,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("❌ [RAG] Error expanding query:", error.message);
    return query;
  }
}

// Función para generar embedding del texto
async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text,
  });
  return response.data[0].embedding;
}

// Función de búsqueda inteligente por texto (fallback)
async function intelligentTextSearch(expandedQuery, originalQuery) {
  try {
    console.log(
      `🔍 [RAG] Using intelligent text search for: "${expandedQuery}"`
    );

    // Extraer términos importantes del query expandido
    const terms = expandedQuery
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(" ")
      .filter((word) => word.length > 2)
      .filter(
        (word) =>
          ![
            "the",
            "and",
            "for",
            "are",
            "but",
            "not",
            "you",
            "all",
            "can",
            "had",
            "her",
            "was",
            "one",
            "our",
            "out",
            "day",
            "get",
            "has",
            "him",
            "his",
            "how",
            "man",
            "new",
            "now",
            "old",
            "see",
            "two",
            "way",
            "who",
            "boy",
            "did",
            "its",
            "let",
            "put",
            "say",
            "she",
            "too",
            "use",
            "give",
            "news",
            "about",
            "tell",
            "what",
            "dame",
            "noticias",
            "sobre",
          ].includes(word)
      );

    let allResults = [];

    // Buscar por términos más importantes primero
    const importantTerms = terms.slice(0, 5); // Los primeros 5 términos más relevantes

    for (const term of importantTerms) {
      console.log(`🔍 [RAG] Searching for term: "${term}"`);

      const { data, error } = await supabase
        .from("documents")
        .select("content, metadata")
        .or(`content.ilike.%${term}%,metadata->>title.ilike.%${term}%`)
        .limit(5);

      if (!error && data && data.length > 0) {
        allResults.push(...data);
        console.log(`📄 [RAG] Found ${data.length} docs for "${term}"`);
      }
    }

    // Eliminar duplicados
    const uniqueResults = allResults.filter(
      (doc, index, self) =>
        index === self.findIndex((d) => d.content === doc.content)
    );

    console.log(
      `✅ [RAG] Text search found ${uniqueResults.length} unique documents`
    );
    return uniqueResults.slice(0, 10);
  } catch (error) {
    console.error("❌ [RAG] Intelligent text search error:", error.message);
    return [];
  }
}

// Función para seleccionar los mejores resultados usando IA
async function selectBestResults(originalQuery, results) {
  try {
    if (results.length <= 1) return results;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Selecciona los artículos más relevantes para la consulta. Responde solo números separados por comas (ej: "1,3"). Máximo 3. Si ninguno es relevante, responde "0".`,
        },
        {
          role: "user",
          content: `Consulta del usuario: "${originalQuery}"

Artículos disponibles:
${results
  .map(
    (doc, index) =>
      `${index + 1}. Título: ${doc.metadata?.title || doc.title || "Sin título"}
Contenido: ${(doc.content || "").substring(0, 300)}...
${doc.metadata?.country ? `País: ${doc.metadata.country}` : ""}
---`
  )
  .join("\n")}`,
        },
      ],
      max_completion_tokens: 50,
      temperature: 0.1,
    });

    const selection = response.choices[0].message.content.trim();
    console.log(`🤖 [RAG] AI selected articles: ${selection}`);

    if (selection === "0") {
      console.log(`⚠️ [RAG] AI found no relevant articles`);
      return [];
    }

    const selectedIndices = selection
      .split(",")
      .map((num) => parseInt(num.trim()) - 1)
      .filter((index) => index >= 0 && index < results.length);

    const selectedResults = selectedIndices.map((index) => results[index]);
    console.log(
      `✅ [RAG] AI selected ${selectedResults.length} relevant articles`
    );

    return selectedResults;
  } catch (error) {
    console.error("❌ [RAG] Error selecting best results:", error.message);
    // Fallback: devolver los primeros 3 resultados
    return results.slice(0, 3);
  }
}

// Function para generar script con IA REAL + RAG
async function generarScript(query, sessionId) {
  try {
    console.log(`🤖 [${sessionId}] Starting generación con IA + RAG`);

    // PASO 1: Queryr RAG
    const documents = await queryrRAG(query);

    // Crear documentsUnicos para uso posterior
    const documentsUnicos = documents.filter(
      (doc, index, self) =>
        index === self.findIndex((d) => d.content === doc.content)
    );

    if (documentsUnicos.length === 0) {
      console.log(`❌ [${sessionId}] No hay documents en RAG`);
      return {
        script: `Sorry, we don’t have news on ${query} at the moment. Stay tuned.`,
        encontrado: false,
        palabras: 11,
      };
    }

    // PASO 2: Preparar contexto para IA
    const contextoRAG = documentsUnicos
      .map((doc, index) => {
        const metadata = doc.metadata || {};
        return `DOCUMENTO ${index + 1}:
TÍTULO: ${metadata.title || "Sin título"}
PAÍS: ${metadata.pais || "Sin país"}
FECHA: ${metadata.pubDate || "Sin fecha"}
CONTENIDO: ${doc.content}
---`;
      })
      .join("\n\n");

    // PASO 3: ULTRA-STRICT English Prompt for 20-Second Videos
    const promptOptimizado = `You are a professional news presenter. Create a script of EXACTLY 65-70 words for 20-second videos with 2-second silence padding.

⏱️ CRITICAL TIMING CONSTRAINT: MAXIMUM 16 seconds of speech (20 seconds total - 4 seconds silence)
📏 WORD LIMIT: 65-70 words MAXIMUM (4.3 words per second average)

CRITICAL: USE ONLY THE PROVIDED NEWS DATA BELOW. Topic: "${query}".

MANDATORY STRUCTURE (65-70 words total):
🎣 HOOK (0-3 seconds): 12-15 words
Fast impact opening with exclamation
✓ Main subject from database only
✓ HIGH-ENERGY words: BREAKING!, EXCLUSIVE!, URGENT!

📰 CORE (3-13 seconds): 40-45 words  
✓ Essential facts from database only
✓ Key details, numbers, locations from provided data
✓ NO speculation or added information
✓ Direct, concise reporting

💬 CTA (13-16 seconds): 10-12 words
✓ Quick engagement question
✓ NO EMOJIS AT ALL - Text only
✓ Brief and punchy

🔥 EXAMPLES (65-70 words each):

EXAMPLE 1 - Political (68 words):
"BREAKING! President announces major immigration policy shift affecting millions nationwide. The administration revealed comprehensive reform including pathway to citizenship for undocumented workers and expanded visa programs. Congressional leaders expressed mixed reactions while advocacy groups celebrate the historic decision as breakthrough legislation. What's your take on this policy change?"

EXAMPLE 2 - International (67 words):
"URGENT! Peace negotiations reach critical breakthrough in ongoing conflict zone today. Diplomatic sources confirm ceasefire agreement after six months of intensive talks between warring factions. International observers will monitor implementation while humanitarian aid reaches affected populations immediately through secured corridors. Will this bring lasting peace to the region?"

⚠️ CRITICAL RULES - ZERO TOLERANCE:

🕐 TIMING: EXACTLY 16 seconds speaking time (65-70 words)
📊 COUNT: Manually verify word count before responding  
📝 DATA: ONLY provided database information - NO additions
🎯 FOCUS: Stick to requested topic "${query}" exclusively
⚡ SPEED: 4.3 words per second maximum speaking rate
🔒 STRUCTURE: Hook + Core + CTA - NO deviations
❌ FORBIDDEN: Speculation, assumptions, external knowledge
🚫 NO EMOJIS: Use only plain text - NO emojis anywhere

AUDIO WILL HAVE: 2-second silence START + 16-second speech + 2-second silence END = 20 seconds total

QUERY: ${query}

AVAILABLE NEWS DATA (USE THIS INFORMATION ONLY):
${contextoRAG.substring(0, 3000)}

CRITICAL: Create a news script using ONLY the information provided above about "${query}". If the data doesn't contain relevant information about "${query}", say so clearly.

RESPOND ONLY THE SCRIPT:`;

    // PASO 4: Llamar a OpenAI
    console.log(`🤖 [${sessionId}] Sending to GPT-4...`);

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // <- usa gpt-4o
      messages: [
        {
          role: "system",
          content: `You are PulseWire Anchor, a gender-neutral, high-energy, credible breaking-news presenter delivering urgent international updates in English, tailored for Instagram Reels.`,
        },
        {
          role: "user",
          content: `
🎯 YOUR MISSION
Turn verified news from the database only into a spoken script of EXACTLY 75 to 80 words for voiceover/Reels. If the database lacks info, use the fallback line. Never invent or assume details.

🎙 TONE & STYLE
- Breaking urgency, social-first cadence, short sentences, present tense
- Clear, responsible wording; no speculation or clickbait claims
- Optional: ONE emoji if truly additive; no hashtags

📋 REQUIRED STRUCTURE (75–80 words total)
1) HOOK (0–3s / 15–20 words)
   - High-impact openers: "BREAKING!", "DEVELOPING!", "MAJOR UPDATE!"
   - Name the main event/person/place; why it matters now
   - Build curiosity (e.g., "What we know—fast.")

2) CORE (3–17s / 45–55 words)
   - ONLY details in the database:
     - Who/what/where/when/how; figures, locations, dates, officials, quotes
     - Immediate impact or relevance (markets, safety, travel, policy) if present
   - Professional, chronological, concise
   - No time claims ("minutes ago") unless explicitly in database

3) CTA (18–20s / 5 words)
   - Must be a question or invite to comment (engagement-focused), e.g.:
     - "Your take? Comment below now."
     - "What happened? Join comments below."
     - "Should leaders act now? Discuss."

📛 DO NOT
- Invent data, context, or timelines
- Infer beyond database facts
- Reuse past stories not in the database

✅ IF NEWS EXISTS
Produce the script exactly as Hook + Core + CTA (one of each, no repeats).

🚫 IF NO DATABASE INFO
Respond exactly:
"Sorry, we don’t have news on [topic] at the moment. Stay tuned."

📌 CRITICAL RULES
- WORD COUNT: 75–80 words exactly
- DURATION: Under 20 seconds
- PRECISION: Database facts only
- FORMAT: Single Hook + Core + CTA

OUTPUT
Only the final narrated script text; no headings or explanations.

TOPIC: ${query}

AVAILABLE NEWS DATA (USE THIS INFORMATION ONLY):
${contextoRAG.substring(0, 3000)}
`,
        },
      ],
      max_completion_tokens: 220,
      temperature: 0.5,
    });

    let script = response.choices[0].message.content.trim();
    // Remove any potential emoji leftovers defensively
    try {
      script = script.replace(/\p{Extended_Pictographic}/gu, "");
    } catch {}
    const palabras = script.split(" ").length;

    // Validar límite estricto de palabras
    if (palabras > 80) {
      const palabrasArray = script.split(" ");
      script = palabrasArray.slice(0, 80).join(" ");
      console.log(`[${sessionId}] Clipped script to 80 words`);
    }

    // If still slightly long, clip to 62 words to ensure <=20s
    if (palabras < 75) {
      console.log(
        `[${sessionId}] Script under 75 words (${palabras}). Returning as-is (model should hit 75–80).`
      );
    }

    console.log(`[${sessionId}] Script generated: ${palabras} words`);
    console.log(`[${sessionId}] Preview: "${script.substring(0, 100)}..."`);

    return {
      script: script,
      encontrado: true,
      palabras: palabras,
      duracionEstimada: 20, // Fijo a 20 segundos (16 speech + 4 silence)
      documents: documentsUnicos.length,
      fuentes: documentsUnicos.map((doc) => ({
        titulo: doc.metadata?.title,
        pais: doc.metadata?.country,
      })),
    };
  } catch (error) {
    console.error(`❌ [${sessionId}] Error IA:`, error.message);

    // Fallback to basic script in English
    return {
      script: `Hi Everyone! Latest developments on ${query}. Key figures are making strategic moves that keep the entire international community watching closely. This information promises to mark a turning point in current affairs. What's your opinion on these developments? 🌍`,
      encontrado: false,
      palabras: 48,
      error: error.message,
    };
  }
}

// Exportar funciones
module.exports = {
  generarScript,
  queryrRAG,
};
