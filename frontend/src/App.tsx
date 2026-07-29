import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './lib/theme-provider';
import { Toaster } from './components/ui/toaster';
import { Footer } from './components/Footer';
import styles from './App.module.scss';

const PostgreSQLTools = lazy(() =>
  import('./pages/PostgreSQLTools').then((module) => ({ default: module.PostgreSQLTools }))
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <BrowserRouter>
          <Suspense
            fallback={
              <div className={styles['app-loading']}>
                <div className={styles['app-loading__inner']}>
                  <div className={styles['app-loading__spinner']} />
                  <p className={styles['app-loading__text']}>Carregando...</p>
                </div>
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<PostgreSQLTools />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Footer />
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
