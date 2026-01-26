import { Outlet } from 'react-router-dom';
import { DataProvider } from '../context/DataContext';

export default function RootLayout() {
  return (
    <DataProvider>
      <Outlet />
    </DataProvider>
  );
}
