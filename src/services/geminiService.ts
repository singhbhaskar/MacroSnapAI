
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { NutritionData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function scanMealImage(base64Image: string): Promise<NutritionData & { description: string, composition: string }> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image.split(',')[1] || base64Image,
          },
        },
        {
          text: "Analyze this meal photo and estimate its nutritional content. Return the calories, protein(g), carbs(g), fat(g), identified food items, a short description, and a 'composition' field which provides a detailed list of ingredients or components visible in the dish to allow recording the meal without the photo.",
        },
      ],
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseSchema: {
          type: Type.OBJECT,
          required: ["calories", "protein", "carbs", "fat", "foodItems", "description", "composition"],
          properties: {
            calories: { type: Type.NUMBER, description: "Total calories estimate" },
            protein: { type: Type.NUMBER, description: "Total protein in grams" },
            carbs: { type: Type.NUMBER, description: "Total carbohydrates in grams" },
            fat: { type: Type.NUMBER, description: "Total fat in grams" },
            foodItems: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "List of food items seen in the image"
            },
            description: { type: Type.STRING, description: "A one-sentence description of the meal" },
            composition: { type: Type.STRING, description: "A detailed list of ingredients, e.g. '2 boiled eggs, sourdough toast, 1/2 avocado, chili flakes'" }
          }
        }
      }
    });

    const result = JSON.parse(response.text);
    return result;
  } catch (error) {
    console.error("AI Scan Error:", error);
    throw new Error("Failed to analyze image. Please try again.");
  }
}

export async function estimateNutritionFromText(dish: string, quantity: number, unit: string): Promise<NutritionData> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          text: `Estimate the nutritional content for ${quantity} ${unit} of ${dish}. Provide the calories, protein (g), carbs (g), fat (g).`,
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["calories", "protein", "carbs", "fat"],
          properties: {
            calories: { type: Type.NUMBER, description: "Total calories estimate" },
            protein: { type: Type.NUMBER, description: "Total protein in grams" },
            carbs: { type: Type.NUMBER, description: "Total carbohydrates in grams" },
            fat: { type: Type.NUMBER, description: "Total fat in grams" }
          }
        }
      }
    });

    const result = JSON.parse(response.text);
    return result;
  } catch (error) {
    console.error("AI Text Estimation Error:", error);
    throw new Error("Failed to estimate nutrition. Please check your input.");
  }
}
