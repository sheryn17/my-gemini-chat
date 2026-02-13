import React, { useState } from 'react';
import axios from 'axios';
import './ChatInterface.css';

function ChatInterface() {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [geminiHistory, setGeminiHistory] = useState([]);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  function handleMessageChange(event) {
    setMessage(event.target.value);
  }

  function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  async function sendMessage() {
    if (!message.trim()) {
      alert('Please type a message!');
      return;
    }

    setLoading(true);
    const userMessage = message;
    setMessage('');

    // Add user message to chat
    const newUserMessage = { role: 'user', text: userMessage };
    setChatHistory(function(prev) {
      return [...prev, newUserMessage];
    });

    try {
      // Call backend API
      const response = await axios.post(API_URL + '/gemini/chat', {
        message: userMessage,
        history: geminiHistory,
      });

      const aiResponse = response.data.text;

      // Add AI response to chat
      const newAIMessage = { role: 'model', text: aiResponse };
      setChatHistory(function(prev) {
        return [...prev, newAIMessage];
      });
      
      setGeminiHistory(response.data.history);

      // Save to database
      await axios.post(API_URL + '/messages', {
        message: userMessage,
        response: aiResponse,
        userId: 'user123',
      });

    } catch (error) {
      console.error('Error:', error);
      const errorMessage = { 
        role: 'error', 
        text: 'Failed to get response. Check console for details.' 
      };
      setChatHistory(function(prev) {
        return [...prev, errorMessage];
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h1>🤖 Gemini Chat Assistant</h1>
        <p>Powered by Express.js, React & Supabase</p>
      </div>

      <div className="chat-messages">
        {chatHistory.length === 0 && (
          <div className="welcome-message">
            <h2>👋 Welcome!</h2>
            <p>Start chatting with Google Gemini AI</p>
          </div>
        )}
        
        {chatHistory.map(function(msg, index) {
          return (
            <div key={index} className={'message ' + msg.role}>
              <div className="message-content">
                <strong>{msg.role === 'user' ? 'You' : 'AI'}:</strong>
                <p>{msg.text}</p>
              </div>
            </div>
          );
        })}
        
        {loading && (
          <div className="message model">
            <div className="message-content">
              <strong>AI:</strong>
              <p className="typing">Thinking...</p>
            </div>
          </div>
        )}
      </div>

      <div className="chat-input">
        <textarea
          value={message}
          onChange={handleMessageChange}
          onKeyPress={handleKeyPress}
          placeholder="Type your message... (Press Enter to send)"
          rows="3"
          disabled={loading}
        />
        <button 
          onClick={sendMessage} 
          disabled={loading || !message.trim()}
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

export default ChatInterface;