// modules/image-processor.js
// -------- IMAGE PIPELINE (Predefined or Custom -> Optional "Influencer" Transform -> Hedra Asset) --------
// Preserves your feature flag ENABLE_INFLUENCER and adds a robust fallback:
// 1) Gemini "Nano Banana" (if GOOGLE_AI_API_KEY present)
// 2) OpenAI gpt-image-1 (images edits) identity-preserving fallback when Gemini is not available or fails
// Exports: procesarImage, cargarImage, cargarFotoPersonalizada, transformarAInfluencer, crearImageAsset, subirImageFile, verificarImagenesDisponibles

const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs").promises;
const fsSync = require("fs"); // for createReadStream if needed
const path = require("path");
const OpenAI = require("openai");
const { GoogleGenAI } = require("@google/genai");

// ====== ENV ======
const HEDRA_API_KEY = process.env.HEDRA_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY;

// ====== CLIENTS ======
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;
let ai = null;
if (GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
}

// ====== FEATURE FLAG ======
const ENABLE_INFLUENCER =
  String(process.env.ENABLE_INFLUENCER_TRANSFORM || "false").toLowerCase() ===
  "true";

console.log("📸 IMAGE PROCESSOR INITIALIZED");
console.log(
  `🍌 Gemini Nano Banana: ${GEMINI_API_KEY ? "READY ✅" : "NOT CONFIGURED ❌"}`
);
console.log(
  `🎨 Influencer Transform: ${ENABLE_INFLUENCER ? "ENABLED ✅" : "DISABLED ❌"}`
);

// ====== HELPERS ======
function getMimeFromPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

async function readBuffer(filePath) {
  const buf = await fs.readFile(filePath);
  return { buffer: buf, sizeKB: (buf.length / 1024).toFixed(2) };
}

// ====== PREDEFINED (SOFIA) ======
async function cargarImage(imageName, sessionId) {
  try {
    console.log(`📸 [${sessionId}] Loading predefined image: ${imageName}`);
    const imagePath = path.join("images", `${imageName}.png`);
    await fs.access(imagePath); // throws if not found
    const { buffer, sizeKB } = await readBuffer(imagePath);
    console.log(
      `✅ [${sessionId}] Predefined image loaded: ${imagePath} (${sizeKB} KB)`
    );
    return {
      buffer,
      name: imageName,
      archivo: imagePath,
      tamaño: `${sizeKB} KB`,
      type: "predefined",
    };
  } catch (err) {
    console.error(
      `❌ [${sessionId}] Error loading predefined image: ${err.message}`
    );
    throw new Error(`Error loading image: ${err.message}`);
  }
}

// ====== CUSTOM PHOTO ======
async function cargarFotoPersonalizada(imagePath, sessionId) {
  try {
    console.log(`📸 [${sessionId}] Loading custom photo: ${imagePath}`);
    await fs.access(imagePath); // throws if not found
    const { buffer, sizeKB } = await readBuffer(imagePath);
    const fileName = path.basename(imagePath);
    console.log(
      `✅ [${sessionId}] Custom photo loaded: ${fileName} (${sizeKB} KB)`
    );
    return {
      buffer,
      name: fileName,
      archivo: imagePath,
      tamaño: `${sizeKB} KB`,
      type: "custom",
    };
  } catch (err) {
    console.error(
      `❌ [${sessionId}] Error loading custom photo: ${err.message}`
    );
    throw new Error(`Error loading custom photo: ${err.message}`);
  }
}

