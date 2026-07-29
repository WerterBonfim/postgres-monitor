import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postgresqlApi } from '../../services/postgresqlApi';
import type { PostgresConnection, CreateConnectionRequest } from '../../types/postgresql';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Trash2, Star } from 'lucide-react';
import { toast } from '../ui/toaster';
import styles from './ConnectionsManager.module.scss';

export function ConnectionsManager() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [_selectedConnection, setSelectedConnection] = useState<PostgresConnection | null>(null);
  const [sslEnabled, setSslEnabled] = useState(false);

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['postgresql-connections'],
    queryFn: () => postgresqlApi.getConnections(),
  });

  const createMutation = useMutation({
    mutationFn: (connection: CreateConnectionRequest) => postgresqlApi.saveConnection(connection),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['postgresql-connections'] });
      setShowForm(false);
      toast({
        title: 'Sucesso',
        description: 'Conexão salva com sucesso!',
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao salvar conexão',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => postgresqlApi.deleteConnection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['postgresql-connections'] });
      toast({
        title: 'Sucesso',
        description: 'Conexão excluída com sucesso!',
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir conexão',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => postgresqlApi.setDefaultConnection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['postgresql-connections'] });
      toast({
        title: 'Sucesso',
        description: 'Conexão definida como padrão!',
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao definir conexão padrão',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSetDefault = (e: React.MouseEvent, connection: PostgresConnection) => {
    e.stopPropagation();
    if (!connection.isDefault) {
      setDefaultMutation.mutate(connection.id);
    }
  };

  const handleDelete = (e: React.MouseEvent, connection: PostgresConnection) => {
    e.stopPropagation();
    if (window.confirm(`Deseja realmente excluir a conexão "${connection.name}"?`)) {
      deleteMutation.mutate(connection.id);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const connection: CreateConnectionRequest = {
      name: formData.get('name') as string,
      host: formData.get('host') as string,
      port: parseInt(formData.get('port') as string, 10),
      database: formData.get('database') as string,
      username: formData.get('username') as string,
      password: formData.get('password') as string,
      sslEnabled,
    };
    createMutation.mutate(connection);
  };

  if (isLoading) {
    return <div className={styles['connections-manager__loading']}>Carregando conexões...</div>;
  }

  return (
    <div className={styles['connections-manager']}>
      <div className={styles['connections-manager__header']}>
        <h2 className={styles['connections-manager__title']}>Conexões PostgreSQL</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : 'Nova Conexão'}
        </Button>
      </div>

      {showForm && (
        <Card className={styles['connections-manager__form-card']}>
          <h3 className={styles['connections-manager__form-title']}>Nova Conexão</h3>
          <form onSubmit={handleSubmit} className={styles['connections-manager__form']}>
            <div className={styles['connections-manager__form-grid']}>
              <div className={styles['connections-manager__field']}>
                <label className={styles['connections-manager__label']}>Nome</label>
                <input type="text" name="name" required className={styles['connections-manager__input']} />
              </div>
              <div className={styles['connections-manager__field']}>
                <label className={styles['connections-manager__label']}>Host</label>
                <input type="text" name="host" required className={styles['connections-manager__input']} />
              </div>
              <div className={styles['connections-manager__field']}>
                <label className={styles['connections-manager__label']}>Porta</label>
                <input type="number" name="port" defaultValue={5432} required className={styles['connections-manager__input']} />
              </div>
              <div className={styles['connections-manager__field']}>
                <label className={styles['connections-manager__label']}>Database</label>
                <input type="text" name="database" required className={styles['connections-manager__input']} />
              </div>
              <div className={styles['connections-manager__field']}>
                <label className={styles['connections-manager__label']}>Usuário</label>
                <input type="text" name="username" required className={styles['connections-manager__input']} />
              </div>
              <div className={styles['connections-manager__field']}>
                <label className={styles['connections-manager__label']}>Senha</label>
                <input type="password" name="password" required className={styles['connections-manager__input']} />
              </div>
            </div>
            <div className={styles['connections-manager__checkbox-row']}>
              <Checkbox
                id="sslEnabled"
                checked={sslEnabled}
                onCheckedChange={(checked) => setSslEnabled(checked === true)}
              />
              <label htmlFor="sslEnabled" className={styles['connections-manager__checkbox-label']}>
                Habilitar SSL
              </label>
            </div>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Salvando...' : 'Salvar Conexão'}
            </Button>
          </form>
        </Card>
      )}

      <div className={styles['connections-manager__list']}>
        {connections.length === 0 ? (
          <Card padded className={styles['connections-manager__empty']}>
            Nenhuma conexão configurada. Clique em "Nova Conexão" para começar.
          </Card>
        ) : (
          connections.map((connection) => (
            <Card key={connection.id} className={styles['connections-manager__connection-card']}>
              <div className={styles['connections-manager__connection-row']}>
                <div
                  className={styles['connections-manager__connection-info']}
                  onClick={() => setSelectedConnection(connection)}
                >
                  <div className={styles['connections-manager__connection-name-row']}>
                    <h3 className={styles['connections-manager__connection-name']}>{connection.name}</h3>
                    {connection.isDefault && (
                      <Badge variant="warning">
                        <Star size={12} />
                        Padrão
                      </Badge>
                    )}
                  </div>
                  <p className={styles['connections-manager__connection-host']}>
                    {connection.host}:{connection.port} / {connection.database}
                  </p>
                  <p className={styles['connections-manager__connection-meta']}>
                    Usuário: {connection.username} | SSL: {connection.sslEnabled ? 'Sim' : 'Não'}
                  </p>
                </div>
                <div className={styles['connections-manager__connection-actions']}>
                  <div className={styles['connections-manager__connection-date']}>
                    {new Date(connection.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                  {!connection.isDefault && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleSetDefault(e, connection)}
                      disabled={setDefaultMutation.isPending}
                      className={styles['connections-manager__star-btn']}
                      title="Definir como padrão"
                    >
                      <Star size={16} />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleDelete(e, connection)}
                    disabled={deleteMutation.isPending}
                    className={styles['connections-manager__delete-btn']}
                    title="Excluir conexão"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
