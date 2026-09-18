const API_URL = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      cache: 'no-store',
      ...options,
      signal: options.signal || controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.message || 'Request failed.');
      error.status = response.status;
      throw error;
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The server took too long to respond. Please try again.');
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function uploadRequest(path, body, token, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}${path}`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    });
    xhr.addEventListener('load', () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText || '{}'); } catch { /* Use fallback below. */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else { const error = new Error(data.message || 'Video upload failed.'); error.status = xhr.status; reject(error); }
    });
    xhr.addEventListener('error', () => reject(new Error('The upload connection was interrupted. Please try again.')));
    xhr.addEventListener('abort', () => reject(new Error('Video upload was cancelled.')));
    xhr.send(body);
  });
}

export const publicApi = {
  brochure: () => request('/brochure'),
  news: () => request('/brochure/news'),
  requestOtp: (details) => request('/leads/request-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(details) }),
  verifyOtp: (email, code) => request('/leads/verify-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code }) }),
};

export function createAdminApi(token) {
  const auth = (options = {}) => ({ ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } });
  return {
    login: (email, password) => request('/auth/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }),
    dashboard: () => request('/admin/dashboard', auth()),
    segments: () => request('/admin/segments', auth()),
    createSegment: (values) => request('/admin/segments', auth({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })),
    updateSegment: (id, label) => request(`/admin/segments/${id}`, auth({ method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label }) })),
    deleteSegment: (id) => request(`/admin/segments/${id}`, auth({ method: 'DELETE' })),
    slides: () => request('/admin/slides', auth()),
    createSlide: (body) => request('/admin/slides', auth({ method: 'POST', body })),
    updateSlide: (id, body) => request(`/admin/slides/${id}`, auth({ method: 'PATCH', body })),
    deleteSlide: (id) => request(`/admin/slides/${id}`, auth({ method: 'DELETE' })),
    reorderSlides: (ids) => request('/admin/slides/reorder', auth({ method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) })),
    video: () => request('/admin/video', auth()),
    uploadVideo: (body, onProgress) => uploadRequest('/admin/video', body, token, onProgress),
    updateVideo: (values) => request('/admin/video', auth({ method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })),
    deleteVideo: () => request('/admin/video', auth({ method: 'DELETE' })),
    news: () => request('/admin/news', auth()),
    createNews: (body) => request('/admin/news', auth({ method: 'POST', body })),
    updateNews: (id, body) => request(`/admin/news/${id}`, auth({ method: 'PATCH', body })),
    deleteNews: (id) => request(`/admin/news/${id}`, auth({ method: 'DELETE' })),
    leads: (search = '', page = 1) => request(`/admin/leads?search=${encodeURIComponent(search)}&page=${page}`, auth()),
  };
}

export const loginAdmin = (email, password) => createAdminApi('').login(email, password);
