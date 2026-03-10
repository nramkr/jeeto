import { GoogleGenAI, ThinkingLevel } from "@google/genai";

async function urlToBase64(url: string): Promise<{ data: string; mimeType: string }> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve({ data: base64, mimeType: blob.type });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error("Error fetching image for Gemini:", err);
    throw new Error("Could not load question image for analysis. Please check your internet connection or the image URL.");
  }
}

export async function generateSolution(question: any) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API Key not found");
  
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3.1-pro-preview";
  
  const imagePart = await urlToBase64(question.question_text);
  
  const prompt = `
    SYSTEM PROMPT:
    You are an expert IIT-JEE mentor.
    Analyze the provided image which contains a JEE question.
    Rules:
    - Provide ONLY the step-by-step solution.
    - No extra conceptual explanations or fluff.
    - Preserve exact numeric values.
    - Use LaTeX ($...$ for inline, $$...$$ for block) for all math.
    - Box the final answer using \\boxed{...}.
    - Keep it under 300 words.

    USER INPUT:
    Correct Answer: ${question.correct_answer}
    Topic: ${question.topic_name || 'N/A'}
    Exam Level: ${question.exam_level}

    Return:
    ### Step-by-Step Solution
    ...
  `;

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: imagePart },
        { text: prompt }
      ]
    },
    config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
  });

  return response.text;
}

export async function generateTrick(question: any) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API Key not found");
  
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3.1-pro-preview";
  
  const imagePart = await urlToBase64(question.question_text);
  
  const prompt = `
    SYSTEM PROMPT:
    You are a JEE problem-solving strategist.
    Analyze the provided image which contains a JEE question.
    Rules:
    - Provide ONLY the shortcut method content.
    - DO NOT return JSON, DO NOT return code blocks, DO NOT return any preamble or meta-talk.
    - If no reliable shortcut exists, return ONLY this exact string: "No reliable 30-second trick exists for this question."
    - Use LaTeX ($...$ for inline) for all math.
    - Keep it under 150 words.

    If trick exists, return exactly this structure:
    ### 30-Second Shortcut
    ...
    ### Why It Works
    ...

    USER INPUT:
    Correct Answer: ${question.correct_answer}
    Topic: ${question.topic_name || 'N/A'}
    Exam Level: ${question.exam_level}
  `;

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: imagePart },
        { text: prompt }
      ]
    },
    config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
  });

  return response.text;
}

export async function generateCheatsheet(topic: any) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API Key not found");
  
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3.1-pro-preview";
  const prompt = `
    SYSTEM PROMPT:
    You are an IIT-JEE mentor creating a high-density, one-page revision "Cheat Sheet".
    Constraints:
    - Strictly within JEE syllabus.
    - No fluff, no motivational language.
    - Max 900 words.
    - Structured for maximum recall efficiency.
    - Use LaTeX formatting ($...$ for inline, $$...$$ for block) for all mathematical formulas.
    - The layout should feel like a professional reference sheet that fits on a single A4 page.
    - Use tables or columns if it makes information more scannable.
    - Highlight "Common Traps" and "30-Second Recognition" patterns.

    Structure:
    # [Topic Name] Cheat Sheet
    ## 1. Core Concepts & Definitions
    ## 2. Essential Formulas (The "Must-Knows")
    ## 3. Standard Problem Patterns & Strategies
    ## 4. Common Traps & Pitfalls
    ## 5. 30-Second Recognition Checklist
    ## 6. Advanced JEE Variants (The "Twists")

    Topic: ${topic.name}
    Chapter: ${topic.chapter_name || 'N/A'}
    Exam Level Focus: ${topic.exam_level || 'Mains & Advanced'}
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  return response.text;
}
