import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";

export default function Navbar() {
  const { usuario, logout } = useAuth(); // Assumindo que seu context proveja usuario e logout
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path;
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  return (

    <nav className="text-[#62A1D9] shadow-2xl border-b-4 border-[#62A1D9] sticky top-0 z-50" style={{ background: 'linear-gradient(90deg, #62A1D9 0%, #24094E 35%, #24094E 100%)' }}>
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-30">
          {/* Logo e Nome */}
          <div className="flex items-center relative">
            <Link
              to="/"
              className="flex items-center space-x-2 sm:space-x-3 group min-w-0 relative z-10"
            >
              <img
                src="/starbox-logo.png"
                alt="StarBox Logo"
                className="p-4 w-22 h-8 sm:w-30 sm:h-10 lg:w-38 lg:h-12 object-contain transition-transform duration-300 group-hover:scale-105"
                style={{ maxWidth: "180px", height: "auto", background: 'transparent' }}
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            </Link>

            {/* Menu Desktop */}
            <div className="hidden lg:block ml-6">
              <div className="flex items-center space-x-2">
                <NavLink to="/" active={isActive("/")}>
                  📊 Dashboard
                </NavLink>
                <NavLink to="/roteiros" active={isActive("/roteiros")}>
                  🗺️ Roteiros
                </NavLink>
                <NavLink to="/maquinas" active={isActive("/maquinas")}>
                  🎮 Máquinas
                </NavLink>
                <NavLink to="/lojas" active={isActive("/lojas")}>
                  🏪 Lojas
                </NavLink>


                <NavLink to="/produtos" active={isActive("/produtos")}> 
                  🧸 Produtos
                </NavLink>

                {(usuario?.role === "ADMIN" || usuario?.role === "MANUTENCAO" || usuario?.role === "GERENCIADOR") && (
                  <NavLink to="/pecas" active={isActive("/pecas")}> 
                    🛠️ Peças
                  </NavLink>
                )}


                {usuario?.role === "ADMIN" && (
                  <NavLink to="/financeiro/" active={isActive("/financeiro") || isActive("/financeiro/")}> 
                    💸 Financeiro
                  </NavLink>
                )}

                {usuario?.role === "ADMIN" && (
                  <>
                    <NavLink to="/graficos" active={isActive("/graficos")}>
                      📈 Gráficos
                    </NavLink>
                    <NavLink to="/relatorios" active={isActive("/relatorios")}>
                      📄 Relatórios
                    </NavLink>
                    <NavLink to="/usuarios" active={isActive("/usuarios")}>
                      👥 Usuários
                    </NavLink>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* User Info e Logout */}
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleMenu}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              {isMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>

            <div className="hidden md:block text-right bg-white/5 px-4 py-2 rounded-lg border border-white/10">
              <div className="text-sm font-semibold text-white">
                {usuario?.nome || "Usuário"}
              </div>
              <div className="text-xs text-accent-cream flex items-center justify-end gap-1">
                {usuario?.role === "ADMIN"
                  ? "🛡️ Administrador"
                  : "👤 Funcionário"}
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              <LogoutIcon />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </div>

      {/* Menu Mobile Dropdown */}
      {isMenuOpen && (
        <div className="lg:hidden bg-gray-900 border-t border-white/10 animate-fade-in-down">
          <div className="px-4 py-3 space-y-2">
            <MobileNavLink to="/" active={isActive("/")} onClick={closeMenu}>
              📊 Dashboard
            </MobileNavLink>
            <MobileNavLink
              to="/roteiros"
              active={isActive("/roteiros")}
              onClick={closeMenu}
            >
              🗺️ Roteiros
            </MobileNavLink>
            {usuario?.role === "ADMIN" && (
              <MobileNavLink to="/financeiro/" active={isActive("/financeiro") || isActive("/financeiro/")}
                onClick={closeMenu}>
                💸 Financeiro
              </MobileNavLink>
            )}
            {(usuario?.role === "ADMIN" || usuario?.role === "MANUTENCAO" || usuario?.role === "GERENCIADOR") && (
              <MobileNavLink to="/pecas" active={isActive("/pecas")}
                onClick={closeMenu}>
                🛠️ Peças
              </MobileNavLink>
            )}
            {/* ... Repetir para outros links ... */}
            {usuario?.role === "ADMIN" && (
              <MobileNavLink
                to="/usuarios"
                active={isActive("/usuarios")}
                onClick={closeMenu}
              >
                👥 Usuários
              </MobileNavLink>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

// Sub-componentes para manter o código limpo
const NavLink = ({ to, active, children }) => (
  <Link
    to={to}
    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
      active
        ? "bg-gradient-to-r from-primary to-accent-yellow text-white shadow-lg scale-105"
        : "text-gray-300 hover:bg-white/10 hover:text-white"
    }`}
  >
    {children}
  </Link>
);

const MobileNavLink = ({ to, active, onClick, children }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`block px-4 py-3 rounded-lg text-sm font-medium ${
      active
        ? "bg-gradient-to-r from-primary to-accent-yellow text-white"
        : "text-gray-300 hover:bg-white/10"
    }`}
  >
    {children}
  </Link>
);

// Ícones simples
const MenuIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 6h16M4 12h16M4 18h16"
    />
  </svg>
);
const CloseIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);
const LogoutIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
    />
  </svg>
);
