import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';
import Auction from './models/Auction.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/online-auction';

const seedDatabase = async () => {
  try {
    console.log('Connecting to database for seeding...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    // 1. Clear old collections
    console.log('Clearing old collections...');
    await User.deleteMany({});
    await Auction.deleteMany({});

    // 2. Create users with requested details
    console.log('Creating users...');
    const salt = await bcrypt.genSalt(10);
    
    const hashRaj = await bcrypt.hash('Raj@7252', salt);
    const hashAditya = await bcrypt.hash('Aditya@123', salt);
    const hashSatyam = await bcrypt.hash('Satyam@123', salt);
    const hashPiyush = await bcrypt.hash('Piyush@123', salt);

    const raj = new User({
      username: 'Raj_Gupta',
      email: 'mr.raz.gupta@gmail.com',
      passwordHash: hashRaj,
      balance: 20000.00, // starting budget ₹20,000
      role: 'admin'
    });

    const aditya = new User({
      username: 'Aditya_Kumar',
      email: 'adityakumar2939@gmail.com',
      passwordHash: hashAditya,
      balance: 25000.00 // starting budget ₹25,000
    });

    const satyam = new User({
      username: 'Satyam_Kumar',
      email: 'satyabgt19@gmail.com',
      passwordHash: hashSatyam,
      balance: 30000.00 // starting budget ₹30,000
    });

    const piyush = new User({
      username: 'Piyush_Raj',
      email: 'im.piyushraj@gmail.com',
      passwordHash: hashPiyush,
      balance: 20000.00 // starting budget ₹20,000
    });

    await raj.save();
    await aditya.save();
    await satyam.save();
    await piyush.save();

    console.log(`Users seeded successfully:
      - Raj_Gupta (email: mr.raz.gupta@gmail.com | pass: Raj@7252 | Role: admin)
      - Aditya_Kumar (email: adityakumar2939@gmail.com | pass: Aditya@123)
      - Satyam_Kumar (email: satyabgt19@gmail.com | pass: Satyam@123)
      - Piyush_Raj (email: im.piyushraj@gmail.com | pass: Piyush@123)`);

    // 3. Create active auctions (with new sellers)
    console.log('Creating live auction items...');
    const now = new Date();

    // Lucky Bamboo (Seller: Raj Gupta)
    const item1 = new Auction({
      title: 'Lucky Bamboo Plant (Indoor Office Decor)',
      description: 'A healthy and beautiful Lucky Bamboo plant arranged in a glass pot. Highly popular for office desks, study tables, or indoor home decor. It is widely considered to bring good luck, positive vibes, and prosperity to the space.',
      imageUrl: '/uploads/luckybamboo.jpeg',
      category: 'Other',
      startingBid: 150.00,
      currentBid: 150.00,
      seller: raj._id,
      startTime: now,
      endTime: new Date(now.getTime() + 12 * 60 * 60 * 1000) // Ends in 12 hours
    });

    // AirPods Pro (Seller: Aditya Kumar)
    const item2 = new Auction({
      title: 'Apple AirPods Pro (Second Generation)',
      description: 'Original Apple AirPods Pro with active noise cancellation, adaptive transparency mode, and spatial audio with dynamic head tracking. Comes with the MagSafe charging case (Type-C) and extra ear tips. In pristine condition and working perfectly.',
      imageUrl: '/uploads/airpods.jpeg',
      category: 'Electronics',
      startingBid: 12000.00,
      currentBid: 12000.00,
      seller: aditya._id,
      startTime: now,
      endTime: new Date(now.getTime() + 6 * 60 * 60 * 1000) // Ends in 6 hours
    });

    // Eyeglass Frame (Seller: Satyam Kumar, Bidder: Raj Gupta)
    const item3 = new Auction({
      title: 'Premium Classic Matte Black Eyeglass Frame',
      description: 'A stylish and durable lightweight unisex eyeglass frame in matte black. Made from high-grade acetate material with flexible hinges for comfort. Ready to be fitted with your own prescription lenses.',
      imageUrl: '/uploads/eyeglass.jpeg',
      category: 'Fashion',
      startingBid: 1500.00,
      currentBid: 1550.00,
      currentBidder: raj._id, // Raj placed a bid of 1550
      seller: satyam._id,
      startTime: now,
      endTime: new Date(now.getTime() + 4 * 60 * 60 * 1000) // Ends in 4 hours
    });

    await item1.save();
    await item2.save();
    await item3.save();

    console.log('Auctions successfully seeded.');
    mongoose.connection.close();
    console.log('Connection closed.');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
