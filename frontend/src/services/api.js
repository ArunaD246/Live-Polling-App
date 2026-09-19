const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Helper to get stored auth token
export const getAuthToken = () => localStorage.getItem('token');
export const setAuthToken = (token) => localStorage.setItem('token', token);
export const removeAuthToken = () => localStorage.removeItem('token');

export const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};
export const setUser = (user) => localStorage.setItem('user', JSON.stringify(user));
export const removeUser = () => localStorage.removeItem('user');

// Generate or retrieve anonymous voter fingerprint
export const getVoterFingerprint = () => {
  let fp = localStorage.getItem('pulsepoll_voter_fp');
  if (!fp) {
    fp = 'fp_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
    localStorage.setItem('pulsepoll_voter_fp', fp);
  }
  return fp;
};

// Check if current device has recorded a vote on a poll
export const hasDeviceVoted = (pollId) => {
  const votedPolls = JSON.parse(localStorage.getItem('voted_polls') || '{}');
  return !!votedPolls[pollId];
};

export const markDeviceVoted = (pollId, selectedOptionIds) => {
  const votedPolls = JSON.parse(localStorage.getItem('voted_polls') || '{}');
  votedPolls[pollId] = {
    optionIds: selectedOptionIds,
    votedAt: new Date().toISOString()
  };
  localStorage.setItem('voted_polls', JSON.stringify(votedPolls));
};

export const getDeviceVoteRecord = (pollId) => {
  const votedPolls = JSON.parse(localStorage.getItem('voted_polls') || '{}');
  return votedPolls[pollId] || null;
};

// Generic Fetch Wrapper
async function request(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, { ...options, headers });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `HTTP Error ${res.status}`);
    }
    return data;
  } catch (err) {
    throw err;
  }
}

export const api = {
  // Auth
  register: (name, email, password) => 
    request('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  login: (email, password) => 
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  getMe: () => 
    request('/api/auth/me'),

  // Polls
  createPoll: (pollData) => 
    request('/api/polls', { method: 'POST', body: JSON.stringify(pollData) }),
  getPoll: (id) => 
    request(`/api/polls/${id}`),
  getMyPolls: () => 
    request('/api/polls/my'),
  updatePollStatus: (id, isActive) => 
    request(`/api/polls/${id}/status`, { method: 'PATCH', body: JSON.stringify({ is_active: isActive }) }),
  deletePoll: (id) => 
    request(`/api/polls/${id}`, { method: 'DELETE' }),

  // Live Voting
  castVote: (pollId, optionIds) => 
    request(`/api/polls/${pollId}/vote`, {
      method: 'POST',
      body: JSON.stringify({
        option_ids: optionIds,
        voter_fingerprint: getVoterFingerprint(),
      }),
    }),

  // Health
  checkHealth: () => 
    request('/api/health'),

  // WebSocket URL Generator
  getWebSocketUrl: (pollId) => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    if (API_BASE_URL.startsWith('http')) {
      const url = new URL(API_BASE_URL);
      return `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}/ws/polls/${pollId}`;
    }
    // When running on Vercel, connect WebSocket directly to Cloudflare tunnel since Vercel Serverless drops WS upgrades
    if (typeof window !== 'undefined' && window.location.host.includes('vercel.app')) {
      return `wss://minneapolis-career-hook-ecommerce.trycloudflare.com/ws/polls/${pollId}`;
    }
    return `${wsProtocol}//${window.location.host}/ws/polls/${pollId}`;
  }
};
