import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  balance: {
    type: Number,
    default: 10000.00 // Default fake starting balance of $10,000 for bidding demo
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Remove sensitive info when converting to JSON
userSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    delete returnedObject.passwordHash;
  }
});

const User = mongoose.model('User', userSchema);
export default User;
