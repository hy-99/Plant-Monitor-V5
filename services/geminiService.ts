import { GoogleGenAI, Type } from "@google/genai";
import { runPdddAnalysis, PdddResult } from "./pdddService";
import { AnalysisResult } from "../types";
import { runPlantGate, PlantGateResult } from "./plantGateService";

// Initialize the Gemini client once
const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
});

// Fallback analysis in case Gemini fails or returns bad JSON
const createFallbackAnalysis = (): AnalysisResult => ({
  isPlant: false,
  confidence: 0,
  plantGateSource: "other",
  // plantGateConfidence left undefined intentionally

  species: null,
  commonName: null,
  health: "Unknown",
  height: null,
  width: null,
  disease: null,
  advice: [],
  // feedback left undefined
});

// Schema for the model's JSON output
const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description:
        "A concise paragraph explaining the plant analysis (observations and conclusions).",
    },
    isPlant: {
      type: Type.BOOLEAN,
      description: "Is there a plant in the image?",
    },
    confidence: {
      type: Type.NUMBER,
      description: "Confidence score from 0.0 to 1.0 for the analysis.",
    },
    species: {
      type: Type.STRING,
      description:
        "The scientific species name of the plant. Null if unknown.",
    },
    commonName: {
      type: Type.STRING,
      description:
        "The common or popular name of the plant. Null if unknown.",
    },
    health: {
      type: Type.STRING,
      description: "Health status of the plant.",
      enum: ["Healthy", "Stressed", "Unhealthy", "Unknown"],
    },
    height: {
      type: Type.STRING,
      description:
        'Estimated height in cm, e.g., "15 cm". Null if not measurable.',
    },
    width: {
      type: Type.STRING,
      description:
        'Estimated width in cm, e.g., "10 cm". Null if not measurable.',
    },
    disease: {
      type: Type.OBJECT,
      description: "Information about any detected disease. Null if healthy.",
      properties: {
        name: {
          type: Type.STRING,
          description: "Name of the disease.",
        },
        severity: {
          type: Type.STRING,
          description: "Severity of the disease (e.g., Mild, Moderate, Severe).",
        },
        recommendations: {
          type: Type.ARRAY,
          description: "List of recommendations to treat the disease.",
          items: { type: Type.STRING },
        },
      },
    },
    advice: {
      type: Type.ARRAY,
      description: "A list of care advice for the plant.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: "Title of the advice (e.g., Watering, Sunlight).",
          },
          description: {
            type: Type.STRING,
            description: "Detailed description of the care advice.",
          },
        },
        required: ["title", "description"],
      },
    },
  },
  required: ["summary", "isPlant", "confidence", "health", "advice"],
};

