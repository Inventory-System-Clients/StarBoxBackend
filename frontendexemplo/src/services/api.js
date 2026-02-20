import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    "https://starboxbackend.onrender.com/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para adicionar token automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);


// APIs para integração do financeiro pessoal

export const billsAPI = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const response = await api.get(`/financeiro/bills?${params}`);
    return response.data;
  },
  create: async (billData) => {
    const response = await api.post(`/financeiro/bills`, billData);
    return response.data;
  },
  update: async (id, billData) => {
    const response = await api.put(`/financeiro/bills/${id}`, billData);
    return response.data;
  },
  updateStatus: async (id, status) => {
    const response = await api.patch(`/financeiro/bills/${id}/status`, { status });
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/financeiro/bills/${id}`);
    return response.data;
  }
};


export const categoriesAPI = {
  getAll: async () => {
    const response = await api.get(`/financeiro/categories`);
    return response.data;
  },
  create: async (name) => {
    const response = await api.post(`/financeiro/categories`, { name });
    return response.data;
  }
};


export const reportsAPI = {
  getDashboard: async () => {
    const response = await api.get(`/financeiro/reports/dashboard`);
    return response.data;
  },
  getAlerts: async () => {
    const response = await api.get(`/financeiro/reports/alerts`);
    return response.data;
  },
  export: async (format = 'pdf') => {
    const response = await api.get(`/financeiro/reports/export?format=${format}`, { responseType: 'blob' });
    return response.data;
  }
};

export default api;
