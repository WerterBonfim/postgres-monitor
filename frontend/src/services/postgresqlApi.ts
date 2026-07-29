import axios, { AxiosError } from 'axios';
import type {
  PostgresConnection,
  QueryPlanResult,
  CreateConnectionRequest,
  MonitoringMetric,
  QueryHistory,
  IndexDetails,
  TableDetails,
  ExtensionStatus,
  HistoricalPeriod,
  HistoricalMetric,
} from '../types/postgresql';
import { toast } from '../components/ui/toaster';

const apiBaseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

const apiClient = axios.create({
  baseURL: apiBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 segundos
});

// Interceptor para capturar erros de conexão
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const errorData = error.response?.data as any;
    const errorString = JSON.stringify(errorData || error.message || '').toLowerCase();

    // Verifica se é erro de timeout
    const isTimeoutError = 
      error.code === 'ECONNABORTED' || 
      error.code === 'ETIMEDOUT' || 
      error.message?.toLowerCase().includes('timeout') ||
      errorString.includes('timeoutexception');

    // Verifica se é erro relacionado ao LiteDB
    const isLiteDBError = 
      errorString.includes('litedb') ||
      errorString.includes('lite db') ||
      errorString.includes('database locked');

    // Verificar se é erro de porta em uso
    const portInUseError = 
      errorString.includes('port') && 
      (errorString.includes('already in use') || 
       errorString.includes('já está em uso') ||
       errorString.includes('address already in use'));

    if (portInUseError) {
      const port = import.meta.env.VITE_API_BASE_URL?.match(/:(\d+)/)?.[1] || '5001';
      toast({
        title: 'Porta em Uso',
        description: `A porta ${port} já está sendo usada. Verifique se há outra instância do aplicativo rodando ou use uma porta diferente.`,
        variant: 'destructive',
        duration: 10000,
      });
    } else if (isTimeoutError) {
      toast({
        title: 'Erro de Timeout',
        description: 'A requisição demorou muito para responder. Verifique se o backend está rodando corretamente.',
        variant: 'destructive',
        duration: 10000,
      });
    } else if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
      toast({
        title: 'Erro de Conexão',
        description: 'Não foi possível conectar ao servidor. Verifique se o backend está rodando.',
        variant: 'destructive',
        duration: 8000,
      });
    } else if (error.response?.status === 500 && isLiteDBError) {
      toast({
        title: 'Erro no Banco de Dados',
        description: 'Não foi possível acessar o banco de dados LiteDB. Verifique as permissões do arquivo de banco de dados.',
        variant: 'destructive',
        duration: 8000,
      });
    }

    return Promise.reject(error);
  }
);

export const postgresqlApi = {
  async getConnections(): Promise<PostgresConnection[]> {
    try {
      const response = await apiClient.get<PostgresConnection[]>('/api/postgresql/connections');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getConnection(id: string): Promise<PostgresConnection> {
    const response = await apiClient.get<PostgresConnection>(`/api/postgresql/connections/${id}`);
    return response.data;
  },

  async saveConnection(connection: CreateConnectionRequest): Promise<PostgresConnection> {
    const response = await apiClient.post<PostgresConnection>('/api/postgresql/connections', connection);
    return response.data;
  },

  async executeExplainAnalyze(connectionId: string, query: string): Promise<QueryPlanResult> {
    const response = await apiClient.post<QueryPlanResult>('/api/postgresql/query-plan', {
      connectionId,
      query,
    });
    return response.data;
  },

  async getMonitoringMetrics(connectionId: string): Promise<MonitoringMetric[]> {
    const response = await apiClient.get<MonitoringMetric[]>(
      `/api/postgresql/monitoring/${connectionId}`
    );
    return response.data;
  },

  async collectMonitoringMetrics(connectionId: string): Promise<void> {
    await apiClient.post(`/api/postgresql/monitoring/${connectionId}/collect`);
  },

  async deleteConnection(id: string): Promise<void> {
    await apiClient.delete(`/api/postgresql/connections/${id}`);
  },

  async setDefaultConnection(id: string): Promise<void> {
    await apiClient.put(`/api/postgresql/connections/${id}/set-default`);
  },

  async checkExtension(connectionId: string): Promise<ExtensionStatus> {
    const response = await apiClient.get<ExtensionStatus>(
      `/api/postgresql/connections/${connectionId}/extensions`
    );
    return response.data;
  },

  async getHistoricalMetrics(
    connectionId: string,
    period: HistoricalPeriod
  ): Promise<HistoricalMetric[]> {
    const response = await apiClient.get<HistoricalMetric[]>(
      `/api/postgresql/monitoring/${connectionId}/history`,
      { params: { period } }
    );
    return response.data;
  },

  async getHistoricalMetricsRange(
    connectionId: string,
    start: Date,
    end: Date
  ): Promise<HistoricalMetric[]> {
    const response = await apiClient.get<HistoricalMetric[]>(
      `/api/postgresql/monitoring/${connectionId}/history/range`,
      {
        params: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      }
    );
    return response.data;
  },

  async getQueryHistory(connectionId: string): Promise<QueryHistory[]> {
    const response = await apiClient.get<QueryHistory[]>(
      `/api/postgresql/connections/${connectionId}/query-history`
    );
    return response.data;
  },

  async getLogs(connectionId: string, maxLines?: number): Promise<string[]> {
    const params = maxLines ? { maxLines } : {};
    const response = await apiClient.get<{ logs: string[] }>(
      `/api/postgresql/connections/${connectionId}/logs`,
      { params }
    );
    return response.data.logs;
  },

  async getIndexDetails(
    connectionId: string,
    schemaName: string,
    tableName: string,
    indexName: string
  ): Promise<IndexDetails> {
    const response = await apiClient.get<IndexDetails>(
      `/api/postgresql/connections/${connectionId}/indexes/${encodeURIComponent(schemaName)}/${encodeURIComponent(tableName)}/${encodeURIComponent(indexName)}/details`
    );
    return response.data;
  },

  async getTableDetails(
    connectionId: string,
    schemaName: string,
    tableName: string
  ): Promise<TableDetails> {
    const response = await apiClient.get<TableDetails>(
      `/api/postgresql/connections/${connectionId}/tables/${encodeURIComponent(schemaName)}/${encodeURIComponent(tableName)}/details`
    );
    return response.data;
  },
};
