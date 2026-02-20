import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Lock, Mail, User as UserIcon } from 'lucide-react';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const { usuario } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee'
  });
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (usuario) {
      navigate('/financeiro/dashboard');
    }
  }, [usuario, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let result;
      if (isLogin) {
        result = await login(formData.email, formData.password);
      } else {
        result = await register(formData.name, formData.email, formData.password, formData.role);
      }

      if (result.success) {
        toast.success(isLogin ? 'Login realizado com sucesso!' : 'Conta criada com sucesso!');
        navigate('/financeiro/dashboard');
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Erro ao processar sua solicitação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-yellow-50 p-4" data-testid="login-page">
      <div className="w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-purple-100">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 mb-4">
              <span className="text-white font-bold text-2xl">SB</span>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
              Star Box
            </h1>
            <p className="text-gray-600">Gerenciamento de Contas a Pagar</p>
          </div>

          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 rounded-md transition-all ${
                isLogin
                  ? 'bg-white text-purple-600 shadow-sm font-medium'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              data-testid="tab-login"
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 rounded-md transition-all ${
                !isLogin
                  ? 'bg-white text-purple-600 shadow-sm font-medium'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              data-testid="tab-register"
            >
              Cadastrar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <Label htmlFor="name" className="flex items-center space-x-2">
                  <UserIcon size={16} />
                  <span>Nome Completo</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Digite seu nome"
                  required={!isLogin}
                  data-testid="input-name"
                  className="mt-1"
                />
              </div>
            )}

            <div>
              <Label htmlFor="email" className="flex items-center space-x-2">
                <Mail size={16} />
                <span>Email</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="seu@email.com"
                required
                data-testid="input-email"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password" className="flex items-center space-x-2">
                <Lock size={16} />
                <span>Senha</span>
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                required
                data-testid="input-password"
                className="mt-1"
              />
            </div>

            {!isLogin && (
              <div>
                <Label htmlFor="role">Tipo de Conta</Label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  data-testid="select-role"
                >
                  <option value="employee">Funcionário</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-3 rounded-lg shadow-lg hover:shadow-xl transition-all"
              data-testid="submit-button"
            >
              {loading ? 'Processando...' : isLogin ? 'Entrar' : 'Criar Conta'}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-600 mt-6">
          Sistema de gerenciamento financeiro da Star Box
        </p>
      </div>
    </div>
  );
}