// ====== TRANSFORM: GEMINI (Primary) ======
async function transformWithGemini(imagePath, sessionId) {
  if (!ai) throw new Error("Gemini client not initialized");

  console.log(
    `🍌 [${sessionId}] Using Gemini 2.5 Flash Image (Nano Banana) for transformation...`
  );

  const { buffer } = await readBuffer(imagePath);
  const base64Image = buffer.toString("base64");
  const mimeType = getMimeFromPath(imagePath);

  const influencerPrompt = `
Task: Transform the provided portrait into a professional news/podcast host.

HARD CONSTRAINTS:
- Preserve the person's exact identity: same face, features, skin tone, age, hairstyle/facial hair exactly as source.
- Gender-neutral handling: do NOT change perceived gender; keep all inherent traits as in the original portrait.
- Exact dimensions: 1080x1920 pixels (vertical 9:16 format). Medium close-up (shoulders to top of head), eyeline near upper third.
- Broadcast microphone visible to one side (not blocking the mouth).
- Photorealistic, cinematic look, warm natural colors, gentle bokeh newsroom OR cozy studio background (brand-neutral).

WARDROBE VARIATION (pick ONE unisex outfit at random per generation; change ONLY clothing/accessories, never identity):
A) Crisp open-collar shirt (white/light blue) + textured blazer (grey) + minimal lapel pin.
B) Minimalist top (cream/ivory) + soft-shoulder blazer (camel) + simple watch.
C) Monochrome suit (mid-grey) + crew-neck knit (black) + discreet lapel mic.
D) Powder-blue shirt + V-neck sweater (navy) + midnight blazer; no patterns.
E) Black satin-lapel blazer + silk/satin top (ivory) + delicate chain or no jewelry.

STYLING RULES:
- Unisex, timeless elegance; no bold patterns, no logos, no hats/caps.
- Grooming/makeup: OPTIONAL and subtle; maintain original hairline, color, texture, facial hair if present.
- Expression: confident, approachable; micro-smile allowed.

LIGHTING & CAMERA:
- Key light at ~45°, soft fill, subtle rim/hair light; natural skin tone retention.
- Slight angle variation allowed; clean headroom for lower-third graphics.
- Shallow depth of field; background softly lit (amber/steel-blue accents).

NEGATIVE GUIDANCE:
- Do not alter face shape, age, skin tone, hair color/length, or body type.
- Do not feminize/masculinize features; no contouring that changes identity.
- No duplicate people, no text/watermarks, no props blocking the mouth.
- No 16:9 or 3:2—strict 1080x1920 (9:16) only.

OUTPUT:
One photorealistic vertical 1080x1920 (9:16) image of the SAME person as an elegant, professional news/podcast host, with wardrobe changed per the selected outfit and everything else preserved.
`.trim();

  const contents = [
    { inlineData: { data: base64Image, mimeType } },
    influencerPrompt,
  ];

  // The gemini SDK returns candidates with inlineData for image outputs
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image-preview",
    contents,
  });

  const data =
    response?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ||
    response?.candidates?.[0]?.content?.parts?.find((p) => p?.inlineData?.data)
      ?.inlineData?.data;

  if (!data) {
    throw new Error("Gemini returned no image data");
  }

  const transformedBuffer = Buffer.from(data, "base64");

  const modifiedDir = path.join("images", "modified");
  await fs.mkdir(modifiedDir, { recursive: true });
  const timestamp = Date.now();
  const transformedPath = path.join(modifiedDir, `influencer_${timestamp}.jpg`);
  await fs.writeFile(transformedPath, transformedBuffer);

  const sizeKB = (transformedBuffer.length / 1024).toFixed(2);
  console.log(
    `✅ [${sessionId}] Gemini result saved: ${transformedPath} (${sizeKB} KB)`
  );

  return {
    transformedBuffer,
    transformedPath,
    type: "influencer_gemini_nano_banana",
    tamaño: `${sizeKB} KB`,
  };
}

// ====== TRANSFORM: OPENAI (Fallback) ======
async function transformWithOpenAI(imagePath, sessionId) {
  if (!OPENAI_API_KEY || !openai) throw new Error("OpenAI not configured");

  console.log(
    `🖌️ [${sessionId}] Fallback to OpenAI gpt-image-1 (image edit) ...`
  );

  // --- Prompt tuned for identity-preserving vertical 9:16 influencer/newscaster look ---
  const influencerPrompt = `
Goal: Transform the provided portrait into a professional news/podcast host.

HARD CONSTRAINTS:
- Preserve the person's exact identity: same face, features, skin tone, age, hairstyle/facial hair.
- Preserve original gender presentation; do not masculinize/feminize or change body type.
- Exact dimensions: 1080x1920 pixels (vertical 9:16 format). Medium close-up (shoulders to head), eye level, eyes near upper third.
- Broadcast microphone visible to the side, never blocking the mouth.
- Photorealistic, cinematic, warm natural color grade; natural skin texture.

SET & BACKGROUND:
- Subtle bokeh newsroom OR cozy studio OR minimalist tech set. Brand-neutral, no text/logos.

WARDROBE (change clothing ONLY; pick ONE per generation, unisex, elegant):
1) Open-collar shirt (white/light blue) + textured blazer (grey/black/navy).
2) Minimalist top (ivory/cream) + camel blazer + simple watch.
3) Monochrome suit (mid-grey) + black crew-neck knit + discreet lapel mic.
4) Powder-blue shirt + navy V-neck sweater + midnight blazer.
5) Black satin-lapel blazer + ivory silk/satin top.

LIGHTING & CAMERA:
- 45° soft key, gentle fill, subtle hair/rim; shallow depth; clean headroom for lower-third.

NEGATIVE GUIDANCE:
- Do not alter face shape, age, skin tone, hair color/length; no gender changes.
- No hats/caps, no bold patterns, no large jewelry, no logos, no text/watermarks.
- No 16:9 or 3:2; enforce 1080x1920 (9:16) only.

OUTPUT:
One photorealistic vertical 1080x1920 (9:16) image of the SAME person as an elegant news/podcast host, with wardrobe varied as selected and identity fully preserved.
`.trim();

  // Use OpenAI Images Edit (multipart form-data)
  const form = new FormData();
  form.append("model", "gpt-image-1");
  form.append("prompt", influencerPrompt);
  form.append("image", fsSync.createReadStream(imagePath)); // full-scene restyle, no mask

  const resp = await axios.post(
    "https://api.openai.com/v1/images/edits",
    form,
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        ...form.getHeaders(),
      },
      timeout: 120000,
    }
  );

  const b64 =
    resp?.data?.data?.[0]?.b64_json ||
    (Array.isArray(resp?.data?.data) && resp.data.data.length > 0
      ? resp.data.data[0].b64_json
      : null);

  if (!b64) throw new Error("OpenAI image edit returned no data");

  const transformedBuffer = Buffer.from(b64, "base64");

  const modifiedDir = path.join("images", "modified");
  await fs.mkdir(modifiedDir, { recursive: true });
  const timestamp = Date.now();
  const transformedPath = path.join(modifiedDir, `influencer_${timestamp}.png`);
  await fs.writeFile(transformedPath, transformedBuffer);

  const sizeKB = (transformedBuffer.length / 1024).toFixed(2);
  console.log(
    `✅ [${sessionId}] OpenAI result saved: ${transformedPath} (${sizeKB} KB)`
  );

  return {
    transformedBuffer,
    transformedPath,
    type: "influencer_openai_edit",
    tamaño: `${sizeKB} KB`,
  };
}

