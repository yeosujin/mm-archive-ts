import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_PASSWORD_STORAGE_KEY, verifyAdminPassword } from '../lib/r2Upload';

interface Props {
  readonly children: React.ReactNode;
}

export default function AdminAuth({ children }: Props) {
  // 비밀번호는 서버(api/r2.ts)에서만 검증한다. 저장된 값이 틀리면 업로드·삭제 요청이 401로 거절된다.
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(ADMIN_PASSWORD_STORAGE_KEY);
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setChecking(true);
    const ok = await verifyAdminPassword(password);
    setChecking(false);

    if (ok) {
      setIsAuthenticated(true);
      localStorage.setItem(ADMIN_PASSWORD_STORAGE_KEY, password);
      setError('');
    } else {
      setError('비밀번호가 틀렸습니다');
      setPassword('');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(ADMIN_PASSWORD_STORAGE_KEY);
  };


  if (!isAuthenticated) {
    return (
      <div className="admin-login">
        <div className="login-card">
          <h1>🔐 Admin</h1>
          <p>관리자 비밀번호를 입력하세요</p>
          
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              autoFocus
              className="login-input"
            />
            {error && <p className="login-error">{error}</p>}
            <button type="submit" className="login-btn" disabled={checking}>
              {checking ? '확인 중…' : '확인'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-wrapper">
      <div className="admin-header">
        <span>👤 관리자 모드</span>
        <div className="admin-header-actions-top">
          <Link to="/" className="admin-header-link">사이트로</Link>
          <button onClick={handleLogout} className="logout-btn">로그아웃</button>
        </div>
      </div>
      {children}
    </div>
  );
}
