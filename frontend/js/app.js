document.addEventListener('DOMContentLoaded', () => {
  // Sync global navbar elements on all pages
  Theme.updateNavbar();
  
  // Listen for balance updates from deposit modal
  window.addEventListener('balanceUpdated', (e) => {
    const navBalance = document.getElementById('nav-user-balance');
    if (navBalance) navBalance.textContent = `₹${Number(e.detail).toFixed(2)}`;
    
    const dashBalance = document.getElementById('dash-user-balance');
    if (dashBalance) dashBalance.textContent = `₹${Number(e.detail).toFixed(2)}`;
  });

  // Page Routing Router Initializers
  if (document.getElementById('home-page')) {
    initHomePage();
  } else if (document.getElementById('item-page')) {
    initItemPage();
  } else if (document.getElementById('dashboard-page')) {
    initDashboardPage();
  } else if (document.getElementById('auth-page')) {
    initAuthPage();
  }
});

/* ==========================================================================
   1. HOME PAGE LOGIC
   ========================================================================== */
function initHomePage() {
  let auctions = [];
  let timerInterval;

  const searchInput = document.getElementById('search-input');
  const categorySelect = document.getElementById('category-filter');
  const sortBySelect = document.getElementById('sort-filter');
  const grid = document.getElementById('auctions-grid');

  const fetchAndRender = async () => {
    try {
      const search = searchInput ? searchInput.value : '';
      const category = categorySelect ? categorySelect.value : 'All';
      const sortBy = sortBySelect ? sortBySelect.value : 'endingSoonest';
      
      auctions = await API.getAuctions({ search, category, sortBy, status: 'active' });
      renderGrid();
      startTimers();
    } catch (err) {
      console.error(err);
      Theme.showAlert('Could not load auctions. Make sure the database is running.', 'error');
    }
  };

  const renderGrid = () => {
    if (!grid) return;
    if (auctions.length === 0) {
      grid.innerHTML = `
        <div class="empty-state glass" style="grid-column: 1 / -1;">
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><path d="M8 12h8"></path></svg>
          <h3>No Live Auctions Found</h3>
          <p>Try adjustments to your search queries or category filters.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = auctions.map(item => {
      const timeInfo = Theme.formatTimeRemaining(item.endTime);
      const isUrgent = timeInfo.urgent ? 'urgent' : '';
      const bidderName = item.currentBidder ? item.currentBidder.username : 'No bids';

      return `
        <div class="auction-card glass" data-id="${item._id}">
          <div class="card-image-wrapper">
            <img src="${item.imageUrl}" class="card-image" alt="${item.title}" onerror="this.src='/uploads/placeholder.png'">
            <span class="card-badge">${item.category}</span>
          </div>
          <div class="card-content">
            <h3 class="card-title">${item.title}</h3>
            <p class="card-seller">Listed by <b>${item.seller ? item.seller.username : 'Unknown'}</b></p>
            <div class="card-bid-info">
              <div>
                <div class="bid-label">Current Bid</div>
                <div class="bid-value">₹${Number(item.currentBid).toFixed(2)}</div>
              </div>
              <div style="text-align: right;">
                <div class="bid-label">High Bidder</div>
                <div class="bid-value" style="font-size: 0.9rem; font-weight: 600; color: var(--color-text-primary);">${bidderName}</div>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 1rem; border-top: 1px solid var(--border-glass);">
              <div class="card-timer-wrapper">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                <span class="timer-value ${isUrgent}" data-end="${item.endTime}">${timeInfo.text}</span>
              </div>
              <a href="item.html?id=${item._id}" class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.85rem;">Bid Now</a>
            </div>
          </div>
        </div>
      `;
    }).join('');
  };

  const startTimers = () => {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      document.querySelectorAll('.timer-value').forEach(el => {
        const endTime = el.getAttribute('data-end');
        const timeInfo = Theme.formatTimeRemaining(endTime);
        el.textContent = timeInfo.text;
        
        if (timeInfo.urgent) {
          el.classList.add('urgent');
        } else {
          el.classList.remove('urgent');
        }

        if (timeInfo.expired) {
          el.closest('.auction-card')?.remove(); // remove expired from home list
        }
      });
    }, 1000);
  };

  // Add filters listeners
  if (searchInput) searchInput.addEventListener('input', fetchAndRender);
  if (categorySelect) categorySelect.addEventListener('change', fetchAndRender);
  if (sortBySelect) sortBySelect.addEventListener('change', fetchAndRender);

  // Initial load
  fetchAndRender();

  // Socket updates (Homepage list gets live updates)
  Socket.subscribeToGeneralUpdates((updatedAuction) => {
    // Find item index
    const index = auctions.findIndex(a => a._id === updatedAuction._id);
    if (index !== -1) {
      if (updatedAuction.status === 'ended') {
        auctions.splice(index, 1); // remove expired
      } else {
        auctions[index] = updatedAuction; // update details
      }
      renderGrid();
    }
  });

  // Cleanup on unload
  window.addEventListener('beforeunload', () => {
    if (timerInterval) clearInterval(timerInterval);
    Socket.unsubscribeFromGeneralUpdates();
  });
}

/* ==========================================================================
   2. ITEM DETAILS PAGE LOGIC
   ========================================================================== */
function initItemPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const auctionId = urlParams.get('id');
  
  if (!auctionId) {
    window.location.href = 'index.html';
    return;
  }

  let auction = null;
  let timerInterval;

  const titleEl = document.getElementById('detail-title');
  const categoryEl = document.getElementById('detail-category');
  const imageEl = document.getElementById('detail-image');
  const descriptionEl = document.getElementById('detail-description');
  const sellerEl = document.getElementById('detail-seller');
  const startPriceEl = document.getElementById('detail-start-price');
  
  const currentBidEl = document.getElementById('detail-current-bid');
  const bidderEl = document.getElementById('detail-bidder-name');
  const bidHistoryList = document.getElementById('bid-history-list');
  const countdownEl = document.getElementById('detail-countdown');
  const bidInput = document.getElementById('bid-amount');
  const bidForm = document.getElementById('bid-form');
  const placeBidBtn = document.getElementById('place-bid-btn');

  // Seller Action DOM elements
  const sellerActionsWrapper = document.getElementById('seller-actions-wrapper');
  const confirmBidBtn = document.getElementById('confirm-bid-btn');
  const rejectBidBtn = document.getElementById('reject-bid-btn');

  const loadDetails = async () => {
    try {
      auction = await API.getAuctionDetails(auctionId);
      renderDetails();
      loadBidHistory();
      
      // Real-time Socket sync
      Socket.joinAuction(auctionId, handleRealtimeBid, handleAuctionEnd);

      // Start Detail Timer
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = setInterval(updateTimer, 1000);
      updateTimer();
    } catch (err) {
      console.error(err);
      Theme.showAlert(err.message, 'error');
    }
  };

  const renderDetails = () => {
    if (!auction) return;
    
    titleEl.textContent = auction.title;
    categoryEl.textContent = auction.category;
    imageEl.src = auction.imageUrl;
    descriptionEl.textContent = auction.description;
    sellerEl.textContent = auction.seller ? auction.seller.username : 'Unknown';
    startPriceEl.textContent = `₹${Number(auction.startingBid).toFixed(2)}`;
    
    currentBidEl.textContent = `₹${Number(auction.currentBid).toFixed(2)}`;
    bidderEl.innerHTML = auction.currentBidder 
      ? `Highest bidder: <span>${auction.currentBidder.username}</span>`
      : 'No bids placed yet';

    // Set default input amount
    const minBid = auction.currentBidder ? auction.currentBid + 1.00 : auction.startingBid;
    bidInput.value = Math.ceil(minBid);
    bidInput.min = minBid;

    // Check if the current user is the listing seller
    const user = API.getUser();
    const isSeller = user && auction.seller && (auction.seller._id === user.id || auction.seller === user.id);

    if (isSeller) {
      // Sellers cannot place bids on their own items
      bidForm.style.display = 'none';

      // Show confirm/reject options if active and someone has bid
      if (auction.currentBidder && auction.status === 'active') {
        sellerActionsWrapper.style.display = 'block';
      } else {
        sellerActionsWrapper.style.display = 'none';
      }
    } else {
      // Regular buyers see the bid form
      bidForm.style.display = 'block';
      sellerActionsWrapper.style.display = 'none';
    }

    // Handle end-of-auction states
    if (auction.status === 'ended') {
      handleAuctionEnd(auction);
    }
  };

  const loadBidHistory = async () => {
    try {
      const bids = await API.getBidHistory(auctionId);
      renderBidHistory(bids);
    } catch (err) {
      console.error(err);
    }
  };

  const renderBidHistory = (bids) => {
    if (!bidHistoryList) return;
    if (bids.length === 0) {
      bidHistoryList.innerHTML = '<div class="empty-state" style="padding: 1rem 0;">No bids yet. Be the first to bid!</div>';
      return;
    }

    bidHistoryList.innerHTML = bids.map((bid, index) => {
      const date = new Date(bid.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const firstClass = index === 0 ? 'first' : '';
      return `
        <div class="bid-list-item ${firstClass}">
          <div class="bid-user-details">
            <span class="bid-user">${bid.bidder.username}</span>
            <span class="bid-time">${date}</span>
          </div>
          <span class="bid-price">₹${Number(bid.amount).toFixed(2)}</span>
        </div>
      `;
    }).join('');
  };

  const updateTimer = () => {
    if (!auction) return;
    const timeInfo = Theme.formatTimeRemaining(auction.endTime);
    countdownEl.textContent = timeInfo.text;
    
    if (timeInfo.urgent) {
      countdownEl.classList.add('urgent');
    } else {
      countdownEl.classList.remove('urgent');
    }

    if (timeInfo.expired && auction.status === 'active') {
      clearInterval(timerInterval);
      loadDetails(); // reload to get winning state
    }
  };

  // Real-time websocket events
  const handleRealtimeBid = (data) => {
    auction = data.auction;
    renderDetails();
    loadBidHistory();
    
    if (data.newBid && !data.isReversion) {
      Theme.showAlert(`New bid placed: ₹${data.newBid.amount.toFixed(2)} by ${data.newBid.username}`, 'info');
    } else if (data.isReversion) {
      Theme.showAlert(`The highest bid was rejected by the seller. Bidding reverted.`, 'warning');
    }
  };

  const handleAuctionEnd = (endedAuction) => {
    auction = endedAuction;
    clearInterval(timerInterval);
    countdownEl.textContent = 'Ended';
    countdownEl.classList.remove('urgent');
    
    // Disable inputs
    bidInput.disabled = true;
    placeBidBtn.disabled = true;
    placeBidBtn.textContent = 'Auction Closed';
    placeBidBtn.style.background = 'var(--color-text-secondary)';
    
    const winnerName = endedAuction.winner ? endedAuction.winner.username : 'None (No bids)';
    bidderEl.innerHTML = `Auction Ended. Winner: <span style="color: var(--success);">${winnerName}</span>`;
    
    Theme.showAlert(`Auction for "${endedAuction.title}" has closed. Winner: ${winnerName}`, 'success');
  };

  // Place Bid action handler
  if (bidForm) {
    bidForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const user = API.getUser();
      if (!user) {
        Theme.showAlert('Please login to place a bid', 'error');
        setTimeout(() => window.location.href = `login.html?redirect=item.html?id=${auctionId}`, 1500);
        return;
      }

      const amount = Number(bidInput.value);
      const minBid = auction.currentBidder ? auction.currentBid + 0.01 : auction.startingBid;
      
      if (amount < minBid) {
        Theme.showAlert(`Your bid must be at least ₹${minBid.toFixed(2)}`, 'error');
        return;
      }

      try {
        placeBidBtn.disabled = true;
        placeBidBtn.textContent = 'Placing Bid...';
        
        const res = await API.placeBid(auctionId, amount);
        Theme.showAlert(res.message, 'success');
        Theme.updateNavbar(); // update header balance badge
        
        // Refresh local details
        renderDetails();
        loadBidHistory();
      } catch (err) {
        Theme.showAlert(err.message, 'error');
      } finally {
        placeBidBtn.disabled = false;
        placeBidBtn.textContent = 'Place Bid';
      }
    });
  }

  // Confirm Bid button handler
  if (confirmBidBtn) {
    confirmBidBtn.addEventListener('click', async () => {
      const confirmText = 'Are you sure you want to accept this bid? The auction will close immediately, and funds will be transferred to your wallet.';
      if (!confirm(confirmText)) return;

      try {
        confirmBidBtn.disabled = true;
        confirmBidBtn.textContent = 'Confirming...';
        const res = await API.confirmBid(auctionId);
        Theme.showAlert(res.message, 'success');
        
        // Reload details and status
        auction = res.auction;
        renderDetails();
        loadBidHistory();
      } catch (err) {
        Theme.showAlert(err.message, 'error');
      } finally {
        confirmBidBtn.disabled = false;
        confirmBidBtn.textContent = 'Confirm Bid';
      }
    });
  }

  // Reject Bid button handler
  if (rejectBidBtn) {
    rejectBidBtn.addEventListener('click', async () => {
      const confirmText = 'Are you sure you want to reject this bid? The bidder will be refunded instantly, and the listing will revert to the previous highest bid.';
      if (!confirm(confirmText)) return;

      try {
        rejectBidBtn.disabled = true;
        rejectBidBtn.textContent = 'Rejecting...';
        const res = await API.rejectBid(auctionId);
        Theme.showAlert(res.message, 'success');
        
        // Reload details and status
        auction = res.auction;
        renderDetails();
        loadBidHistory();
      } catch (err) {
        Theme.showAlert(err.message, 'error');
      } finally {
        rejectBidBtn.disabled = false;
        rejectBidBtn.textContent = 'Reject Bid';
      }
    });
  }

  // Initial load
  loadDetails();

  // Cleanup on leave
  window.addEventListener('beforeunload', () => {
    if (timerInterval) clearInterval(timerInterval);
    Socket.leaveAuction(auctionId);
  });
}

/* ==========================================================================
   3. DASHBOARD PAGE LOGIC
   ========================================================================== */
function initDashboardPage() {
  const user = API.getUser();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  // Set Profile DOM Elements
  document.getElementById('dash-avatar').textContent = user.username.charAt(0).toUpperCase();
  document.getElementById('dash-username').textContent = user.username;
  document.getElementById('dash-email').textContent = user.email;
  document.getElementById('dash-user-balance').textContent = `₹${Number(user.balance).toFixed(2)}`;

  // Tab switching setup
  const menuItems = document.querySelectorAll('.menu-item');
  const panels = document.querySelectorAll('.dashboard-content-panel');

  const switchTab = (tabId) => {
    menuItems.forEach(item => {
      if (item.getAttribute('data-tab') === tabId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    panels.forEach(panel => {
      if (panel.id === `${tabId}-panel`) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });

    // Run actions specific to tab
    if (tabId === 'listings') {
      loadSellerListings();
    } else if (tabId === 'bids') {
      loadBuyerBids();
    } else if (tabId === 'won') {
      loadBuyerWon();
    }
  };

  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.getAttribute('data-tab');
      if (tabId === 'logout') {
        API.logout();
        Theme.showAlert('Logged out successfully', 'info');
        setTimeout(() => window.location.href = 'index.html', 1000);
      } else {
        switchTab(tabId);
      }
    });
  });

  // Tab 1: Create Auction Listings Form submission logic
  const createForm = document.getElementById('create-auction-form');
  if (createForm) {
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(createForm);
      const submitBtn = createForm.querySelector('button[type="submit"]');

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Listing Item...';

        await API.createAuction(formData);
        Theme.showAlert('Auction created successfully!', 'success');
        createForm.reset();
        switchTab('listings'); // Switch to active listings tab
      } catch (err) {
        Theme.showAlert(err.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Launch Live Auction';
      }
    });
  }

  // Tab 2: Seller active listings
  const loadSellerListings = async () => {
    const listContainer = document.getElementById('seller-listings-container');
    if (!listContainer) return;

    listContainer.innerHTML = '<div style="text-align: center; padding: 2rem;">Loading your listings...</div>';

    try {
      const data = await API.getUserListings();
      if (data.length === 0) {
        listContainer.innerHTML = `
          <div class="empty-state glass">
            <h3>No Auctions Created Yet</h3>
            <p>You haven't listed anything for sale. Create a listing to get started!</p>
            <button class="btn btn-primary" style="margin-top: 1rem;" onclick="document.querySelector('[data-tab=\\'create\\']').click()">Create Listing</button>
          </div>
        `;
        return;
      }

      listContainer.innerHTML = `
        <table class="glass" style="width: 100%; border-collapse: collapse; overflow: hidden; margin-top: 1rem;">
          <thead>
            <tr style="text-align: left; background: rgba(255, 255, 255, 0.03); border-bottom: 1px solid var(--border-glass);">
              <th style="padding: 1rem;">Item</th>
              <th style="padding: 1rem;">Status</th>
              <th style="padding: 1rem;">Highest Bid</th>
              <th style="padding: 1rem;">Ends</th>
              <th style="padding: 1rem;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(item => {
              const statusBadge = item.status === 'active' 
                ? `<span style="color: var(--secondary); background: rgba(6, 182, 212, 0.1); padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: 700;">Live</span>`
                : `<span style="color: var(--error); background: rgba(239, 68, 68, 0.1); padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: 700;">Closed</span>`;
              
              const bidDetails = item.currentBidder 
                ? `₹${item.currentBid.toFixed(2)} (${item.currentBidder.username})`
                : `₹${item.startingBid.toFixed(2)} (No bids)`;
              
              const endTime = new Date(item.endTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });

              return `
                <tr style="border-bottom: 1px solid var(--border-glass);">
                  <td style="padding: 1rem; display: flex; align-items: center; gap: 1rem;">
                    <img src="${item.imageUrl}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;" onerror="this.src='/uploads/placeholder.png'">
                    <span style="font-weight: 600;">${item.title}</span>
                  </td>
                  <td style="padding: 1rem;">${statusBadge}</td>
                  <td style="padding: 1rem; font-weight: 700; color: var(--secondary);">${bidDetails}</td>
                  <td style="padding: 1rem; color: var(--color-text-secondary);">${endTime}</td>
                  <td style="padding: 1rem;">
                    <a href="item.html?id=${item._id}" class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">View</a>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    } catch (err) {
      listContainer.innerHTML = `<div style="color: var(--error); padding: 2rem;">Error: ${err.message}</div>`;
    }
  };

  // Tab 3: Buyer active bids
  const loadBuyerBids = async () => {
    const listContainer = document.getElementById('buyer-bids-container');
    if (!listContainer) return;

    listContainer.innerHTML = '<div style="text-align: center; padding: 2rem;">Loading your active bids...</div>';

    try {
      const data = await API.getUserBids();
      if (data.length === 0) {
        listContainer.innerHTML = `
          <div class="empty-state glass">
            <h3>No Active Bids</h3>
            <p>You haven't bid on any live auctions yet.</p>
            <a href="index.html" class="btn btn-primary" style="margin-top: 1rem;">Browse Auctions</a>
          </div>
        `;
        return;
      }

      listContainer.innerHTML = `
        <table class="glass" style="width: 100%; border-collapse: collapse; overflow: hidden; margin-top: 1rem;">
          <thead>
            <tr style="text-align: left; background: rgba(255, 255, 255, 0.03); border-bottom: 1px solid var(--border-glass);">
              <th style="padding: 1rem;">Item</th>
              <th style="padding: 1rem;">Your Status</th>
              <th style="padding: 1rem;">Current High Bid</th>
              <th style="padding: 1rem;">Ends</th>
              <th style="padding: 1rem;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(item => {
              const isHighBidder = item.currentBidder && item.currentBidder._id === user.id;
              const statusBadge = isHighBidder 
                ? `<span style="color: var(--success); background: rgba(16, 185, 129, 0.1); padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: 700;">Highest Bidder</span>`
                : `<span style="color: var(--warning); background: rgba(245, 158, 11, 0.1); padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: 700;">Outbid</span>`;
              
              const bidDetails = `₹${item.currentBid.toFixed(2)}`;
              const endTime = new Date(item.endTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });

              return `
                <tr style="border-bottom: 1px solid var(--border-glass);">
                  <td style="padding: 1rem; display: flex; align-items: center; gap: 1rem;">
                    <img src="${item.imageUrl}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;" onerror="this.src='/uploads/placeholder.png'">
                    <span style="font-weight: 600;">${item.title}</span>
                  </td>
                  <td style="padding: 1rem;">${statusBadge}</td>
                  <td style="padding: 1rem; font-weight: 700; color: var(--secondary);">${bidDetails}</td>
                  <td style="padding: 1rem; color: var(--color-text-secondary);">${endTime}</td>
                  <td style="padding: 1rem;">
                    <a href="item.html?id=${item._id}" class="btn btn-primary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">${isHighBidder ? 'View' : 'Bid Again'}</a>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    } catch (err) {
      listContainer.innerHTML = `<div style="color: var(--error); padding: 2rem;">Error: ${err.message}</div>`;
    }
  };

  // Tab 4: Won auctions
  const loadBuyerWon = async () => {
    const listContainer = document.getElementById('buyer-won-container');
    if (!listContainer) return;

    listContainer.innerHTML = '<div style="text-align: center; padding: 2rem;">Loading won auctions...</div>';

    try {
      const data = await API.getUserWonAuctions();
      if (data.length === 0) {
        listContainer.innerHTML = `
          <div class="empty-state glass">
            <h3>No Won Auctions Yet</h3>
            <p>Place your bids and win awesome items!</p>
            <a href="index.html" class="btn btn-primary" style="margin-top: 1rem;">Browse Auctions</a>
          </div>
        `;
        return;
      }

      listContainer.innerHTML = `
        <table class="glass" style="width: 100%; border-collapse: collapse; overflow: hidden; margin-top: 1rem;">
          <thead>
            <tr style="text-align: left; background: rgba(255, 255, 255, 0.03); border-bottom: 1px solid var(--border-glass);">
              <th style="padding: 1rem;">Item</th>
              <th style="padding: 1rem;">Seller</th>
              <th style="padding: 1rem;">Final Win Price</th>
              <th style="padding: 1rem;">Closed Date</th>
              <th style="padding: 1rem;">Receipt</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(item => {
              const endTime = new Date(item.endTime).toLocaleDateString();
              const sellerName = item.seller ? item.seller.username : 'Unknown';

              return `
                <tr style="border-bottom: 1px solid var(--border-glass);">
                  <td style="padding: 1rem; display: flex; align-items: center; gap: 1rem;">
                    <img src="${item.imageUrl}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;" onerror="this.src='/uploads/placeholder.png'">
                    <span style="font-weight: 600;">${item.title}</span>
                  </td>
                  <td style="padding: 1rem; color: var(--color-text-secondary);">${sellerName}</td>
                  <td style="padding: 1rem; font-weight: 700; color: var(--success);">₹${item.currentBid.toFixed(2)}</td>
                  <td style="padding: 1rem; color: var(--color-text-secondary);">${endTime}</td>
                  <td style="padding: 1rem;">
                    <span style="color: var(--success); font-weight: 600; font-size: 0.85rem;">Paid & Secured</span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    } catch (err) {
      listContainer.innerHTML = `<div style="color: var(--error); padding: 2rem;">Error: ${err.message}</div>`;
    }
  };

  // Default view
  switchTab('create');
}

/* ==========================================================================
   4. AUTHENTICATION LOGIC
   ========================================================================== */
function initAuthPage() {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const switchLogin = document.getElementById('switch-to-login');
  const switchSignup = document.getElementById('switch-to-signup');
  const cardTitle = document.getElementById('auth-card-title');
  const cardSub = document.getElementById('auth-card-sub');

  const urlParams = new URLSearchParams(window.location.search);
  const startSignup = urlParams.get('signup');

  const toggleAuthMode = (toSignup) => {
    if (toSignup) {
      loginForm.style.display = 'none';
      signupForm.style.display = 'block';
      cardTitle.textContent = 'Create Account';
      cardSub.textContent = 'Register on our premium auction portal';
    } else {
      loginForm.style.display = 'block';
      signupForm.style.display = 'none';
      cardTitle.textContent = 'Welcome Back';
      cardSub.textContent = 'Sign in to access live real-time auctions';
    }
  };

  if (switchSignup) switchSignup.addEventListener('click', () => toggleAuthMode(true));
  if (switchLogin) switchLogin.addEventListener('click', () => toggleAuthMode(false));

  // Initialize view from URL param
  if (startSignup === 'true') {
    toggleAuthMode(true);
  } else {
    toggleAuthMode(false);
  }

  // Handle Login submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const pass = document.getElementById('login-password').value;
      const btn = loginForm.querySelector('button');

      try {
        btn.disabled = true;
        btn.textContent = 'Signing In...';
        await API.login(email, pass);
        Theme.showAlert('Logged in successfully!', 'success');
        
        // Redirect to detail page or homepage
        const redirect = urlParams.get('redirect') || 'index.html';
        setTimeout(() => window.location.href = redirect, 1000);
      } catch (err) {
        Theme.showAlert(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Sign In';
      }
    });
  }

  // Handle Signup submission
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = document.getElementById('signup-username').value;
      const email = document.getElementById('signup-email').value;
      const pass = document.getElementById('signup-password').value;
      const btn = signupForm.querySelector('button');

      try {
        btn.disabled = true;
        btn.textContent = 'Registering Account...';
        await API.signup(user, email, pass);
        Theme.showAlert('Account created successfully!', 'success');
        
        // Redirect to detail page or homepage
        const redirect = urlParams.get('redirect') || 'index.html';
        setTimeout(() => window.location.href = redirect, 1000);
      } catch (err) {
        Theme.showAlert(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Create Account';
      }
    });
  }
}
