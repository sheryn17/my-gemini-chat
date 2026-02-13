const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Create Express app
const app = express();
const port = process.env.PORT || 3001;

// Setup CORS (allows frontend to talk to backend)
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://my-gemini-chat-n7kh-fl40h11zg-sheryn-mae-abrils-projects.vercel.app'
  ],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
}));

// Allow JSON data
app.use(express.json());

// Initialize Google Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Test route - check if backend is working
app.get('/', function(req, res) {
  res.json({ 
    status: 'Backend is running!',
    timestamp: new Date().toISOString()
  });
});

// Generate simple response from Gemini
app.post('/gemini/generate', async function(req, res) {
  try {
    const prompt = req.body.prompt;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ response: text });
    
  } catch (error) {
    console.error('Error in /gemini/generate:', error);
    res.status(500).json({ 
      error: 'Failed to generate response',
      details: error.message 
    });
  }
});

// Chat with history
app.post('/gemini/chat', async function(req, res) {
  try {
    const message = req.body.message;
    const history = req.body.history || [];

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const chat = model.startChat({
      history: history,
      generationConfig: {
        maxOutputTokens: 1000,
      },
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const chatHistory = await chat.getHistory();

    res.json({
      text: response.text(),
      history: chatHistory,
    });
    
  } catch (error) {
    console.error('Error in /gemini/chat:', error);
    res.status(500).json({ 
      error: 'Failed to chat',
      details: error.message 
    });
  }
});

// Save message to database
app.post('/messages', async function(req, res) {
  try {
    const message = req.body.message;
    const response = req.body.response;
    const userId = req.body.userId;

    if (!message || !response) {
      return res.status(400).json({ 
        error: 'Message and response are required' 
      });
    }

    const result = await supabase
      .from('messages')
      .insert([
        {
          user_message: message,
          ai_response: response,
          user_id: userId || 'anonymous',
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (result.error) {
      throw result.error;
    }

    res.json(result.data);
    
  } catch (error) {
    console.error('Error in /messages POST:', error);
    res.status(500).json({ 
      error: 'Failed to save message',
      details: error.message 
    });
  }
});

// Get messages from database
app.get('/messages', async function(req, res) {
  try {
    const userId = req.query.userId;

    let query = supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const result = await query;

    if (result.error) {
      throw result.error;
    }

    res.json(result.data);
    
  } catch (error) {
    console.error('Error in /messages GET:', error);
    res.status(500).json({ 
      error: 'Failed to get messages',
      details: error.message 
    });
  }
});

// ============================================
// START SERVER
// ============================================

app.listen(port, function() {
  console.log('========================================');
  console.log('🚀 Backend Server is Running!');
  console.log('========================================');
  console.log('URL: http://localhost:' + port);
  console.log('Time: ' + new Date().toLocaleString());
  console.log('========================================');
});