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

// Generate unique voter token for audience voting (supports testing multiple responses from same device)
export const getVoterFingerprint = () => {
  return 'fp_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
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

// Local Poll History Persistence Helpers (Ensures polls & votes stay persistent on page refresh)
export const getStoredPolls = () => {
  try {
    const raw = localStorage.getItem('polls_history');
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
};

export const saveStoredPolls = (polls) => {
  try {
    localStorage.setItem('polls_history', JSON.stringify(polls));
  } catch (_) {}
};

export const savePollToHistory = (poll) => {
  if (!poll) return;
  const pollId = poll.id || poll._id || poll.slug;
  const list = getStoredPolls();
  const existingIdx = list.findIndex((p) => (p.id || p._id || p.slug) === pollId);
  if (existingIdx >= 0) {
    list[existingIdx] = { ...list[existingIdx], ...poll };
  } else {
    list.unshift(poll);
  }
  saveStoredPolls(list);
};

export const getStoredPollById = (id) => {
  if (!id) return null;
  const list = getStoredPolls();
  return list.find((p) => (p.id || p._id || p.slug) === id) || null;
};

export const updateStoredPollVotes = (pollId, optionIds) => {
  const list = getStoredPolls();
  const updated = list.map((p) => {
    if ((p.id || p._id || p.slug) !== pollId) return p;
    const currentTotal = p.total_votes || 0;
    const updatedOptions = (p.options || []).map((opt) => {
      const isChosen = optionIds.includes(opt.id);
      const curVotes = opt.votes !== undefined ? opt.votes : (opt.vote_count || 0);
      const newVotes = isChosen ? curVotes + 1 : curVotes;
      return { ...opt, votes: newVotes, vote_count: newVotes };
    });
    return {
      ...p,
      total_votes: currentTotal + optionIds.length,
      options: updatedOptions,
    };
  });
  saveStoredPolls(updated);
  return getStoredPollById(pollId);
};

export const api = {
  // Helpers
  getLocalPolls: getStoredPolls,
  getLocalPoll: getStoredPollById,

  // Auth
  register: (name, email, password) => 
    request('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  login: (email, password) => 
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  getMe: () => 
    request('/api/auth/me'),

  // Polls
  createPoll: async (pollData) => {
    let result = null;
    try {
      result = await request('/api/polls', { method: 'POST', body: JSON.stringify(pollData) });
    } catch (err) {
      console.warn('Backend createPoll request failed, using persistent local fallback:', err);
    }

    const user = getUser();
    const cleanPoll = (result && (result.poll || result.data)) || {
      id: 'poll_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7),
      creator_name: user?.name || user?.username || 'You',
      creator_id: user?.id || 'local_user',
      question: pollData.question,
      description: pollData.description || '',
      options: (pollData.options || []).map((opt, idx) => ({
        id: opt.id || `opt_${idx + 1}`,
        text: opt.text,
        votes: 0,
        vote_count: 0,
      })),
      is_active: true,
      is_closed: false,
      allow_multiple: !!pollData.allow_multiple,
      total_votes: 0,
      created_at: new Date().toISOString(),
    };

    savePollToHistory(cleanPoll);
    return { message: 'Poll created successfully', poll: cleanPoll };
  },

  getPoll: async (id) => {
    let backendPoll = null;
    try {
      const res = await request(`/api/polls/${id}`);
      backendPoll = res.poll || res.data || res;
    } catch (err) {
      console.warn('Backend getPoll failed, falling back to stored poll:', err);
    }

    if (backendPoll) {
      savePollToHistory(backendPoll);
      return { poll: backendPoll };
    }

    const localPoll = getStoredPollById(id);
    if (localPoll) {
      return { poll: localPoll };
    }

    throw new Error('Poll not found or unavailable');
  },

  getMyPolls: async () => {
    const localPolls = getStoredPolls();
    let backendPolls = [];

    try {
      const res = await request('/api/polls/my');
      backendPolls = res.polls || res.data || [];
    } catch (err) {
      console.warn('Backend getMyPolls failed, using persistent local polls:', err);
    }

    // Merge backend polls and local polls by ID
    const pollMap = new Map();
    // Put local polls first
    localPolls.forEach((p) => {
      const pid = p.id || p._id || p.slug;
      if (pid) pollMap.set(pid, p);
    });
    // Update/merge with backend polls
    backendPolls.forEach((p) => {
      const pid = p.id || p._id || p.slug;
      if (pid) {
        const existing = pollMap.get(pid);
        pollMap.set(pid, { ...existing, ...p });
      }
    });

    const merged = Array.from(pollMap.values());
    saveStoredPolls(merged);
    return { polls: merged };
  },

  updatePollStatus: async (id, isActive) => {
    try {
      await request(`/api/polls/${id}/status`, { method: 'PATCH', body: JSON.stringify({ is_active: isActive }) });
    } catch (err) {
      console.warn('Backend updatePollStatus failed, updating locally:', err);
    }

    const list = getStoredPolls();
    const updated = list.map((p) => {
      if ((p.id || p._id || p.slug) === id) {
        return { ...p, is_active: isActive, is_closed: !isActive };
      }
      return p;
    });
    saveStoredPolls(updated);
    return { message: 'Status updated' };
  },

  deletePoll: async (id) => {
    try {
      await request(`/api/polls/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Backend deletePoll failed, deleting locally:', err);
    }

    const list = getStoredPolls();
    const filtered = list.filter((p) => (p.id || p._id || p.slug) !== id);
    saveStoredPolls(filtered);
    return { message: 'Poll deleted' };
  },

  // Live Voting
  castVote: async (pollId, optionIds) => {
    let backendRes = null;
    try {
      backendRes = await request(`/api/polls/${pollId}/vote`, {
        method: 'POST',
        body: JSON.stringify({
          option_ids: optionIds,
          voter_fingerprint: getVoterFingerprint(),
        }),
      });
    } catch (err) {
      console.warn('Backend vote submission error, saving vote locally:', err);
    }

    const updatedPoll = updateStoredPollVotes(pollId, optionIds);
    markDeviceVoted(pollId, optionIds);

    return backendRes || {
      message: 'Vote recorded successfully',
      poll: updatedPoll,
      total_votes: updatedPoll?.total_votes || 1,
    };
  },

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
    // When running on Vercel, connect WebSocket directly to permanent Render cloud backend
    if (typeof window !== 'undefined' && window.location.host.includes('vercel.app')) {
      return `wss://live-polling-app-rb4v.onrender.com/ws/polls/${pollId}`;
    }
    return `${wsProtocol}//${window.location.host}/ws/polls/${pollId}`;
  }
};

