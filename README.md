# Online Auction Portal (BidCraft)

A secure, real-time online auction system developed using the MERN stack (MongoDB, Express.js, and Node.js) with WebSockets (Socket.io) for instant bidding updates.

---

## 👨‍💻 Project Overview
This is a full-stack real-time bidding application where users can list items for auction, place bids, see live countdown timers, and track items in their personal dashboard (bids placed, won auctions, and items sold).

A mock wallet system is integrated to simulate bidding transactions in Indian Rupees (₹). Placing a bid locks the required funds from the user's wallet. If another user places a higher bid, the locked amount is instantly refunded to the previous bidder's wallet in real-time.

---

## 🛠️ Tech Stack Used
- **Frontend:** HTML5, CSS3 (Vanilla CSS with Custom Variables & Glassmorphism), JavaScript (ES6 Modules)
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (using Mongoose ODM)
- **Real-Time Communication:** Socket.io (WebSockets)
- **Security & Session:** JSON Web Tokens (JWT) for authentication, bcryptjs for password hashing
- **File Upload:** Multer middleware for handling local image uploads

---

## 📁 Project Directory Structure
```text
online-auction-site/
├── backend/
│   ├── middleware/     # JWT Auth middleware
│   ├── models/         # MongoDB Mongoose schemas (User, Auction, Bid)
│   ├── routes/         # Express API routes (auth, auctions, bids)
│   ├── uploads/        # Local storage for uploaded item images
│   ├── package.json    # Backend dependencies
│   ├── server.js       # Main server entry point & Socket.io handling
│   └── seed.js         # Database seeder script
├── frontend/
│   ├── css/
│   │   └── styles.css  # Styling sheet (Theme, layout, animations)
│   ├── js/
│   │   ├── api.js      # Fetch API wrapper
│   │   ├── socket.js   # Socket.io connection helper
│   │   ├── theme.js    # Toast notifications, modals, and navbar handler
│   │   └── app.js      # Page routing & DOM initialization logic
│   ├── index.html      # Landing / Home Page
│   ├── item.html       # Auction Item details and Live Bid room
│   ├── dashboard.html  # Seller listing & Buyer activity console
│   └── login.html      # Login and signup forms
├── data/
│   └── db/             # Local database directory for MongoDB
├── start.sh            # Setup & start script
└── README.md           # Project documentation
```

---

## 🚀 How to Run the Project Local Host

### Prerequisites
Make sure you have Node.js and MongoDB installed on your system.

### Step 1: Start MongoDB Database
Start a local MongoDB instance. In this project, the database stores files locally under `./data/db`.
You can start it with:
```bash
mongod --dbpath ./data/db --port 27017
```

### Step 2: Install Backend Dependencies
Go to the backend directory and run install:
```bash
cd backend
npm install
```

### Step 3: Seed the Database (Required for First Run)
We have created a database seeder script to populate default users and active auctions. Run the following command:
```bash
npm run seed
```
This will create 3 demo users with starting wallets of ₹10,000+:
- `demo1@gmail.com` (Password: `password123`)
- `demo2@gmail.com` (Password: `password123`)
- `demo3@gmail.com` (Password: `password123`)

### Step 4: Run the Server
Run the project using:
```bash
npm start
```
The server will start on **http://localhost:5001**.
Open this URL in your web browser to test the system.

---

## 🔑 Key Features Implemented
1. **Real-time Bidding**: Uses Socket.io to push bids to all connected clients immediately.
2. **Instant Balance Refund**: Bidding locks funds. Getting outbid instantly credits the amount back to the outbid user.
3. **Background Expiry Cron**: Checks database every 5 seconds for expired auctions, closes them, sets the winner, and transfers the bid money to the seller.
4. **Sleek Cyber/Glassmorphism UI**: Uses beautiful gradients, custom alerts/modals, and smooth hover effects.
# Auction-Website
