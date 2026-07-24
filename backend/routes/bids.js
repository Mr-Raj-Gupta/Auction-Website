import express from 'express';
import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// GET: Bid history for a specific auction
router.get('/auction/:auctionId', async (req, res) => {
  try {
    const bids = await Bid.find({ auctionItem: req.params.auctionId })
      .populate('bidder', 'username')
      .sort({ timestamp: -1 });
    res.json(bids);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST: Place a new bid
router.post('/', auth, async (req, res) => {
  try {
    const { auctionId, amount } = req.body;
    const bidAmount = Number(amount);

    if (!auctionId || !bidAmount || bidAmount <= 0) {
      return res.status(400).json({ message: 'Invalid bid details' });
    }

    const auction = await Auction.findById(auctionId);
    if (!auction) {
      return res.status(404).json({ message: 'Auction not found' });
    }

    // 1. Check if auction is active
    if (auction.status !== 'active' || new Date() > new Date(auction.endTime)) {
      auction.status = 'ended';
      await auction.save();
      return res.status(400).json({ message: 'This auction has ended' });
    }

    // 2. Check if user is the seller
    if (auction.seller.toString() === req.user) {
      return res.status(400).json({ message: 'You cannot bid on your own auction' });
    }

    // 3. Check if bid is higher than current bid (or starting bid if no bids yet)
    const minimumBid = auction.currentBidder ? auction.currentBid + 0.01 : auction.startingBid;
    if (bidAmount < minimumBid) {
      return res.status(400).json({ 
        message: `Bid must be at least ₹${minimumBid.toFixed(2)}` 
      });
    }

    const bidder = await User.findById(req.user);
    if (!bidder) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 4. Check if user has enough balance
    // If user was already the highest bidder, they only need to cover the difference, 
    // but to keep it simple, we refund their previous bid first.
    let isSelfOutbid = false;
    if (auction.currentBidder && auction.currentBidder.toString() === req.user) {
      isSelfOutbid = true;
    }

    // Calculate required funds
    const requiredFunds = isSelfOutbid ? (bidAmount - auction.currentBid) : bidAmount;
    if (bidder.balance < requiredFunds) {
      return res.status(400).json({ 
        message: `Insufficient funds. You need ₹${requiredFunds.toFixed(2)} more.` 
      });
    }

    // 5. Update balances (Refund previous highest bidder, deduct from new bidder)
    if (auction.currentBidder && !isSelfOutbid) {
      // Refund the previous bidder
      const prevBidder = await User.findById(auction.currentBidder);
      if (prevBidder) {
        prevBidder.balance += auction.currentBid;
        await prevBidder.save();
      }
    }

    // Deduct from the new bidder
    bidder.balance -= requiredFunds;
    await bidder.save();

    // 6. Save the new bid record
    const newBid = new Bid({
      auctionItem: auctionId,
      bidder: req.user,
      amount: bidAmount
    });
    await newBid.save();

    // 7. Update Auction
    auction.currentBid = bidAmount;
    auction.currentBidder = req.user;
    await auction.save();

    // Fetch updated auction with populated bidder info to broadcast
    const updatedAuction = await Auction.findById(auctionId)
      .populate('currentBidder', 'username')
      .populate('seller', 'username');

    // 8. Broadcast bid update via Socket.io
    const io = req.app.get('socketio');
    if (io) {
      io.to(auctionId).emit('bidUpdate', {
        auction: updatedAuction,
        newBid: {
          username: bidder.username,
          amount: bidAmount,
          timestamp: newBid.timestamp
        }
      });
      // Also broadcast general update to home page list
      io.emit('auctionUpdate', updatedAuction);
    }

    res.status(201).json({
      message: 'Bid placed successfully',
      auction: updatedAuction,
      balance: bidder.balance
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
