import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Building2, User, Bell, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import Logo from '../assets/Star Box.png';

export default function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleExitFinanceiro = () => {
    navigate('/');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, adminOnly: true },
    { path: '/financeiro/contas/company', label: 'Contas Empresariais', icon: Building2 },
    { path: '/financeiro/contas/personal', label: 'Contas Particulares', icon: User },
    { path: '/financeiro/avisos', label: 'Avisos', icon: Bell }
  ];

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-purple-100 sticky top-0 z-50 shadow-sm" data-testid="main-header">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/financeiro" className="flex items-center space-x-2" data-testid="logo-link">
              <div className="w-10 h-10 flex items-center justify-center">
                <img src={Logo} alt="Logo" className="w-10 h-10 object-contain" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Financeiro
              </span>
            </Link>

            <nav className="hidden md:flex space-x-1">
              {navItems.map((item) => {
                if (item.adminOnly && user?.role !== 'admin') return null;
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    data-testid={`nav-${item.path.replace('/', '-')}`}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                      isActive
                        ? 'bg-purple-100 text-purple-700 font-medium'
                        : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-gray-800" data-testid="user-name">{user?.name}</span>
              <span className="text-xs text-gray-500 capitalize" data-testid="user-role">{user?.role}</span>
            </div>
            <Button
              onClick={handleExitFinanceiro}
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-purple-600 hover:bg-purple-50"
              data-testid="exit-financeiro-button"
            >
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
