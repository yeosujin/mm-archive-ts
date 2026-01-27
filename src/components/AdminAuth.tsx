import { useState } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  readonly children: React.ReactNode;
}

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;
const AUTH_SECRET = import.meta.env.VITE_AUTH_SECRET || 'mm-archive-2026';

// 간단한 해시 함수 (세션 토큰 생성용)
function generateToken(password: string): string {
  const data = password + AUTH_SECRET + new Date().toDateString();
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `mm_${Math.abs(hash).toString(36)}_${AUTH_SECRET.slice(0, 4)}`;
}

// 토큰 검증
function validateToken(token: string | null): boolean {
  if (!token) return false;
  const expectedToken = generateToken(ADMIN_PASSWORD);
  return token === expectedToken;
}

export default function AdminAuth({ children }: Props) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === 'undefined') return false;
    const token = sessionStorage.getItem('adminAuth');
    return validateToken(token);
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (password === ADMIN_PASSWORD) {
      const token = generateToken(password);
      setIsAuthenticated(true);
      sessionStorage.setItem('adminAuth', token);
      setError('');
    } else {
      setError('비밀번호가 틀렸습니다');
      setPassword('');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('adminAuth');
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
            <button type="submit" className="login-btn">
              확인
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
