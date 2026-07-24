import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const mimetype = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  
  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Only images are allowed (jpg, jpeg, png, webp, gif)'));
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter
});

// GET: All active or ended auctions (with search, category, status filters)
router.get('/', async (req, res) => {
  try {
    const { search, category, status, sortBy } = req.query;
    let query = {};

    // Filter by status (active by default if not specified)
    if (status) {
      query.status = status;
    } else {
      query.status = 'active';
    }

    // Filter by category
    if (category && category !== 'All') {
      query.category = category;
    }

    // Search query on title/description
    if (search) {
      query.$text = { $search: search };
    }

    // Sorting
    let sortOption = { endTime: 1 }; // default sorts by ending soonest
    if (sortBy === 'newest') {
      sortOption = { createdAt: -1 };
    } else if (sortBy === 'currentBidDesc') {
      sortOption = { currentBid: -1 };
    } else if (sortBy === 'currentBidAsc') {
      sortOption = { currentBid: 1 };
    } else if (sortBy === 'endingSoonest') {
      sortOption = { endTime: 1 };
    }

    const auctions = await Auction.find(query)
      .populate('seller', 'username')
      .populate('currentBidder', 'username')
      .sort(sortOption);

    res.json(auctions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET: User's own active/completed listings
router.get('/user/listings', auth, async (req, res) => {
  try {
    const listings = await Auction.find({ seller: req.user })
      .populate('currentBidder', 'username')
      .sort({ createdAt: -1 });
    res.json(listings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET: Auctions that the user bid on
router.get('/user/bids', auth, async (req, res) => {
  try {
    // Find all unique auction IDs bid on by this user
    const userBids = await Bid.find({ bidder: req.user }).distinct('auctionItem');
    
    const auctions = await Auction.find({ _id: { $in: userBids } })
      .populate('seller', 'username')
      .populate('currentBidder', 'username')
      .sort({ endTime: 1 });
      
    res.json(auctions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET: Auctions won by the user
router.get('/user/won', auth, async (req, res) => {
  try {
    const wonAuctions = await Auction.find({ winner: req.user, status: 'ended' })
      .populate('seller', 'username')
      .sort({ endTime: -1 });
    res.json(wonAuctions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET: Specific auction item detail
router.get('/:id', async (req, res) => {
  try {
    const auction = await Auction.findById(req.id || req.params.id)
      .populate('seller', 'username')
      .populate('currentBidder', 'username');

    if (!auction) {
      return res.status(404).json({ message: 'Auction not found' });
    }

    res.json(auction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST: Create a new auction
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { title, description, category, startingBid, durationHours } = req.body;

    if (!title || !description || !category || !startingBid || !durationHours) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    let imageUrl = '/uploads/placeholder.png'; // default placeholder
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.imageUrl) {
      imageUrl = req.body.imageUrl;
    }

    const start = new Date();
    const end = new Date(start.getTime() + Number(durationHours) * 60 * 60 * 1000);

    const newAuction = new Auction({
      title,
      description,
      imageUrl,
      category,
      startingBid: Number(startingBid),
      currentBid: Number(startingBid),
      seller: req.user,
      startTime: start,
      endTime: end
    });

    const savedAuction = await newAuction.save();
    res.status(201).json(savedAuction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST: Confirm the current highest bid (Ends the auction early)
router.post('/:id/confirm', auth, async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) {
      return res.status(404).json({ message: 'Auction not found' });
    }

    // Verify if logged-in user is the seller
    if (auction.seller.toString() !== req.user) {
      return res.status(403).json({ message: 'Only the seller can confirm the bid' });
    }

    if (auction.status !== 'active') {
      return res.status(400).json({ message: 'Auction is not active' });
    }

    if (!auction.currentBidder) {
      return res.status(400).json({ message: 'No bids have been placed yet' });
    }

    // Mark auction as ended and set winner
    auction.status = 'ended';
    auction.winner = auction.currentBidder;
    await auction.save();

    // Credit the seller's wallet with the bid amount
    const seller = await User.findById(auction.seller);
    if (seller) {
      seller.balance += auction.currentBid;
      await seller.save();
    }

    // Fetch updated details to broadcast
    const updatedAuction = await Auction.findById(auction._id)
      .populate('winner', 'username')
      .populate('seller', 'username')
      .populate('currentBidder', 'username');

    // Socket.io broadcasts
    const io = req.app.get('socketio');
    if (io) {
      io.to(auction._id.toString()).emit('auctionEnded', updatedAuction);
      io.emit('auctionUpdate', updatedAuction);
    }

    res.json({
      message: 'Bid confirmed and auction closed successfully',
      auction: updatedAuction
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST: Reject the current highest bid
router.post('/:id/reject', auth, async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) {
      return res.status(404).json({ message: 'Auction not found' });
    }

    // Verify if logged-in user is the seller
    if (auction.seller.toString() !== req.user) {
      return res.status(403).json({ message: 'Only the seller can reject the bid' });
    }

    if (auction.status !== 'active') {
      return res.status(400).json({ message: 'Auction is not active' });
    }

    if (!auction.currentBidder) {
      return res.status(400).json({ message: 'No bids have been placed yet' });
    }

    const currentHighestBidder = await User.findById(auction.currentBidder);
    if (currentHighestBidder) {
      // Refund the rejected bidder
      currentHighestBidder.balance += auction.currentBid;
      await currentHighestBidder.save();
    }

    // Delete the active highest bid record
    await Bid.findOneAndDelete({
      auctionItem: auction._id,
      amount: auction.currentBid
    });

    // Find the previous highest bid
    const prevBid = await Bid.findOne({ auctionItem: auction._id }).sort({ timestamp: -1 });

    if (prevBid) {
      auction.currentBid = prevBid.amount;
      auction.currentBidder = prevBid.bidder;
    } else {
      auction.currentBid = auction.startingBid;
      auction.currentBidder = null;
    }

    await auction.save();

    // Fetch updated details to broadcast
    const updatedAuction = await Auction.findById(auction._id)
      .populate('seller', 'username')
      .populate('currentBidder', 'username');

    // Socket.io broadcasts to update clients viewing this item in real-time
    const io = req.app.get('socketio');
    if (io) {
      io.to(auction._id.toString()).emit('bidUpdate', {
        auction: updatedAuction,
        newBid: prevBid ? {
          username: updatedAuction.currentBidder.username,
          amount: prevBid.amount,
          timestamp: prevBid.timestamp
        } : null,
        isReversion: true // flag to tell client to reload history
      });
      io.emit('auctionUpdate', updatedAuction);
    }

    res.json({
      message: 'Bid rejected and balance refunded successfully',
      auction: updatedAuction
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
