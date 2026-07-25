import express from 'express';
import User from '../models/User.js';
import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import auth from '../middleware/auth.js';
import adminOnly from '../middleware/admin.js';

const router = express.Router();

// GET: Overall admin statistics
router.get('/stats', auth, adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({});
    const totalActiveAuctions = await Auction.countDocuments({ status: 'active' });
    const totalEndedAuctions = await Auction.countDocuments({ status: 'ended' });
    const totalBids = await Bid.countDocuments({});

    res.json({
      totalUsers,
      totalActiveAuctions,
      totalEndedAuctions,
      totalBids
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET: All users list
router.get('/users', auth, adminOnly, async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST: Modify a user's wallet balance
router.post('/users/:id/balance', auth, adminOnly, async (req, res) => {
  try {
    const { amount } = req.body;
    if (amount === undefined || isNaN(amount) || amount < 0) {
      return res.status(400).json({ message: 'Invalid balance amount' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.balance = Number(amount);
    await user.save();

    res.json({
      message: `Balance updated successfully for ${user.username}`,
      user
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE: Cancel/delete an auction listing
router.delete('/auctions/:id', auth, adminOnly, async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) {
      return res.status(404).json({ message: 'Auction not found' });
    }

    // Refund the active highest bidder if auction is active
    if (auction.status === 'active' && auction.currentBidder) {
      const activeBidder = await User.findById(auction.currentBidder);
      if (activeBidder) {
        activeBidder.balance += auction.currentBid;
        await activeBidder.save();
      }
    }

    // Delete associated bid history
    await Bid.deleteMany({ auctionItem: auction._id });

    // Delete the auction
    await Auction.findByIdAndDelete(auction._id);

    // Notify clients viewing this auction via WebSockets
    const io = req.app.get('socketio');
    if (io) {
      io.to(auction._id.toString()).emit('auctionDeleted', {
        message: 'This auction has been deleted by an administrator.'
      });
      io.emit('auctionUpdate', { _id: auction._id, status: 'deleted' });
    }

    res.json({
      message: `Listing "${auction.title}" has been deleted and bidder funds refunded (if applicable)`
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
