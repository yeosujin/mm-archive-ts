import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import './App.css';
import './styles/admin.css';

function App() {
  return <RouterProvider router={router} />;
}

export default App;
