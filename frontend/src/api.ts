import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
})

export const getOverview = () => api.get('/dashboard/overview').then(r => r.data)
export const getAccounts = () => api.get('/accounts').then(r => r.data)
export const createAccount = (payload: any) => api.post('/accounts', payload).then(r => r.data)
export const connectAccount = (id: number) => api.post(`/accounts/${id}/connect`).then(r => r.data)
export const testConnection = (payload?: any) => api.post('/accounts/test-connection', payload || {}).then(r => r.data)
export const getResources = (params?: any) => api.get('/resources', { params }).then(r => r.data)
export const getResource = (id: number) => api.get(`/resources/${id}`).then(r => r.data)
export const getLifecycleProducts = (params?: any) => api.get('/lifecycle/products', { params }).then(r => r.data)
export const syncLifecycle = (limit = 50) => api.post('/lifecycle/sync/endoflife', null, { params: { limit } }).then(r => r.data)
export const getCollectionsRuns = () => api.get('/collections/runs').then(r => r.data)
export const getCoverage = () => api.get('/collections/coverage').then(r => r.data)
export const scanAccount = (id: number) => api.post(`/collections/scan/${id}`).then(r => r.data)
export const getCollectionErrors = () => api.get('/collections/errors').then(r => r.data)
export const getWatchlist = () => api.get('/lifecycle/watchlist').then(r => r.data)
export const recomputeMatches = () => api.post('/lifecycle/recompute-matches').then(r => r.data)
