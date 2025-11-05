import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { generateOctID, getStoredIdentity, signMessage } from './utils/octid'

function App() {
  const [identity, setIdentity] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState('')
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    // Check for stored identity
    const stored = getStoredIdentity()
    if (stored) {
      setIdentity(stored)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (identity) {
      // Connect to Socket.io server
      const serverUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3000' 
        : window.location.origin

      const newSocket = io(serverUrl, {
        transports: ['websocket', 'polling']
      })

      newSocket.on('connect', () => {
        console.log('Connected to server')
        setConnected(true)
        // Register our OctID
        newSocket.emit('register', identity.octID)
      })

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server')
        setConnected(false)
      })

      newSocket.on('message', (message) => {
        setMessages(prev => [...prev, message])
      })

      newSocket.on('messageHistory', (history) => {
        setMessages(history)
      })

      setSocket(newSocket)

      return () => {
        newSocket.close()
      }
    }
  }, [identity])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleGenerateOctID = async () => {
    try {
      const newIdentity = await generateOctID()
      setIdentity(newIdentity)
    } catch (error) {
      console.error('Failed to generate OctID:', error)
      alert('Failed to generate OctID. Please try again.')
    }
  }

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !socket || !identity) return

    try {
      // Sign the message
      const signature = await signMessage(messageInput, identity.privateKey)

      const message = {
        from: identity.octID,
        publicKey: identity.publicKey,
        content: messageInput,
        signature,
        timestamp: Date.now()
      }

      socket.emit('sendMessage', message)
      setMessageInput('')
    } catch (error) {
      console.error('Failed to send message:', error)
      alert('Failed to send message. Please try again.')
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Loading...</div>
      </div>
    )
  }

  if (!identity) {
    return (
      <div className="app">
        <div className="header">
          <div>
            <div className="title">Octchat</div>
            <div className="subtitle">Built for the Octra Ecosystem</div>
          </div>
        </div>
        <div className="setup-container">
          <div className="setup-box">
            <h2>Welcome to Octchat</h2>
            <p>
              Generate your unique OctID to start chatting with privacy-first encrypted messaging 
              powered by Octra's private transfer technology.
            </p>
            <p style={{ fontSize: '0.85rem', marginTop: '1rem', color: '#666' }}>
              Your keypair will be generated locally and stored securely in your browser. 
              Your private key never leaves your device.
            </p>
            <button className="btn" onClick={handleGenerateOctID}>
              Generate OctID
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="header">
        <div>
          <div className="title">Octchat</div>
          <div className="subtitle">Built for the Octra Ecosystem</div>
        </div>
        <div className="octid-display">
          <span className="octid-label">Your OctID:</span>
          <span className="octid-value">{identity.octID}</span>
        </div>
        <div className="status-indicator">
          {connected && <div className="status-dot"></div>}
          <span>{connected ? 'Connected' : 'Connecting...'}</span>
        </div>
      </div>

      <div className="chat-container">
        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="empty-state">
              <p>No messages yet</p>
              <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                Be the first to send a message!
              </p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div 
                key={index} 
                className={`message ${msg.from === identity.octID ? 'own' : ''}`}
              >
                <div className="message-header">
                  <span className="message-sender">
                    {msg.from === identity.octID ? 'You' : msg.from}
                  </span>
                  <span className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="message-content">{msg.content}</div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-container">
          <textarea
            className="message-input"
            placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button className="btn send-btn" onClick={handleSendMessage}>
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