// Main analysis function used by the app
export const analyzePlantImage = async (
  imageData: { mimeType: string; data: string }
): Promise<{ analysis: AnalysisResult; summary: string }> => {
  // ---- 0) Run plant gate first (quick "is this a plant?" check) ----
  let plantGateResult: PlantGateResult | null = null;

  try {
    plantGateResult = await runPlantGate(imageData);
  } catch (e) {
    console.error("Plant gate failed; continuing without it:", e);
  }

  // Prepare image for Gemini
  const imagePart = {
    inlineData: {
      mimeType: imageData.mimeType,
      data: imageData.data,
    },
  };

  // ---- 1) Build a prompt that includes the plant gate result ----
  const gateSnippet = plantGateResult
    ? `A preliminary plant detector analyzed this image and reported:
- isPlant: ${plantGateResult.isPlant}
- confidence: ${plantGateResult.confidence}
- reason: ${plantGateResult.reason || "no reason provided"}

You must consider this signal carefully.`
    : `No preliminary plant detector result is available for this image.`;

  const prompt = `You are an expert botanist AI. Your task is to analyze the provided image with high accuracy.

${gateSnippet}

Your job:

1. FIRST, decide if the main subject is a **real, living plant**.
   - If you do NOT clearly see a real plant, set:
       "isPlant": false,
       "confidence": a low value (for example 0.1–0.4),
       "species": null,
       "commonName": null,
       "health": "Unknown",
       "disease": null,
       "advice": [].
   - Only set "isPlant": true if you are reasonably sure (e.g. confidence >= 0.6).

2. If (and only if) you are confident it **is** a plant:
   - Provide a realistic "species" (scientific name) and "commonName", OR set them to null if you are not sure.
   - Do NOT invent random or extremely rare species just to fill the field.
   - If you are unsure beyond 1–2 broad guesses, it is better to leave "species" and "commonName" as null.

3. "confidence" MUST represent your confidence that the image truly contains a plant, from 0.0 to 1.0.
   - If "isPlant" is false, "confidence" should be low.
   - If "isPlant" is true, "confidence" should reflect how sure you are that it is a plant.

4. Fill out all fields strictly according to the schema:
   - "summary": a concise paragraph describing what you see and your conclusions.
   - "health": "Healthy", "Stressed", "Unhealthy", or "Unknown".
   - "disease": either a disease object or null.
   - "advice": exactly 3 short, practical care tips when a plant is present.

Return ONLY a single JSON object that matches the schema. Do NOT include any extra text.`;

  const textPart = { text: prompt };

  // ---- 2) Call Gemini once ----
  let result: any;
  try {
    result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        temperature: 0.5,
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
      },
    });
  } catch (err) {
    console.error("Gemini API call failed:", err);

    const fallback = createFallbackAnalysis();
    return {
      analysis: fallback,
      summary:
        "The AI could not analyze this image due to an API error. Please try again.",
    };
  }

  // ---- 3) Parse Gemini JSON into AnalysisResult + summary ----
  let analysis: AnalysisResult;
  let summary: string;

  try {
    let raw: unknown;

    // Support both possible response shapes:
    // - result.text()          (AI Studio starter style)
    // - result.response.text() (newer SDK style)
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
      console.error("Unexpected Gemini response shape:", result);
      throw new Error("Unexpected Gemini response format from AI.");
    }

    const jsonString = (raw as string).trim();

    if (!jsonString) {
      throw new Error("Received an empty response from the AI.");
    }

    const parsed = JSON.parse(jsonString);
    const { summary: s, ...analysisData } = parsed;

    if (typeof s !== "string") {
      throw new Error("Parsed JSON does not contain a valid 'summary' field.");
    }

    analysis = analysisData as AnalysisResult;
    summary = s;

    // Attach plant gate info if available (for display / debugging / future models)
    if (plantGateResult) {
      analysis.plantGateSource = "plant_gate_gemini";
      analysis.plantGateConfidence = plantGateResult.confidence;
    }
  } catch (e) {
    console.error("Failed to parse Gemini response JSON:", e, result);

    const fallback = createFallbackAnalysis();
    return {
      analysis: fallback,
      summary:
        "The AI returned an unexpected response and could not analyze this image.",
    };
  }

  // ---- 4) Refine with PDDD backend if available ----
  try {
    const pdddResult: PdddResult = await runPdddAnalysis(imageData);

    if (pdddResult && typeof pdddResult.disease_confidence === "number") {
      const pConf = pdddResult.disease_confidence;

      // If PDDD is reasonably confident, let it influence disease
      if (pConf >= 0.6 && pdddResult.disease_name) {
        analysis = {
          ...analysis,
          disease: {
            name: pdddResult.disease_name,
            severity: analysis.disease?.severity ?? "Unknown",
            recommendations: analysis.disease?.recommendations ?? [],
          },
        };
      }

      // Adjust health if Gemini is unsure or low-confidence
      if (
        pConf >= 0.6 &&
        (analysis.health === "Unknown" || analysis.confidence < 0.6)
      ) {
        analysis = {
          ...analysis,
          health:
            pdddResult.health_status === "Healthy" ? "Healthy" : "Unhealthy",
        };
      }
    }
  } catch (err) {
    console.error(
      "PDDD backend unavailable or failed, using Gemini-only analysis:",
      err
    );
    // silently fall back to Gemini-only analysis
  }

  // Final unified result for the UI
  return { analysis, summary };
};
