const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Create Express app
const app = express();
const port = process.env.PORT || 3001;

// Setup CORS (allows frontend to talk to backend)
// In server.js
app.use(cors({
  origin: function (origin, callback) {
    // Allow local development
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'https://my-gemini-chat-six.vercel.app'
    ];

    // Allow ANY vercel.app sub-domain (fixes the random URL issue)
    const isVercel = origin.endsWith('.vercel.app');

    if (allowedOrigins.indexOf(origin) !== -1 || isVercel) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  credentials: true
}));
// Allow JSON data
app.use(express.json());

// Initialize Google Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
// Use 'gemini-pro' as it is the most globally compatible name for v1beta
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

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
    const { message, history } = req.body;
    
    // Check if the model is initialized
    if (!model) {
      return res.status(500).json({ error: "Model not initialized. Check API Key." });
    }

    const chat = model.startChat({
      history: history || [],
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    res.json({ text: text });
    
  } catch (error) {
    // This logs the SPECIFIC error to your Vercel Logs
    console.error("DETAILED ERROR:", error);
    res.status(500).json({ 
      error: "Gemini Error", 
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