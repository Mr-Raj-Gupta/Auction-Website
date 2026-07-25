document.addEventListener('DOMContentLoaded', () => {
  // 1. Authentication & Role Validation Check
  const user = API.getUser();
  if (!user || user.role !== 'admin') {
    Theme.showAlert('Access Denied. Redirecting to home...', 'error');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1500);
    return;
  }

  // Update navbar state
  Theme.updateNavbar();

  // Sidebar Tab Switches
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

    // Run active load scripts
    if (tabId === 'overview') {
      loadStats();
    } else if (tabId === 'users') {
      loadUsers();
    } else if (tabId === 'listings') {
      loadListings();
    }
  };

  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.getAttribute('data-tab');
      if (tabId === 'logout') {
        API.logout();
        Theme.showAlert('Admin logged out successfully', 'info');
        setTimeout(() => window.location.href = 'index.html', 1000);
      } else {
        switchTab(tabId);
      }
    });
  });

  // 2. Tab 1: Load Statistics
  const loadStats = async () => {
    try {
      const stats = await API.getAdminStats();
      document.getElementById('stat-total-users').textContent = stats.totalUsers;
      document.getElementById('stat-active-auctions').textContent = stats.totalActiveAuctions;
      document.getElementById('stat-ended-auctions').textContent = stats.totalEndedAuctions;
      document.getElementById('stat-total-bids').textContent = stats.totalBids;
    } catch (err) {
      console.error(err);
      Theme.showAlert('Failed to load system overview stats', 'error');
    }
  };

  // 3. Tab 2: Manage Users (List & Balance update)
  const loadUsers = async () => {
    const container = document.getElementById('users-list-container');
    if (!container) return;

    container.innerHTML = '<div style="text-align: center; padding: 2rem;">Loading platform users...</div>';

    try {
      const users = await API.getAdminUsers();
      if (users.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 2rem;">No users registered yet.</div>';
        return;
      }

      container.innerHTML = `
        <table class="admin-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Wallet Balance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => {
              const roleBadge = u.role === 'admin' 
                ? `<span style="background: rgba(216, 125, 86, 0.1); color: var(--accent); padding: 0.25rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.8rem;">Admin</span>`
                : `<span style="background: rgba(45, 106, 79, 0.08); color: var(--primary); padding: 0.25rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.8rem;">User</span>`;
              
              return `
                <tr>
                  <td style="font-weight: 600;">${u.username}</td>
                  <td>${u.email}</td>
                  <td>${roleBadge}</td>
                  <td style="font-weight: 700; color: var(--primary);">₹${u.balance.toFixed(2)}</td>
                  <td>
                    <button class="btn btn-secondary edit-bal-btn" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;" data-id="${u._id}" data-username="${u.username}" data-balance="${u.balance}">Edit Balance</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;

      // Attach click events to "Edit Balance" buttons
      document.querySelectorAll('.edit-bal-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.target.getAttribute('data-id');
          const username = e.target.getAttribute('data-username');
          const balance = e.target.getAttribute('data-balance');
          openBalanceModal(id, username, balance);
        });
      });

    } catch (err) {
      container.innerHTML = `<div style="color: var(--error); padding: 2rem; text-align: center;">Error: ${err.message}</div>`;
    }
  };

  // 4. Tab 3: Manage Listings (Audit & Delete)
  const loadListings = async () => {
    const container = document.getElementById('listings-list-container');
    if (!container) return;

    container.innerHTML = '<div style="text-align: center; padding: 2rem;">Loading platform listings...</div>';

    try {
      const data = await API.getAuctions({ status: 'all' }); // Fetch both active and ended
      if (data.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 2rem;">No listings created yet.</div>';
        return;
      }

      // We sort by newest
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      container.innerHTML = `
        <table class="admin-table">
          <thead>
            <tr>
              <th>Asset Listing</th>
              <th>Seller</th>
              <th>Status</th>
              <th>Current Bid</th>
              <th>Date Listed</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(item => {
              const statusBadge = item.status === 'active' 
                ? `<span style="color: var(--secondary); background: rgba(64, 145, 108, 0.1); padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: 700;">Live</span>`
                : `<span style="color: var(--error); background: rgba(219, 4, 41, 0.1); padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: 700;">Closed</span>`;
              
              const dateStr = new Date(item.createdAt).toLocaleDateString([], { dateStyle: 'short' });

              return `
                <tr>
                  <td style="font-weight: 600; display: flex; align-items: center; gap: 0.75rem;">
                    <img src="${item.imageUrl}" style="width: 35px; height: 35px; object-fit: cover; border-radius: 4px;" onerror="this.src='/uploads/placeholder.png'">
                    <span>${item.title}</span>
                  </td>
                  <td>${item.seller ? item.seller.username : 'Unknown'}</td>
                  <td>${statusBadge}</td>
                  <td style="font-weight: 700; color: var(--primary);">₹${item.currentBid.toFixed(2)}</td>
                  <td>${dateStr}</td>
                  <td>
                    <div style="display: flex; gap: 0.5rem;">
                      <a href="item.html?id=${item._id}" class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">View</a>
                      <button class="btn btn-secondary delete-listing-btn" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; border-color: var(--error); color: var(--error); background: rgba(219, 4, 41, 0.03);" data-id="${item._id}" data-title="${item.title}">Delete</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;

      // Attach click events to "Delete" buttons
      document.querySelectorAll('.delete-listing-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.getAttribute('data-id');
          const title = e.target.getAttribute('data-title');
          
          const confirmText = `Are you sure you want to permanently delete the listing "${title}"? Any active bids on it will be automatically cancelled and refunded to the respective bidders.`;
          if (!confirm(confirmText)) return;

          try {
            e.target.disabled = true;
            e.target.textContent = 'Deleting...';
            const res = await API.deleteAuction(id);
            Theme.showAlert(res.message, 'success');
            loadListings(); // reload listings table
          } catch (err) {
            Theme.showAlert(err.message, 'error');
            e.target.disabled = false;
            e.target.textContent = 'Delete';
          }
        });
      });

    } catch (err) {
      container.innerHTML = `<div style="color: var(--error); padding: 2rem; text-align: center;">Error: ${err.message}</div>`;
    }
  };

  // 5. Balance Modal Controllers
  const balanceModal = document.getElementById('balance-modal');
  const editUserIdInput = document.getElementById('edit-user-id');
  const editUsernameInput = document.getElementById('edit-username-lbl');
  const editBalanceInput = document.getElementById('edit-balance-input');
  const balanceForm = document.getElementById('edit-balance-form');
  const closeBtn = document.getElementById('close-balance-modal');
  const cancelBtn = document.getElementById('cancel-balance-modal');

  const openBalanceModal = (id, username, balance) => {
    editUserIdInput.value = id;
    editUsernameInput.value = username;
    editBalanceInput.value = Number(balance);
    balanceModal.classList.add('active');
  };

  const closeBalanceModal = () => {
    balanceModal.classList.remove('active');
    balanceForm.reset();
  };

  if (closeBtn) closeBtn.addEventListener('click', closeBalanceModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeBalanceModal);

  if (balanceForm) {
    balanceForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const id = editUserIdInput.value;
      const amount = Number(editBalanceInput.value);
      const submitBtn = document.getElementById('save-balance-btn');

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating...';
        
        const res = await API.updateUserBalance(id, amount);
        Theme.showAlert(res.message, 'success');
        closeBalanceModal();
        loadUsers(); // reload users table
      } catch (err) {
        Theme.showAlert(err.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Update Balance';
      }
    });
  }

  // 6. Initial Load
  loadStats();
});
