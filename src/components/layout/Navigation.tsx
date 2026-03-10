import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BookOpen, BarChart2, FileText, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Practice', path: '/practice', icon: BookOpen },
    { name: 'Cheatsheets', path: '/cheatsheets', icon: FileText },
    { name: 'Analytics', path: '/analytics', icon: BarChart2 },
  ];

  return (
    <nav className="w-64 h-screen bg-white border-r border-brand-blue-soft flex flex-col fixed left-0 top-0">
      <div className="p-8">
        <h1 className="text-2xl font-bold text-brand-blue-dark tracking-tight">JEETO</h1>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Analytical Console</p>
      </div>

      <div className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-brand-blue-light text-brand-blue-medium font-semibold'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-brand-blue-soft">
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 px-4 py-3 w-full text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
}
