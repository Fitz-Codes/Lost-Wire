// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

// Establish connection to the backend Socket.IO server
const socket = io('http://localhost:5000');

function App() {
  // State management variables
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState([]);

  // useEffect runs when the component loads
  useEffect(() => {
    // A. Fetch existing chat history via HTTP REST request
    axios.get('http://localhost:5173/api/messages')
      .then((response) => {
        // Make sure response.data is an array before setting state
        if (Array.isArray(response.data)) {
          setMessages(response.data);
        } else {
          setMessages([]);
      }
      })
      .catch((error) => console.error('Error fetching chat history:', error));

    // B. Listen for real-time messages coming from backend Socket.IO server
    socket.on('receive_message', (newMessage) => {
      // Append the new message to the existing array of messages
      setMessages((prevMessages) => [...prevMessages, newMessage]);
    });

    // Cleanup socket listener on unmount to prevent duplicate listeners
    return () => {
      socket.off('receive_message');
    };
  }, []);

  // Handle user joining the chat
  const handleJoin = (e) => {
    e.preventDefault();
    if (username.trim()) {
      setIsLoggedIn(true);
    }
  };

  // Handle sending a new message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (messageText.trim()) {
      // Emit 'send_message' event to backend
      socket.emit('send_message', {
        user: username,
        text: messageText,
      });
      setMessageText(''); // Clear input box
    }
  };

  // Screen 1: Username Login Prompt
  if (!isLoggedIn) {
    return (
      <div style={styles.centerScreen}>
        <div style={styles.card}>
          <h2>Join Real-Time Chat</h2>
          <form onSubmit={handleJoin}>
            <input
              type="text"
              placeholder="Enter your name..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              required
            />
            <button type="submit" style={styles.button}>Enter Chat Room</button>
          </form>
        </div>
      </div>
    );
  }

  // Screen 2: Main Chat Window
  return (
    <div style={styles.centerScreen}>
      <div style={styles.chatCard}>
        <header style={styles.header}>
          <h3>MERN Real-Time Chat</h3>
          <span style={styles.userBadge}>User: <strong>{username}</strong></span>
        </header>

        {/* Message Box Display */}
        <div style={styles.messageContainer}>
          {messages.map((msg, index) => {
            const isMe = msg.user === username;
            return (
              <div
                key={msg._id || index}
                style={{
                  ...styles.messageBubble,
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  backgroundColor: isMe ? '#2563eb' : '#e5e7eb',
                  color: isMe ? '#ffffff' : '#1f2937',
                }}
              >
                <div style={styles.messageAuthor}>{isMe ? 'You' : msg.user}</div>
                <div>{msg.text}</div>
              </div>
            );
          })}
        </div>

        {/* Message Input Form */}
        <form onSubmit={handleSendMessage} style={styles.form}>
          <input
            type="text"
            placeholder="Type a message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            style={styles.chatInput}
          />
          <button type="submit" style={styles.button}>Send</button>
        </form>
      </div>
    </div>
  );
}

// Inline CSS styles for quick setup
const styles = {
  centerScreen: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#f3f4f6',
    fontFamily: 'sans-serif',
  },
  card: {
    background: '#fff',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    textAlign: 'center',
  },
  chatCard: {
    background: '#fff',
    width: '400px',
    height: '550px',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    padding: '1rem',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userBadge: { fontSize: '0.875rem', color: '#4b5563' },
  messageContainer: {
    flex: 1,
    padding: '1rem',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  messageBubble: {
    padding: '0.5rem 0.75rem',
    borderRadius: '12px',
    maxWidth: '70%',
    wordBreak: 'break-word',
  },
  messageAuthor: { fontSize: '0.75rem', opacity: 0.8, marginBottom: '2px' },
  form: { padding: '1rem', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '0.5rem' },
  input: { padding: '0.5rem', width: '100%', marginBottom: '1rem', border: '1px solid #ccc', borderRadius: '4px' },
  chatInput: { flex: 1, padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' },
  button: { padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
};

export default App;