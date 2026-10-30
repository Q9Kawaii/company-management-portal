
import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Sidebar from '../components/common/Sidebar';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';

export default function HRLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    const result = await logout();

    if (result?.success) {
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <Sidebar
        user={user}
        role="HR"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
        className="z-40"
      />

      <div className="flex min-h-screen min-w-0 flex-col lg:pl-64">
        <Navbar
          user={user}
          title="HR Portal"
          onLogout={handleLogout}
          onMenuClick={() => setSidebarOpen((previous) => !previous)}
        />

        <main className="mx-auto w-full max-w-[1600px] min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>

        <Footer />
      </div>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/75 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400 lg:hidden"
        />
      )}
    </div>
  );
}