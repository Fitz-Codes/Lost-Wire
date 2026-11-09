import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

//Establish connection to the backend Socket.IO server
const socket = io('http://localhost:5000');

function App() {
  //State management variables
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [chatTarget, setChatTarget] = useState(null);//defaults to no target AKA public chat
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState([]);
  const [unread, setUnread] = useState({});
  const [publicUnread, setPublicUnread] = useState(0);

  //useEffect runs when the component loads
  useEffect(() => {

    //1 Store the list of currently connected usernames update whenever the server broadcasts the user list
    socket.on("user_list", (users) => {
      setOnlineUsers(users);
    });
    
    //2 Fetch existing chat history via HTTP REST request
    axios.get("http://localhost:5000/api/messages", {
      params: {user:username, with:chatTarget},
    })
      .then((response) => {
        // Make sure response.data is an array before setting state
        if (Array.isArray(response.data)) {
          setMessages(response.data);
        } else {
          setMessages([]);
      }
      })
      .catch((error) => console.error("Error fetching chat history:", error));

    //3 Listen for real-time messages coming from backend Socket.IO server
    socket.on("receive_message", (newMessage) => {
      // Append the new message to the existing array of messages if it belongs in the current chat
      const belongsHere = chatTarget
        ? (newMessage.user === chatTarget && newMessage.target === username) || //DM where open client recieves a message
          (newMessage.user === username && newMessage.target === chatTarget)//DM where open client sends a message
        : !newMessage.target;// public chat
      if (belongsHere) {
        setMessages((prev) => [...prev, newMessage]);
      }
      else if (newMessage.target === username && newMessage.user !== username) {
        //A DM sent to me from someone whose chat isn't open
        setUnread((prev) => ({
          ...prev,
          [newMessage.user]: (prev[newMessage.user] || 0) + 1,
        }));
      }
      else if (!newMessage.target && newMessage.user !== username) {
        //A public message from someone else while a DM is open
        setPublicUnread((prev) => prev + 1);
      }
    });

    // Cleanup socket listener on unmount to prevent duplicate listeners
    return () => {
      socket.off("receive_message");
      socket.off("user_list");
    };
  }, [isLoggedIn, chatTarget, username]); 

  // Handle user joining the chat
  const handleJoin = (e) => {
    e.preventDefault();
    if (username.trim()) {
      socket.emit("join", username.trim());
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
        target: chatTarget,
      });
      setMessageText(''); // Clear input box
    }
  };

  //Screen 1 Username Login Prompt
  if (!isLoggedIn) {
    return (
      <div style={styles.centerScreen}>
        <div style={styles.card}>
          <h2 className="welcomeMessage" >Welcome to Lost Wire</h2>
          <form onSubmit={handleJoin}>
            <input
              type="text"
              placeholder="Username..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              required
            />
            <button className="signInButton" type="submit" style={styles.button}>Sign In</button>
          </form>
        </div>
      </div>
    );
  }

  //Screen 2 Main Chat Window
  return (
    <div style={styles.appLayout}>
      {/* Side panel for user list */}
      <aside style={styles.sidePanel}>
        <div
          onClick={() => {
            setChatTarget(null);
            setPublicUnread(0);
          }}
          style={styles.userItem}
        >
          Room Chat
          {publicUnread > 0 && <span style={styles.badge}>{publicUnread}</span>}
        </div>
        <h4 style={styles.sidePanelTitle}>Online Users</h4>
        {onlineUsers.map((user) => (
          <div
            key={user}
            style={styles.userItem}
            onClick={() => {
              if (user !== username) {
                setChatTarget(user);
                setUnread((prev) => ({ ...prev, [user]: 0 }));
              }
            }}
          >
            {user}{user === username ? " (you)" : ""}
            {unread[user] > 0 && <span style={styles.badge}>{unread[user]}</span>}
          </div>
        ))}
      </aside>
      <div style={styles.chatCard}>
        <header style={styles.header}>
          <h3>{chatTarget || 'Public Chat'}</h3>
          <span style={styles.userBadge}><strong>Lost Wire</strong></span>
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
                  backgroundColor: isMe ? '#541b7a' : '#e5e7eb',
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

//Inline CSS
const styles = {
  centerScreen: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#04060a',
    fontFamily: 'sans-serif',
  },
  card: {
    background: '#fff',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    textAlign: 'center',
  },
  appLayout: {
    display: 'flex',
    width: '100vw',
    height: '100vh',
    backgroundColor: '#f3f4f6',
    fontFamily: 'sans-serif',
  },
  sidePanel: {
    width: '260px',
    flexShrink: 0,
    background: '#515151',
    borderRight: '1px solid #e5e7eb',
    padding: '1rem',
    overflowY: 'auto',
    boxSizing: 'border-box',
  },
  sidePanelTitle: { margin: '0 0 1rem' },
  userItem: { padding: '0.5rem 0', color: '#1f2937' },
  badge: {
    marginLeft: '0.5rem',
    background: '#ef4444',
    color: '#fff',
    borderRadius: '999px',
    padding: '0 0.5rem',
    fontSize: '0.75rem',
  },
  chatCard: {
    background: '#2a2828',
    flex: 1,
    minWidth: 0,
    height: '100%',
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
  button: { padding: '0.5rem 1rem', background: '#541b7a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
};

export default App;