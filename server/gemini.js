import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { getUploadRoot } from './storage.js';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('GEMINI_API_KEY is required to start the API server.');
}

const ai = new GoogleGenAI({ apiKey });
const pdddApiUrl = process.env.PDDD_API_URL || 'http://localhost:8001';
const extensionToMimeType = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: 'A concise paragraph explaining the plant analysis.',
    },
    isPlant: { type: Type.BOOLEAN },
    confidence: { type: Type.NUMBER },
    species: { type: Type.STRING },
    commonName: { type: Type.STRING },
    health: {
      type: Type.STRING,
      enum: ['Healthy', 'Stressed', 'Unhealthy', 'Unknown'],
    },
    height: { type: Type.STRING },
    width: { type: Type.STRING },
    disease: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        severity: { type: Type.STRING },
        recommendations: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
    },
    advice: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
        },
        required: ['title', 'description'],
      },
    },
  },
  required: ['summary', 'isPlant', 'confidence', 'health', 'advice'],
};

const plantGateSchema = {
  type: Type.OBJECT,
  properties: {
    isPlant: { type: Type.BOOLEAN },
    confidence: { type: Type.NUMBER },
    reason: { type: Type.STRING },
  },
  required: ['isPlant', 'confidence'],
};

const parseGeminiText = (result) => {
  if (typeof result?.text === 'function') {
    return result.text().trim();
  }

  if (typeof result?.response?.text === 'function') {
    return result.response.text().trim();
  }

  if (typeof result?.text === 'string') {
    return result.text.trim();
  }

  throw new Error('Unexpected Gemini response format.');
};

const createFallbackAnalysis = () => ({
  isPlant: false,
  confidence: 0,
  plantGateSource: 'other',
  species: null,
  commonName: null,
  health: 'Unknown',
  height: null,
  width: null,
  disease: null,
  advice: [],
});

const normalizeMeasurement = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || /^(n\/a|na|unknown|null|not visible)$/i.test(trimmed)) return null;
  return trimmed;
};

const inferDimensionFallback = (analysis) => {
  const descriptor = `${analysis.commonName || ''} ${analysis.species || ''}`.toLowerCase();

  const ranges = [
    { terms: ['monstera'], height: '45-90 cm', width: '35-75 cm' },
    { terms: ['pothos', 'epipremnum'], height: '20-40 cm', width: '20-60 cm' },
    { terms: ['philodendron'], height: '25-60 cm', width: '20-55 cm' },
    { terms: ['snake plant', 'sansevieria', 'dracaena trifasciata'], height: '30-80 cm', width: '15-35 cm' },
    { terms: ['spider plant', 'chlorophytum'], height: '20-35 cm', width: '30-55 cm' },
    { terms: ['zz plant', 'zamioculcas'], height: '35-70 cm', width: '25-45 cm' },
    { terms: ['fern'], height: '20-45 cm', width: '25-50 cm' },
    { terms: ['calathea', 'prayer plant', 'maranta'], height: '20-40 cm', width: '25-45 cm' },
    { terms: ['ficus', 'rubber plant'], height: '45-100 cm', width: '30-70 cm' },
    { terms: ['orchid', 'phalaenopsis'], height: '25-55 cm', width: '18-30 cm' },
    { terms: ['aloe', 'succulent'], height: '12-28 cm', width: '12-25 cm' },
  ];

  const matched = ranges.find((range) => range.terms.some((term) => descriptor.includes(term)));
  if (matched) {
    return {
      height: matched.height,
      width: matched.width,
    };
  }

  return {
    height: '20-45 cm',
    width: '18-40 cm',
  };
};

const normalizeAnalysis = (analysis) => {
  if (!analysis?.isPlant) {
    return analysis;
  }

  const fallback = inferDimensionFallback(analysis);

  return {
    ...analysis,
    height: normalizeMeasurement(analysis.height) || fallback.height,
    width: normalizeMeasurement(analysis.width) || fallback.width,
  };
};

