import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('GEMINI_API_KEY is required to start the API server.');
}

const ai = new GoogleGenAI({ apiKey });
const pdddApiUrl = process.env.PDDD_API_URL || 'http://localhost:8001';

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
4. Provide exactly three short, practical care tips when a plant is present.
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

    let nextAnalysis = analysis;

    try {
      const pdddResult = await runPdddAnalysis(imageData);

      if (typeof pdddResult?.disease_confidence === 'number') {
        const confidence = pdddResult.disease_confidence;

        if (confidence >= 0.6 && pdddResult.disease_name) {
          nextAnalysis = {
            ...nextAnalysis,
            disease: {
              name: pdddResult.disease_name,
              severity: nextAnalysis.disease?.severity || 'Unknown',
              recommendations: nextAnalysis.disease?.recommendations || [],
            },
          };
        }

        if (confidence >= 0.6 && (nextAnalysis.health === 'Unknown' || nextAnalysis.confidence < 0.6)) {
          nextAnalysis = {
            ...nextAnalysis,
            health: pdddResult.health_status === 'Healthy' ? 'Healthy' : 'Unhealthy',
          };
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

const buildImageParts = (plants, selectedPlantId) => {
  const relevantPlants = selectedPlantId
    ? plants.filter((plant) => plant.id === selectedPlantId)
    : plants.slice(0, 4);

  return relevantPlants
    .flatMap((plant) => plant.snapshots.slice(-2))
    .slice(-4)
    .map((snapshot) => {
      const imageData = dataUrlToInlineData(snapshot.imageDataUrl);
      return {
        inlineData: {
          mimeType: imageData.mimeType,
          data: imageData.data,
        },
      };
    });
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

  const contents = [
    ...history.map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    })),
    {
      role: 'user',
      parts: [...buildImageParts(plants, selectedPlantId), { text: prompt }],
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
