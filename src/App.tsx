import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import './App.css';
import './styles/admin.css';
import './styles/chips.css';
import './styles/moments.css';
import './styles/story.css';
import './styles/home.css';
import './styles/splash.css';
import './styles/calendar.css';
import './styles/search.css';

function App() {
  return <RouterProvider router={router} />;
}

export default App;
