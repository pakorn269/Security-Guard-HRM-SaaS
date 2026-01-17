import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import './i18n';

function App() {
  return <RouterProvider router={router} />;
}

export default App;