// ====== PUBLIC TRANSFORM (tries Gemini, falls back to OpenAI, else original) ======
async function transformarAInfluencer(imagePath, sessionId) {
  try {
    // Try Gemini first if configured
    if (GEMINI_API_KEY && ai) {
      return await transformWithGemini(imagePath, sessionId);
    }
    // Otherwise fallback to OpenAI
    if (OPENAI_API_KEY && openai) {
      return await transformWithOpenAI(imagePath, sessionId);
    }
    throw new Error("No image transformation provider configured");
  } catch (error) {
    console.error(
      `❌ [${sessionId}] Influencer transform failed: ${error.message}`
    );
    // Fallback to original
    const { buffer } = await readBuffer(imagePath);
    return {
      transformedBuffer: buffer,
      transformedPath: imagePath,
      type: "original_fallback",
      tamaño: (buffer.length / 1024).toFixed(2) + " KB",
      error: error.message,
    };
  }
}

// ====== HEDRA ASSET ======
async function crearImageAsset(imageBuffer, imageName, sessionId) {
  try {
    console.log(`🎬 [${sessionId}] Creating image asset in Hedra...`);
    const imageBase64 = imageBuffer.toString("base64");

    const response = await axios.post(
      "https://api.hedra.com/web-app/public/assets",
      {
        name: `${imageName}.png`,
        type: "image",
        data: imageBase64,
      },
      {
        headers: {
          "X-Api-Key": HEDRA_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 120000,
      }
    );

    const imageAssetId = response?.data?.id || response?.data?.asset?.id;
    if (!imageAssetId)
      throw new Error("Hedra did not return an image asset id");

    console.log(`✅ [${sessionId}] Image asset created: ${imageAssetId}`);
    return { id: imageAssetId, type: "image", name: `${imageName}.png` };
  } catch (error) {
    console.error(
      `❌ [${sessionId}] Error creating image asset: ${
        error.response?.status || error.message
      }`
    );
    throw new Error(`Error creating image asset: ${error.message}`);
  }
}

async function subirImageFile(imageBuffer, imageAssetId, imageName, sessionId) {
  try {
    console.log(`📤 [${sessionId}] Uploading image file to Hedra...`);
    const formData = new FormData();
    formData.append("file", imageBuffer, {
      filename: `${imageName}.png`,
      contentType: "image/png",
    });

    const response = await axios.post(
      `https://api.hedra.com/web-app/public/assets/${imageAssetId}/upload`,
      formData,
      {
        headers: {
          "X-Api-Key": HEDRA_API_KEY,
          ...formData.getHeaders(),
        },
        timeout: 120000,
      }
    );

    console.log(`✅ [${sessionId}] Image file uploaded`);
    return {
      id: imageAssetId,
      type: "image",
      uploaded: true,
      asset: response.data,
    };
  } catch (error) {
    console.error(
      `❌ [${sessionId}] Error uploading image file: ${
        error.response?.status || error.message
      }`
    );
    throw new Error(`Error uploading image file: ${error.message}`);
  }
}

// ====== MAIN: procesa imagen (predefined or custom) + optional transform + Hedra ======
async function procesarImage(imageInput, sessionId) {
  try {
    console.log(`📸 [${sessionId}] Starting complete image processing...`);
    console.log(
      `🔍 [${sessionId}] DEBUG - imageInput: "${imageInput}" (type: ${typeof imageInput})`
    );

    let imageData;
    let finalImageBuffer;
    let finalImagePath;

    const looksLikeCustom =
      typeof imageInput === "string" &&
      (imageInput.includes("uploads") ||
        imageInput.includes("photo_") ||
        imageInput.includes("\\") ||
        imageInput.includes("/"));

    if (looksLikeCustom) {
      // Custom photo flow
      console.log(`🖼️ [${sessionId}] Detected CUSTOM PHOTO: ${imageInput}`);
      imageData = await cargarFotoPersonalizada(imageInput, sessionId);

      if (ENABLE_INFLUENCER) {
        console.log(`🎨 [${sessionId}] Influencer transform ENABLED`);
        const result = await transformarAInfluencer(
          imageData.archivo,
          sessionId
        );

        if (
          result?.transformedBuffer &&
          result?.transformedPath &&
          result?.type?.startsWith("influencer_")
        ) {
          console.log(`✅ [${sessionId}] Transformation OK (${result.type})`);
          finalImageBuffer = result.transformedBuffer;
          finalImagePath = result.transformedPath;
          imageData.dalleTransformation = {
            original: imageInput,
            transformed: finalImagePath,
            provider: result.type,
            status: "ok",
            error: null,
          };
        } else {
          console.log(`⚠️ [${sessionId}] Transformation fallback to original`);
          finalImageBuffer = imageData.buffer;
          finalImagePath = imageData.archivo;
          imageData.dalleTransformation = {
            original: imageInput,
            transformed: imageInput,
            provider: result?.type || "none",
            status: "fallback_original",
            error: result?.error || "Unknown transformation error",
          };
        }
      } else {
        console.log(`ℹ️ [${sessionId}] Influencer transform DISABLED (flag)`);
        finalImageBuffer = imageData.buffer;
        finalImagePath = imageData.archivo;
        imageData.dalleTransformation = {
          original: imageInput,
          transformed: imageInput,
          provider: "disabled_by_flag",
          status: "disabled_by_flag",
          error: null,
        };
      }
    } else {
      // Predefined SOFIA
      console.log(`👩 [${sessionId}] Detected PREDEFINED SOFIA: ${imageInput}`);
      imageData = await cargarImage(imageInput, sessionId);
      finalImageBuffer = imageData.buffer;
      finalImagePath = imageData.archivo;
      // no transform for predefined
    }

    // Hedra: create + upload
    const baseName =
      imageData.type === "custom" ||
      (imageData.dalleTransformation &&
        imageData.dalleTransformation.status === "ok")
        ? path.parse(path.basename(finalImagePath)).name
        : imageInput;

    const imageAsset = await crearImageAsset(
      finalImageBuffer,
      baseName,
      sessionId
    );
    const imageUpload = await subirImageFile(
      finalImageBuffer,
      imageAsset.id,
      baseName,
      sessionId
    );

    console.log(
      `✅ [${sessionId}] Image processed for Hedra: ${imageUpload.id}`
    );
    console.log(
      `📋 [${sessionId}] Image type: ${String(
        imageData.type || ""
      ).toUpperCase()}`
    );

    return {
      // Local info
      name: imageData.name,
      archivo: imageData.archivo, // original path
      finalImagePath: finalImagePath, // transformed path if any
      tamaño: imageData.tamaño,
      type: imageData.type,

      // Transform info
      dalleTransformation: imageData.dalleTransformation || null,

      // Hedra info
      imageAssetId: imageUpload.id,
      hedraMetadata: imageAsset,
      hedraUpload: imageUpload,

      // Buffer for later stage
      buffer: finalImageBuffer,
    };
  } catch (error) {
    console.error(`❌ [${sessionId}] Error in image process: ${error.message}`);
    throw error;
  }
}

// ====== LIST AVAILABLE PREDEFINED IMAGES ======
async function verificarImagenesDisponibles() {
  try {
    const imagesDir = "images";
    const archivos = await fs.readdir(imagesDir);
    const disponibles = archivos
      .filter((a) => a.toLowerCase().endsWith(".png"))
      .map((a) => a.replace(/\.png$/i, ""));
    console.log(`📸 Available predefined images: ${disponibles.join(", ")}`);
    return disponibles;
  } catch (error) {
    console.error("❌ Error checking images:", error.message);
    return [];
  }
}

// Backward-compat alias (if any part of UI calls the old name)
const verificarImageesDisponibles = verificarImagenesDisponibles;

// ====== EXPORTS ======
module.exports = {
  procesarImage,
  cargarImage,
  cargarFotoPersonalizada,
  transformarAInfluencer,
  crearImageAsset,
  subirImageFile,
  verificarImagenesDisponibles,
  verificarImageesDisponibles, // alias for compatibility
};
