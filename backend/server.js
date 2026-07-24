// ==========================================
// BidCraft - Online Real-Time Auction Portal
// Main Backend Server File (server.js)
// ==========================================

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Importing custom routes
import authRoutes from './routes/auth.js';
import auctionRoutes from './routes/auctions.js';
import bidRoutes from './routes/bids.js';

// Models for DB queries in background worker
import Auction from './models/Auction.js';
import User from './models/User.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middlewares
app.use(cors());
app.use(express.json()); // Parsing JSON payloads

// Attaching Socket.io instance to Express app so it can be accessed in routing files
app.set('socketio', io);

// Serving uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Main API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/bids', bidRoutes);

// Serving Frontend Web Files Statically
app.use(express.static(path.join(__dirname, '../frontend')));

// Directing all other web requests to index.html for Single Page feel
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Socket.io Connection Logic for Real-Time Bidding Rooms
io.on('connection', (socket) => {
  console.log(`[SOCKET] User connected: ${socket.id}`);

  // User enters a specific product detail page -> join that product's room
  socket.on('joinAuction', (auctionId) => {
    socket.join(auctionId);
    console.log(`[SOCKET] Socket ${socket.id} joined room for auction ID: ${auctionId}`);
  });

  // User leaves the product detail page -> leave the room
  socket.on('leaveAuction', (auctionId) => {
    socket.leave(auctionId);
    console.log(`[SOCKET] Socket ${socket.id} left room for auction ID: ${auctionId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[SOCKET] User disconnected: ${socket.id}`);
  });
});

// Background Timer Worker: Checks for expired auctions every 5 seconds
const checkExpiredAuctions = async () => {
  try {
    const now = new Date();
    // Querying active auctions whose endTime is in the past
    const expiredAuctions = await Auction.find({
      status: 'active',
      endTime: { $lte: now }
    });

    if (expiredAuctions.length > 0) {
      console.log(`[CRON WORKER] Found ${expiredAuctions.length} auctions to close.`);
    }

    for (const auction of expiredAuctions) {
      auction.status = 'ended';

      if (auction.currentBidder) {
        // Highest bidder is declared the winner
        auction.winner = auction.currentBidder;
        
        // Transfer funds to the seller's wallet
        const seller = await User.findById(auction.seller);
        if (seller) {
          seller.balance += auction.currentBid;
          await seller.save();
          console.log(`[CRON WORKER] Transferred $${auction.currentBid} to seller: ${seller.username}`);
        }
      }

      await auction.save();

      // Retrieve full names to broadcast
      const updatedAuction = await Auction.findById(auction._id)
        .populate('winner', 'username')
        .populate('seller', 'username');

      // Notify clients viewing this item or listing cards on homepage
      io.to(auction._id.toString()).emit('auctionEnded', updatedAuction);
      io.emit('auctionUpdate', updatedAuction);

      console.log(`[CRON WORKER] Auction "${auction.title}" closed successfully. Winner: ${updatedAuction.winner ? updatedAuction.winner.username : 'None'}`);
    }
  } catch (error) {
    console.error('[CRON WORKER ERROR] Error in checkExpiredAuctions:', error);
  }
};

// Running background worker loop
setInterval(checkExpiredAuctions, 5000);

// DB Connection & App Startup
const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/online-auction';

console.log('Connecting to local MongoDB...');
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('>> MongoDB connection established successfully!');
    server.listen(PORT, () => {
      console.log(`>> Web Server is running on port ${PORT}`);
      console.log(`>> Test URL: http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('>> Database connection failed! Error:', err);
  });

