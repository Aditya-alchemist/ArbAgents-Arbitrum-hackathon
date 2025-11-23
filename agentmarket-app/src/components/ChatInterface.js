import React, { useState, useRef, useEffect } from 'react';
import './ChatInterface.css';

function ChatInterface({ account, services }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        `Hi! I'm your personal AI Agent 🤖\n\n` +
        `I can help you discover services and purchase them on your behalf using X402.\n\n` +
        `Try asking: "Generate a futuristic Bitcoin image"`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    const userInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:5000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userInput })
      });

      const data = await res.json();

      if (!data.success) {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: '❌ Backend error: ' + data.error }
        ]);
        setIsLoading(false);
        return;
      }

      // Assistant normal reply
      if (data.action === 'chat') {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: data.message }
        ]);
      }

      // Purchase result with image display
      if (data.action === 'purchase') {
        const result = data.service_result;
        if (result && result.success) {
          const msg =
            `✅ **Purchase Successful!**\n\n` +
            `**Service ID:** ${result.service_id}\n` +
            `**Prompt:** ${result.prompt || 'N/A'}\n` +
            `**Tx:** ${data.tx_hash}\n\n` +
            `📸 **Image:** [View here](${result.image_url})`;

          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: msg,
              image: result.image_url
            }
          ]);
        } else {
          setMessages(prev => [
            ...prev,
            { role: 'assistant', content: '❌ ' + (result?.message || result?.error || 'Unknown error') }
          ]);
        }
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '❌ Network error: ' + err.message }
      ]);
    }

    setIsLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-container card">

      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`message ${msg.role === 'user' ? 'message-user' : 'message-assistant'}`}
          >
            <div className="message-content">
              <div className="message-text" style={{ whiteSpace: 'pre-wrap' }}>
                {msg.content.split('\n').map((line, idx) =>
                  line.startsWith('📸 **Image:**') ? (
                    <a key={idx} href={line.match(/\(([^)]+)\)/)?.[1]} target="_blank" rel="noopener noreferrer">
                      View generated image
                    </a>
                  ) : (
                    <span key={idx}>{line}<br /></span>
                  )
                )}
              </div>

              {msg.image && (
                <img
                  src={msg.image}
                  alt="Generated"
                  className="generated-image"
                  style={{ marginTop: '10px', maxWidth: '340px', borderRadius: '12px' }}
                />
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message message-assistant">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <input
          className="chat-input"
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Talk to your agent..."
          disabled={isLoading}
        />
        <button
          className="btn-primary chat-send-btn"
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default ChatInterface;
