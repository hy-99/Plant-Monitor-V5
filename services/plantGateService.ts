import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
});

const plantGateSchema = {
  type: Type.OBJECT,
  properties: {
    isPlant: {
      type: Type.BOOLEAN,
      description:
        "True if the main subject of the image is a real, living plant (houseplant, tree, bush, leaf, etc.). False if it is not a plant (person, animal, object, fake plastic plant, cartoon, etc.).",
    },
    confidence: {
      type: Type.NUMBER,
      description:
        "How confident you are that the main subject is a real plant, from 0.0 to 1.0.",
    },
    reason: {
      type: Type.STRING,
      description:
        "Very short explanation of why you think it is or is not a plant.",
    },
  },
  required: ["isPlant", "confidence"],
} as const;

export interface PlantGateResult {
  isPlant: boolean;
  confidence: number;
  reason?: string;
}

export async function runPlantGate(imageData: {
  mimeType: string;
  data: string;
}): Promise<PlantGateResult> {
  const { mimeType, data } = imageData;

  const imagePart = {
    inlineData: {
      mimeType,
      data,
    },
  };

  const textPart = {
    text: `You are a strict plant detector.

Look at the image. Decide if the MAIN SUBJECT is a real, living plant.

Rules:
- If it is clearly a real plant (tree, bush, flower, houseplant, leaf), set isPlant=true.
- If it is a person, animal, object, furniture, background, fake plant, cartoon, etc., set isPlant=false.
- If you are not at least 0.6 confident that it is a real plant, set isPlant=false.

Return ONLY a JSON object matching the given schema.`,
  };

  const result = await ai.models.generateContent({
    model: "gemini-2.5-pro",
    contents: { parts: [imagePart, textPart] },
    config: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: plantGateSchema,
    },
  });

  let raw: unknown;

  // Handle both possible response shapes from @google/genai
  if (typeof (result as any).text === "function") {
    raw = (result as any).text();
  } else if (
    (result as any).response &&
    typeof (result as any).response.text === "function"
  ) {
    raw = (result as any).response.text();
  } else if (typeof (result as any).text === "string") {
    raw = (result as any).text;
  } else {
    console.error("Unexpected Gemini plant gate response:", result);
    throw new Error("Unexpected plant gate response format from AI.");
  }

  const jsonString = String(raw).trim();
  if (!jsonString) {
    throw new Error("Empty response from plant gate AI.");
  }

  const parsed = JSON.parse(jsonString);

  return {
    isPlant: parsed.isPlant,
    confidence: parsed.confidence,
    reason: parsed.reason,
  };
}
