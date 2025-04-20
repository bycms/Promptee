import { OpenAI } from "openai";
let acckey = 'github_pat_11BGHDBJI0PmwAhZ0F1fZG_jQkTo'+'zqbIJYHb1j6R8Q0grI8qvfmwyeg4YOqfeVzBVrWIXDRX2HBqgwq2AT';
const endpoint = "https://models.inference.ai.azure.com";
const modelName = "mai-ds-r1";

const client = new OpenAI({ baseURL: endpoint, apiKey: acckey, dangerouslyAllowBrowser: true });

const response = await client.chat.completions.create({
  messages: [
    {
      role: "system",
      content: ""
    },
    { role: "user", content: "Hi, who are you?" }
  ],
  model: modelName
});
console.log("AI response received:", response.choices[0].message.content); // Log the response
