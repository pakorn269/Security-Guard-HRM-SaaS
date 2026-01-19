import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { ThemeProvider } from './components/theme';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import './i18n';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <ThemeProvider defaultTheme="system">
          <RouterProvider router={router} />
        </ThemeProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
