let socket;

const Socket = {
  connect: () => {
    if (socket) return socket;
    
    // Connect to the same origin server
    socket = io();
    
    socket.on('connect', () => {
      console.log('Connected to real-time bidding network');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from bidding network');
    });

    return socket;
  },

  joinAuction: (auctionId, onBidUpdate, onAuctionEnded) => {
    const s = Socket.connect();
    s.emit('joinAuction', auctionId);

    // Register callback for bid updates
    s.off('bidUpdate'); // Clear old listeners
    s.on('bidUpdate', (data) => {
      if (onBidUpdate) onBidUpdate(data);
    });

    // Register callback for auction ending
    s.off('auctionEnded'); // Clear old listeners
    s.on('auctionEnded', (data) => {
      if (onAuctionEnded) onAuctionEnded(data);
    });
  },

  leaveAuction: (auctionId) => {
    if (socket) {
      socket.emit('leaveAuction', auctionId);
      socket.off('bidUpdate');
      socket.off('auctionEnded');
    }
  },

  subscribeToGeneralUpdates: (onAuctionUpdate) => {
    const s = Socket.connect();
    s.on('auctionUpdate', (data) => {
      if (onAuctionUpdate) onAuctionUpdate(data);
    });
  },

  unsubscribeFromGeneralUpdates: () => {
    if (socket) {
      socket.off('auctionUpdate');
    }
  }
};

window.Socket = Socket; // Make it global
