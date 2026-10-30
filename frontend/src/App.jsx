import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './components/layout/Header';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import AppRoutes from './routes/AppRoutes';
import ErrorMessage from './components/common/ErrorMessage';

function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const [accessDeniedMsg, setAccessDeniedMsg] = useState('');

  useEffect(() => {
    if (location.state?.accessDenied) {
      setAccessDeniedMsg(
        location.state.message ||
          'Bạn không có quyền truy cập vào trang vừa yêu cầu! Hệ thống đã chuyển về trang phù hợp với vai trò của bạn.'
      );
    } else {
      setAccessDeniedMsg('');
    }
  }, [location]);

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
      <Header />
      <Navbar />

      <main style={{ flex: 1 }}>
        {accessDeniedMsg && (
          <div className="container" style={{ paddingTop: '1rem' }}>
            <ErrorMessage message={accessDeniedMsg} onClose={() => setAccessDeniedMsg('')} />
          </div>
        )}
        <AppRoutes />
      </main>

      {!isAdminRoute && <Footer />}
    </div>
  );
}

export default App;