const runPdddAnalysis = async (imageData) => {
  const response = await fetch(`${pdddApiUrl}/pddd/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(imageData),
  });

  if (!response.ok) {
    throw new Error(`PDDD API error: ${response.status}`);
  }

  return response.json();
};

export const dataUrlToInlineData = (imageDataUrl) => {
  const match = imageDataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid image data URL.');
  }

  return {
    mimeType: match[1],
    data: match[2],
  };
};

const storedFileToInlineData = async (snapshot) => {
  const relativePath = typeof snapshot.imagePath === 'string' ? snapshot.imagePath.trim() : '';
  if (!relativePath) {
    throw new Error('Snapshot is missing a stored image path.');
  }

  const absolutePath = path.join(getUploadRoot(), relativePath);
  const fileBuffer = await fs.readFile(absolutePath);
  const mimeType =
    snapshot.imageMimeType ||
    extensionToMimeType[path.extname(relativePath).toLowerCase()];

  if (!mimeType) {
    throw new Error(`Unsupported stored image type for snapshot ${snapshot.id || 'unknown'}.`);
  }

  return {
    mimeType,
    data: fileBuffer.toString('base64'),
  };
};

const snapshotToInlineData = async (snapshot) => {
  if (typeof snapshot.imageDataUrl === 'string' && snapshot.imageDataUrl.startsWith('data:')) {
    return dataUrlToInlineData(snapshot.imageDataUrl);
  }

  return storedFileToInlineData(snapshot);
};

const runPlantGate = async (imageData) => {
  const result = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: imageData.mimeType,
            data: imageData.data,
          },
        },
        {
          text: `You are a strict plant detector.

Look at the image. Decide if the main subject is a real, living plant.

Rules:
- If it is clearly a real plant, set isPlant=true.
- If it is a person, animal, object, fake plant, or unclear, set isPlant=false.
- If you are not at least 0.6 confident that it is a real plant, set isPlant=false.

Return only a JSON object matching the schema.`,
        },
      ],
    },
    config: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseSchema: plantGateSchema,
    },
  });

  return JSON.parse(parseGeminiText(result));
};

export const analyzePlantImage = async (imageData) => {
  let plantGateResult = null;

  try {
    plantGateResult = await runPlantGate(imageData);
  } catch (error) {
    console.error('Plant gate failed:', error);
  }

  const gateSnippet = plantGateResult
    ? `A preliminary plant detector reported:
- isPlant: ${plantGateResult.isPlant}
- confidence: ${plantGateResult.confidence}
- reason: ${plantGateResult.reason || 'no reason provided'}

You must weigh this signal carefully.`
    : 'No preliminary plant detector result is available.';

  try {
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: imageData.mimeType,
              data: imageData.data,
            },
          },
          {
            text: `You are an expert botanist AI. Analyze the provided image with high accuracy.

${gateSnippet}

Requirements:
1. First decide if the main subject is a real, living plant.
2. If not, set isPlant to false, confidence low, health to Unknown, disease to null, advice to [].
3. If it is a plant, provide realistic species/commonName if you are reasonably confident.
4. If it is a plant, always provide a best-effort estimated height and width in centimeters as a plausible range like "25-40 cm". Do not return null, N/A, unknown, or empty strings for height or width when a plant is visible.
5. Base size estimates on visible leaf size, pot scale, growth habit, and common indoor specimen size. Be conservative and realistic rather than overconfident.
6. Provide exactly three short, practical care tips when a plant is present.
5. Return only one JSON object matching the schema.`,
          },
        ],
      },
      config: {
        temperature: 0.5,
        responseMimeType: 'application/json',
        responseSchema: analysisSchema,
      },
    });

    const parsed = JSON.parse(parseGeminiText(result));
    const { summary, ...analysis } = parsed;

    if (plantGateResult) {
      analysis.plantGateSource = 'plant_gate_gemini';
      analysis.plantGateConfidence = plantGateResult.confidence;
    }

    let nextAnalysis = normalizeAnalysis(analysis);

    try {
      const pdddResult = await runPdddAnalysis(imageData);

      if (typeof pdddResult?.disease_confidence === 'number') {
        const confidence = pdddResult.disease_confidence;

        if (confidence >= 0.6 && pdddResult.disease_name) {
          nextAnalysis = normalizeAnalysis({
            ...nextAnalysis,
            disease: {
              name: pdddResult.disease_name,
              severity: nextAnalysis.disease?.severity || 'Unknown',
              recommendations: nextAnalysis.disease?.recommendations || [],
            },
          });
        }

        if (confidence >= 0.6 && (nextAnalysis.health === 'Unknown' || nextAnalysis.confidence < 0.6)) {
          nextAnalysis = normalizeAnalysis({
            ...nextAnalysis,
            health: pdddResult.health_status === 'Healthy' ? 'Healthy' : 'Unhealthy',
          });
        }
      }
    } catch (pdddError) {
      console.error('PDDD enrichment unavailable, using Gemini-only analysis:', pdddError);
    }

    return {
      analysis: nextAnalysis,
      summary,
    };
  } catch (error) {
    console.error('Gemini analysis failed:', error);
    return {
      analysis: createFallbackAnalysis(),
      summary: 'The AI could not analyze this image. Please try again.',
    };
  }
};

const buildPlantContext = (plants, selectedPlantId) => {
  const relevantPlants = selectedPlantId
    ? plants.filter((plant) => plant.id === selectedPlantId)
    : plants.slice(0, 8);

  if (!relevantPlants.length) {
    return 'The user has not saved any plants yet.';
  }

  return relevantPlants
    .map((plant) => {
      const recentSnapshots = plant.snapshots.slice(-3);
      const recentText = recentSnapshots
        .map(
          (snapshot, index) =>
            `Snapshot ${index + 1} on ${snapshot.timestamp}: summary="${snapshot.summary || 'No summary'}", health=${snapshot.analysis.health}, species=${snapshot.analysis.species || 'unknown'}, disease=${snapshot.analysis.disease?.name || 'none'}`
        )
        .join('\n');

      return `Plant "${plant.name}" (${plant.id})
${recentText}`;
    })
    .join('\n\n');
};

const buildImageParts = async (plants, selectedPlantId) => {
  const relevantPlants = selectedPlantId
    ? plants.filter((plant) => plant.id === selectedPlantId)
    : plants.slice(0, 4);

  const recentSnapshots = relevantPlants
    .flatMap((plant) =>
      plant.snapshots.slice(-2).map((snapshot) => ({
        ...snapshot,
        plantName: plant.name,
      }))
    )
    .slice(-4);

  const imageParts = await Promise.all(
    recentSnapshots.map(async (snapshot) => {
      try {
        const imageData = await snapshotToInlineData(snapshot);
        return {
          inlineData: {
            mimeType: imageData.mimeType,
            data: imageData.data,
          },
        };
      } catch (error) {
        console.warn(
          `Skipping snapshot ${snapshot.id || 'unknown'} for chat image context.`,
          error instanceof Error ? error.message : error
        );
        return null;
      }
    })
  );

  return imageParts.filter(Boolean);
};

const extractGroundingSources = (result) => {
  const chunks =
    result?.response?.candidates?.[0]?.groundingMetadata?.groundingChunks ||
    result?.candidates?.[0]?.groundingMetadata?.groundingChunks ||
    [];

  return chunks
    .map((chunk) => chunk?.web)
    .filter(Boolean)
    .map((web) => ({
      title: web.title || web.uri,
      url: web.uri,
    }))
    .filter((source, index, all) => source.url && all.findIndex((item) => item.url === source.url) === index)
    .slice(0, 5);
};

export const answerChat = async ({ mode, question, history, plants, selectedPlantId }) => {
  const systemInstruction =
    mode === 'casual'
      ? 'You are a friendly plant app assistant. You can chat casually, but keep replies concise and helpful.'
      : mode === 'web'
        ? 'You are a plant assistant. Answer using web search when current information matters, and cite the returned sources.'
        : 'You are a plant care assistant. Use the user plant data and recent snapshots to answer practical questions about their plants.';

  const prompt = `Question: ${question}

Plant context:
${buildPlantContext(plants, selectedPlantId)}

If plant context is relevant, refer to it directly. Be explicit when you are inferring from photos or prior analysis.`;

  const imageParts = await buildImageParts(plants, selectedPlantId);
  const contents = [
    ...history.map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    })),
    {
      role: 'user',
      parts: [...imageParts, { text: prompt }],
    },
  ];

  const result = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents,
    config: {
      systemInstruction,
      temperature: mode === 'casual' ? 0.9 : 0.4,
      tools: mode === 'web' ? [{ googleSearch: {} }] : undefined,
    },
  });

  return {
    answer: parseGeminiText(result),
    sources: mode === 'web' ? extractGroundingSources(result) : [],
  };
};
