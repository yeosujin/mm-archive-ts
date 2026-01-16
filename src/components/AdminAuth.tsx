import { useState, useEffect } from 'react';

interface Props {
  readonly children: React.ReactNode;
}

// 비밀번호 설정 (나중에 환경변수로 옮기거나 변경하세요)
const ADMIN_PASSWORD = '1008';

export default function AdminAuth({ children }: Props) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // 페이지 로드 시 인증 상태 확인
  useEffect(() => {
    const authStatus = sessionStorage.getItem('adminAuth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem('adminAuth', 'true');
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

  if (isLoading) {
    return (
      <div className="admin-loading">
        <p>로딩 중...</p>
      </div>
    );
  }

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
        <button onClick={handleLogout} className="logout-btn">
          로그아웃
        </button>
      </div>
      {children}
    </div>
  );
}
