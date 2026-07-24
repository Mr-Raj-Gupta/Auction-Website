import mongoose from 'mongoose';

const bidSchema = new mongoose.Schema({
  auctionItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Auction',
    required: true
  },
  bidder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Compound index to quickly fetch bid histories per auction, sorted by amount desc or timestamp desc
bidSchema.index({ auctionItem: 1, amount: -1 });
bidSchema.index({ auctionItem: 1, timestamp: -1 });

const Bid = mongoose.model('Bid', bidSchema);
export default Bid;
