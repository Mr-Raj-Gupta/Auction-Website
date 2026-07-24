import mongoose from 'mongoose';

const auctionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Electronics', 'Art', 'Collectibles', 'Fashion', 'Vehicles', 'Real Estate', 'Sports', 'Other'],
    default: 'Other'
  },
  startingBid: {
    type: Number,
    required: true,
    min: 0.01
  },
  currentBid: {
    type: Number,
    required: true,
    min: 0.01
  },
  currentBidder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'ended'],
    default: 'active'
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure indexes for text search on title/description, category filtering, and status
auctionSchema.index({ title: 'text', description: 'text' });
auctionSchema.index({ category: 1 });
auctionSchema.index({ status: 1 });
auctionSchema.index({ endTime: 1 });

const Auction = mongoose.model('Auction', auctionSchema);
export default Auction;
