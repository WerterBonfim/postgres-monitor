import { Card } from '../ui/card';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertTriangle, Database, FileCode, Settings } from 'lucide-react';
import { Badge } from '../ui/badge';
import styles from './PgStatStatementsInfo.module.scss';

export function PgStatStatementsInfo() {
  return (
    <div className={styles['pg-stat-info']}>
      <div>
        <h1 className={styles['pg-stat-info__title']}>Configuração do pg_stat_statements</h1>
        <p className={styles['pg-stat-info__intro']}>
          O pg_stat_statements é uma extensão do PostgreSQL que rastreia estatísticas de execução
          de todas as queries SQL executadas no servidor. Esta extensão é necessária para recursos
          avançados de monitoramento de queries.
        </p>
      </div>

      <Alert variant="destructive">
        <AlertTriangle size={16} />
        <AlertTitle>Atenção</AlertTitle>
        <AlertDescription>
          Após modificar o arquivo postgresql.conf, é <strong>necessário reiniciar o PostgreSQL</strong> para
          que as alterações tenham efeito.
        </AlertDescription>
      </Alert>

      <Card className={styles['pg-stat-info__card']}>
        <div className={styles['pg-stat-info__card-header']}>
          <Database size={20} />
          <h2 className={styles['pg-stat-info__card-title']}>Passo 1: Instalar a Extensão</h2>
        </div>
        <p className={styles['pg-stat-info__card-text']}>
          Execute o seguinte comando SQL no banco de dados onde deseja monitorar:
        </p>
        <div className={styles['pg-stat-info__code']}>
          <code>CREATE EXTENSION IF NOT EXISTS pg_stat_statements;</code>
        </div>
      </Card>

      <Card className={styles['pg-stat-info__card']}>
        <div className={styles['pg-stat-info__card-header']}>
          <FileCode size={20} />
          <h2 className={styles['pg-stat-info__card-title']}>Passo 2: Configurar postgresql.conf</h2>
        </div>
        <p className={styles['pg-stat-info__card-text']}>
          Adicione ou modifique a seguinte linha no arquivo <code>postgresql.conf</code>:
        </p>
        <div className={styles['pg-stat-info__code']}>
          <code>shared_preload_libraries = 'pg_stat_statements'</code>
        </div>
        <p className={styles['pg-stat-info__card-text']}>
          <strong>Localização do arquivo:</strong> Normalmente em{' '}
          <code>/etc/postgresql/[versão]/main/postgresql.conf</code> ou{' '}
          <code>C:\Program Files\PostgreSQL\[versão]\data\postgresql.conf</code>
        </p>
      </Card>

      <Card className={styles['pg-stat-info__card']}>
        <div className={styles['pg-stat-info__card-header']}>
          <Settings size={20} />
          <h2 className={styles['pg-stat-info__card-title']}>Passo 3: Configurações Opcionais</h2>
        </div>
        <p className={styles['pg-stat-info__card-text']}>
          Após reiniciar o PostgreSQL, você pode configurar opções adicionais:
        </p>

        <div className={styles['pg-stat-info__config-list']}>
          <div className={styles['pg-stat-info__config-item']}>
            <div className={styles['pg-stat-info__config-header']}>
              <Badge variant="outline">Configuração</Badge>
              <span className={styles['pg-stat-info__config-name']}>Número máximo de queries rastreadas</span>
            </div>
            <p className={styles['pg-stat-info__card-text']}>
              Define quantas queries distintas podem ser rastreadas simultaneamente (padrão: ~5000)
            </p>
            <div className={styles['pg-stat-info__code']}>
              <code>ALTER SYSTEM SET pg_stat_statements.max = 10000;</code>
            </div>
          </div>

          <div className={styles['pg-stat-info__config-item']}>
            <div className={styles['pg-stat-info__config-header']}>
              <Badge variant="outline">Configuração</Badge>
              <span className={styles['pg-stat-info__config-name']}>Rastreamento de queries</span>
            </div>
            <p className={styles['pg-stat-info__card-text']}>
              Controla quais queries são rastreadas:
            </p>
            <ul className={styles['pg-stat-info__list']}>
              <li><code>'top'</code> - Apenas queries de nível superior (padrão)</li>
              <li><code>'all'</code> - Todas as queries, incluindo funções e procedimentos</li>
            </ul>
            <div className={styles['pg-stat-info__code']}>
              <code>ALTER SYSTEM SET pg_stat_statements.track = 'all';</code>
            </div>
          </div>
        </div>

        <Alert>
          <AlertTriangle size={16} />
          <AlertDescription>
            Após executar os comandos <code>ALTER SYSTEM</code>, você pode precisar recarregar a
            configuração com <code>SELECT pg_reload_conf();</code> ou reiniciar o PostgreSQL,
            dependendo da configuração.
          </AlertDescription>
        </Alert>
      </Card>

      <Card className={styles['pg-stat-info__card']}>
        <div className={styles['pg-stat-info__card-header']}>
          <AlertTriangle size={20} className={styles['pg-stat-info__warning-icon']} />
          <h2 className={styles['pg-stat-info__card-title']}>Verificação</h2>
        </div>
        <p className={styles['pg-stat-info__card-text']}>
          Para verificar se a extensão está funcionando corretamente, execute:
        </p>
        <div className={styles['pg-stat-info__code']}>
          <code>SELECT * FROM pg_stat_statements LIMIT 1;</code>
        </div>
        <p className={styles['pg-stat-info__card-text']}>
          Se a query retornar resultados (ou uma tabela vazia sem erro), a extensão está
          configurada corretamente.
        </p>
      </Card>

      <Card className={styles['pg-stat-info__features-card']}>
        <h3 className={styles['pg-stat-info__features-title']}>Recursos Disponíveis com pg_stat_statements</h3>
        <ul className={styles['pg-stat-info__list']}>
          <li>Análise detalhada de performance de queries</li>
          <li>Identificação de queries mais custosas</li>
          <li>Métricas de I/O por query</li>
          <li>Estatísticas de tempo de execução (média, mínimo, máximo)</li>
          <li>Análise de cache hit ratio por query</li>
        </ul>
      </Card>
    </div>
  );
}
