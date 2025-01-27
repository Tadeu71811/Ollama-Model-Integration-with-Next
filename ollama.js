import axios from 'axios';

// Global conversation buffer for chat context
let conversationBuffer = [];
const MAX_HISTORY_LENGTH = 5; // Retain the last few exchanges

// Model registry to map tasks to default models
const modelRegistry = {
  chat: 'llama3.2',       // General-purpose conversational tasks
  summarize: 'mistral',   // Summarization and concise text generation
  analyze: 'phi4',        // Complex reasoning and advanced analysis
  quick: 'phi3',          // Lightweight, quick-response tasks
  visual: 'llava:7b-v1.6',    // Visual-related or lightweight tasks
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { task, prompt, model } = req.body;

  // Validate inputs
  if (!task || !prompt) {
    return res.status(400).json({
      error: 'Task and prompt are required.',
      supported_tasks: Object.keys(modelRegistry),
    });
  }

  // Dynamically select the model
  const selectedModel = model || modelRegistry[task] || 'llama3.2'; // Default to "llama3.2"

  try {
    if (task === 'chat') {
      // Manage conversation buffer for context
      conversationBuffer.push(`User: ${prompt}`);
      if (conversationBuffer.length > MAX_HISTORY_LENGTH * 2) {
        conversationBuffer = conversationBuffer.slice(-MAX_HISTORY_LENGTH * 2);
      }

      // Prepare chat-specific prompt
      const chatPrompt = conversationBuffer.join('\n');

      // Send chat request to Ollama API
      const response = await axios.post('http://localhost:11434/api/generate', {
        model: selectedModel,
        prompt: chatPrompt,
        stream: false,
      });

      const botResponse = response.data?.response || 'No valid response from Ollama.';
      conversationBuffer.push(`Bot: ${botResponse}`);
      return res.status(200).json({ response: botResponse, model: selectedModel });
    }

    if (task === 'summarize') {
      // Send summarization request to Ollama API
      const response = await axios.post('http://localhost:11434/api/generate', {
        model: selectedModel,
        prompt: `Summarize this: ${prompt}`,
        stream: false,
      });

      const summary = response.data?.response || 'No summary available.';
      return res.status(200).json({ response: summary, model: selectedModel });
    }

    if (task === 'visual') {
      // Send visual-related task to llava:7b-v1.6
      const response = await axios.post('http://localhost:11434/api/generate', {
        model: selectedModel,
        prompt: `Create a visual representation or analyze this visually: ${prompt}`,
        stream: false,
      });

      const visualResponse = response.data?.response || 'No visual-related response available.';
      return res.status(200).json({ response: visualResponse, model: selectedModel });
    }

    // Unsupported tasks: Log and return error
    console.warn(`Unsupported task received: ${task}`);
    return res.status(400).json({
      error: `Unsupported task: ${task}`,
      supported_tasks: Object.keys(modelRegistry),
    });
  } catch (error) {
    console.error('Error processing request:', error.message);
    return res.status(500).json({
      error: 'An error occurred while communicating with the Ollama API.',
      details: error.message,
    });
  }
}
