import { Outlet, ScrollRestoration } from 'react-router-dom';
import { DataProvider } from '../context/DataContext';

export default function RootLayout() {
  return (
    <DataProvider>
      <Outlet />
      {/*
        새 화면은 맨 위에서, 뒤로 오면 보던 위치로.
        주소(pathname) 단위로 기억한다 — 필터(?y=, ?c=)나 뷰어(?m=)처럼 쿼리만 바뀔 때는 스크롤을 건드리지 않는다
      */}
      <ScrollRestoration getKey={(location) => location.pathname} />
    </DataProvider>
  );
}
