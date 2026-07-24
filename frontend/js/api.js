const API_BASE = '/api';

const API = {
  // Token management
  getToken: () => localStorage.getItem('token'),
  setToken: (token) => localStorage.setItem('token', token),
  removeToken: () => localStorage.removeItem('token'),
  
  // User management
  getUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
  setUser: (user) => localStorage.setItem('user', JSON.stringify(user)),
  removeUser: () => localStorage.removeItem('user'),

  // Headers builder
  getHeaders: (isMultipart = false) => {
    const headers = {};
    if (!isMultipart) {
      headers['Content-Type'] = 'application/json';
    }
    const token = API.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  // Auth requests
  signup: async (username, email, password) => {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Signup failed');
    API.setToken(data.token);
    API.setUser(data.user);
    return data;
  },

  login: async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');
    API.setToken(data.token);
    API.setUser(data.user);
    return data;
  },

  logout: () => {
    API.removeToken();
    API.removeUser();
  },

  getProfile: async () => {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'GET',
      headers: API.getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch profile');
    API.setUser(data);
    return data;
  },

  addBalance: async (amount) => {
    const res = await fetch(`${API_BASE}/auth/add-balance`, {
      method: 'POST',
      headers: API.getHeaders(),
      body: JSON.stringify({ amount })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Deposit failed');
    // Update local user object balance
    const user = API.getUser();
    if (user) {
      user.balance = data.balance;
      API.setUser(user);
    }
    return data;
  },

  // Auctions requests
  getAuctions: async ({ search, category, status, sortBy } = {}) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    if (status) params.append('status', status);
    if (sortBy) params.append('sortBy', sortBy);

    const res = await fetch(`${API_BASE}/auctions?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch auctions');
    return data;
  },

  getAuctionDetails: async (id) => {
    const res = await fetch(`${API_BASE}/auctions/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch auction details');
    return data;
  },

  createAuction: async (formData) => {
    // If formData is FormData object (has files), don't set Content-Type header. Let browser set it with boundary.
    const res = await fetch(`${API_BASE}/auctions`, {
      method: 'POST',
      headers: API.getHeaders(true),
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create auction');
    return data;
  },

  getUserListings: async () => {
    const res = await fetch(`${API_BASE}/auctions/user/listings`, {
      headers: API.getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch listings');
    return data;
  },

  getUserBids: async () => {
    const res = await fetch(`${API_BASE}/auctions/user/bids`, {
      headers: API.getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch bids');
    return data;
  },

  getUserWonAuctions: async () => {
    const res = await fetch(`${API_BASE}/auctions/user/won`, {
      headers: API.getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch won auctions');
    return data;
  },

  // Bids requests
  getBidHistory: async (auctionId) => {
    const res = await fetch(`${API_BASE}/bids/auction/${auctionId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch bid history');
    return data;
  },

  placeBid: async (auctionId, amount) => {
    const res = await fetch(`${API_BASE}/bids`, {
      method: 'POST',
      headers: API.getHeaders(),
      body: JSON.stringify({ auctionId, amount })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to place bid');
    // Update local user object balance
    const user = API.getUser();
    if (user) {
      user.balance = data.balance;
      API.setUser(user);
    }
    return data;
  },

  confirmBid: async (id) => {
    const res = await fetch(`${API_BASE}/auctions/${id}/confirm`, {
      method: 'POST',
      headers: API.getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Confirmation failed');
    return data;
  },

  rejectBid: async (id) => {
    const res = await fetch(`${API_BASE}/auctions/${id}/reject`, {
      method: 'POST',
      headers: API.getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Rejection failed');
    return data;
  }
};

window.API = API; // Make it global
