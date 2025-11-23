import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);

export async function askGemini(prompt, conversationHistory = []) {
  let model;
  try {
    // Try 2.5-flash first, fallback to pro
    try {
      model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      return await _askModel(model, prompt, conversationHistory);
    } catch (err) {
      model = genAI.getGenerativeModel({ model: "gemini-pro" });
      return await _askModel(model, prompt, conversationHistory);
    }
  } catch (error) {
    return "AI Error: " + (error.message || "Internal error");
  }
}

async function _askModel(model, prompt, conversationHistory) {
  const systemPrompt = `You are an AI assistant for AgentMarket. Guide users, no payments.`;
  const chat = model.startChat({
    history: [
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "model", parts: [{ text: "Ready to assist users." }] },
      ...conversationHistory
    ],
  });
  const result = await chat.sendMessage(prompt);
  const response = await result.response;
  return response.text();
}
