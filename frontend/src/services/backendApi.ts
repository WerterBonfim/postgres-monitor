import axios, { AxiosError } from 'axios';
import { toast } from '../components/ui/toaster';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Interceptor para capturar erros de conexão
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
      toast({
        title: 'Erro de Conexão',
        description: 'Não foi possível conectar ao servidor. Verifique se o backend está rodando.',
        variant: 'destructive',
        duration: 8000,
      });
    }
    return Promise.reject(error);
  }
);

export async function getBackendLogs(maxLines?: number): Promise<string[]> {
  try {
    const params = maxLines ? { maxLines } : {};
    const response = await apiClient.get<{ logs: string[] }>('/api/backend/logs', { params });
    return response.data.logs;
  } catch (error) {
    console.error('Erro ao buscar logs do backend:', error);
    throw error;
  }
}
