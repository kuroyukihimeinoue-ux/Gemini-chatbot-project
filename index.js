require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

/**
 * The extractText helper function is designed for robust and future-proof parsing of Gemini API responses.
 * Since the Gemini SDK’s response structure may vary between versions (e.g., from candidates[0]... to response.candidates[0]...),
 * this helper uses optional chaining (?.) and nullish coalescing (??) to safely extract the generated text
 * regardless of minor structural changes.
 */
const extractText = (response) => {
  const text = response?.candidates?.[0]?.content?.parts?.[0]?.text ?? response?.text?.();
  if (text) {
    return text;
  }
  return JSON.stringify(response, null, 2);
};

app.use(cors());
app.use(express.json());

app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const result = await model.generateContent(message);
    const response = await result.response;
    const text = extractText(response);
    res.send({ message: text });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: error.message });
  }
});

/**
 * This endpoint enables multi-turn chat with Gemini AI:
 * - Accepts a POST request at /api/chat with a messages array in the request body.
 * - The messages array should represent the conversation history.
 * - Each object in the array should have a 'role' and 'message' or 'content' property.
 * - It transforms the messages into the Gemini-compatible format.
 * - It sends the formatted messages to the Gemini model.
 * - It extracts and returns the AI’s response.
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages)) {
      return res.status(400).send({ error: 'Messages must be an array' });
    }

    const contents = messages.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.message || msg.content }]
    }));

    for (const content of contents) {
      if (!content.parts[0].text) {
        return res.status(400).send({ error: 'Each message must have a non-empty message or content property.' });
      }
    }

    const result = await model.generateContent({ contents });
    const response = await result.response;
    const text = extractText(response);

    res.send({ message: text });

  } catch (error) {
    console.error(error);
    res.status(500).send({ error: error.message });
  }
});


const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});