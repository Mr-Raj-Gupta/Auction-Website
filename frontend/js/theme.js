const Theme = {
  // Notification alert system
  showAlert: (message, type = 'info') => {
    let alertContainer = document.getElementById('alert-container');
    if (!alertContainer) {
      alertContainer = document.createElement('div');
      alertContainer.id = 'alert-container';
      alertContainer.className = 'alert-container';
      document.body.appendChild(alertContainer);
    }

    const alert = document.createElement('div');
    alert.className = `alert alert-${type} glass`;
    
    let icon = '';
    if (type === 'success') {
      icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    } else if (type === 'error') {
      icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    } else {
      icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    }

    alert.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        ${icon}
        <span>${message}</span>
      </div>
      <button class="alert-close">&times;</button>
    `;

    alertContainer.appendChild(alert);

    // Auto dismiss after 4 seconds
    const timeout = setTimeout(() => {
      alert.style.animation = 'slideInRight 0.3s reverse';
      alert.addEventListener('animationend', () => alert.remove());
    }, 4000);

    alert.querySelector('.alert-close').addEventListener('click', () => {
      clearTimeout(timeout);
      alert.remove();
    });
  },

  // Navbar Dynamic rendering
  updateNavbar: () => {
    const navAuth = document.getElementById('nav-auth');
    if (!navAuth) return;

    const user = API.getUser();
    if (user) {
      navAuth.innerHTML = `
        <div class="user-balance-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><line x1="12" y1="4" x2="12" y2="20"></line></svg>
          <span id="nav-user-balance">₹${Number(user.balance).toFixed(2)}</span>
          <button id="nav-deposit-btn" class="btn" style="padding: 0.15rem 0.4rem; font-size: 0.75rem; background: var(--secondary); color: var(--bg-dark); border-radius: 4px; margin-left: 0.5rem; font-weight: 800;">+ Add</button>
        </div>
        <span style="font-weight: 600; color: var(--color-text-primary); font-size: 0.95rem; display: flex; align-items: center; gap: 0.4rem;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          ${user.username}
        </span>
        <button id="logout-btn" class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.85rem;">Logout</button>
      `;

      document.getElementById('logout-btn').addEventListener('click', () => {
        API.logout();
        Theme.showAlert('Logged out successfully', 'info');
        setTimeout(() => window.location.href = 'index.html', 1000);
      });

      document.getElementById('nav-deposit-btn').addEventListener('click', () => {
        Theme.showDepositModal();
      });
    } else {
      navAuth.innerHTML = `
        <a href="login.html" class="btn btn-secondary" style="padding: 0.5rem 1.25rem;">Sign In</a>
        <a href="login.html?signup=true" class="btn btn-primary" style="padding: 0.5rem 1.25rem;">Register</a>
      `;
    }
  },

  // Deposit funds modal
  showDepositModal: () => {
    let modal = document.getElementById('deposit-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'deposit-modal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-container glass">
          <div class="modal-header">
            <h3>Add Demo Bidding Funds</h3>
            <button class="modal-close" style="font-size: 1.5rem;">&times;</button>
          </div>
          <div class="form-group">
            <label>Amount to Deposit (₹)</label>
            <input type="number" id="deposit-amount" class="form-control" value="1000" min="10" step="10">
          </div>
          <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem;">
            <button id="deposit-cancel" class="btn btn-secondary">Cancel</button>
            <button id="deposit-confirm" class="btn btn-cyan">Deposit Funds</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      const closeModal = () => modal.classList.remove('active');

      modal.querySelector('.modal-close').addEventListener('click', closeModal);
      modal.querySelector('#deposit-cancel').addEventListener('click', closeModal);
      
      modal.querySelector('#deposit-confirm').addEventListener('click', async () => {
        const amount = Number(document.getElementById('deposit-amount').value);
        if (amount <= 0 || isNaN(amount)) {
          Theme.showAlert('Please enter a valid deposit amount', 'error');
          return;
        }

        try {
          const res = await API.addBalance(amount);
          Theme.showAlert(res.message, 'success');
          Theme.updateNavbar();
          closeModal();
          // Dispatch custom event to let active page update itself if needed
          window.dispatchEvent(new CustomEvent('balanceUpdated', { detail: res.balance }));
        } catch (err) {
          Theme.showAlert(err.message, 'error');
        }
      });
    }

    modal.classList.add('active');
  },

  // Format Time Remaining
  formatTimeRemaining: (endTimeString) => {
    const total = Date.parse(endTimeString) - Date.parse(new Date());
    if (total <= 0) return { text: 'Ended', urgent: false, expired: true };

    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));

    let timeText = '';
    if (days > 0) {
      timeText = `${days}d ${hours}h`;
    } else if (hours > 0) {
      timeText = `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      timeText = `${minutes}m ${seconds}s`;
    } else {
      timeText = `${seconds}s`;
    }

    return {
      text: timeText,
      urgent: total < 5 * 60 * 1000, // Less than 5 minutes
      expired: false
    };
  }
};

window.Theme = Theme; // Make it global
