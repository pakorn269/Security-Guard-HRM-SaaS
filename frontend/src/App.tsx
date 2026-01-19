import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { ThemeProvider } from './components/theme';
import './i18n';

function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}

export default App;
