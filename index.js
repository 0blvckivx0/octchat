import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { OctraClient } from './octraClient.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// In-memory message storage (in production, use a database)
const messages = [];
const connectedUsers = new Map(); // octID -> socket.id

// Initialize Octra client
const octraRPC = process.env.OCTRA_RPC || 'https://octra.network';
const octraClient = new OctraClient(octraRPC);

console.log(`🔗 Connecting to Octra network: ${octraRPC}`);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  socket.on('register', (octID) => {
    connectedUsers.set(octID, socket.id);
    console.log(`📝 Registered OctID: ${octID}`);
    
    // Send message history to the new user
    socket.emit('messageHistory', messages);
  });

  socket.on('sendMessage', async (message) => {
    try {
      console.log('📨 Received message from:', message.from);

      // Validate message signature using Ed25519
      console.log(`🔐 Verifying signature for message: "${message.content.substring(0, 30)}..."`);
      const isValid = await octraClient.verifyMessageSignature(
        message.content,
        message.signature,
        message.publicKey
      );

      if (!isValid) {
        console.error('❌ Invalid message signature - rejecting message');
        socket.emit('error', { message: 'Invalid signature - message rejected' });
        return;
      }
      
      console.log('✅ Signature verified successfully');

      // NOTE: Octra Private Transfer Integration
      // In a production system with Octra wallet addresses, you would:
      // 1. Encrypt message content using recipient's public key
      // 2. Call: await octraClient.createPrivateTransfer(fromAddr, toAddr, encryptedMsg, privateKey)
      // 3. Wait for blockchain confirmation
      // 4. Recipients claim transfers using: await octraClient.claimPrivateTransfer(addr, privateKey, transferId)
      // 
      // Current implementation: Uses real-time Socket.io for demo (no Octra wallet required)
      // Users generate Ed25519 keypairs (OctIDs) instead of full Octra wallet addresses

      // Store message
      const storedMessage = {
        ...message,
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        verified: true
      };
      messages.push(storedMessage);

      // Keep only last 100 messages
      if (messages.length > 100) {
        messages.shift();
      }

      // Broadcast to all connected clients
      io.emit('message', storedMessage);

      console.log('✅ Message broadcasted');
    } catch (error) {
      console.error('❌ Error processing message:', error);
      socket.emit('error', { message: 'Failed to process message' });
    }
  });

  socket.on('disconnect', () => {
    // Remove from connected users
    for (const [octID, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(octID);
        console.log(`👋 User disconnected: ${octID}`);
        break;
      }
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    connectedUsers: connectedUsers.size,
    totalMessages: messages.length,
    octraRPC
  });
});

// API endpoint to get messages
app.get('/api/messages', (req, res) => {
  res.json({ messages });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Octchat server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
});
