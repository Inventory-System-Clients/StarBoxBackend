import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";

const SENHA_ACESSO = "agarramais2025"; // Defina a senha de acesso aqui

export function Registrar() {
  const [senhaAcesso, setSenhaAcesso] = useState("");
  const [acessoLiberado, setAcessoLiberado] = useState(false);
  const [erroAcesso, setErroAcesso] = useState("");
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    senha: "",
    confirmarSenha: "",
    telefone: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { registrar } = useAuth();
  const navigate = useNavigate();

  const verificarSenhaAcesso = (e) => {
    e.preventDefault();
    if (senhaAcesso === SENHA_ACESSO) {
      setAcessoLiberado(true);
      setErroAcesso("");
    } else {
      setErroAcesso("Senha de acesso incorreta");
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.senha !== formData.confirmarSenha) {
      setError("As senhas não coincidem");
      return;
    }

    if (formData.senha.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    setLoading(true);

    const result = await registrar(
      formData.nome,
      formData.email,
      formData.senha,
      formData.telefone
    );

    if (result.success) {
      navigate("/");
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  // Se o acesso ainda não foi liberado, mostra a tela de senha
  if (!acessoLiberado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary via-background-light to-accent-cream/30 px-4 py-8 bg-pattern relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-accent-yellow/10 to-transparent rounded-full blur-3xl"></div>

        <div className="relative card-gradient max-w-md w-full backdrop-blur-sm">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-accent-yellow rounded-full shadow-2xl mb-3">
              <svg
                className="w-8 h-8 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold mb-1">
              <span className="text-gradient">Acesso Restrito</span>
            </h1>
            <p className="text-gray-600 text-sm">
              Digite a senha para criar uma nova conta 🔐
            </p>
          </div>

          <form onSubmit={verificarSenhaAcesso} className="space-y-4">
            {erroAcesso && (
              <div className="alert-error animate-pulse">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{erroAcesso}</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Senha de Acesso
              </label>
              <input
                type="password"
                value={senhaAcesso}
                onChange={(e) => setSenhaAcesso(e.target.value)}
                className="input-field"
                placeholder="Digite a senha de acesso"
                required
              />
            </div>

            <button type="submit" className="w-full btn-primary">
              Verificar Senha
            </button>

            <div className="text-center pt-3">
              <Link
                to="/login"
                className="text-sm text-primary hover:text-primary-dark transition-colors font-medium"
              >
                ← Voltar para o Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary via-background-light to-accent-cream/30 px-4 py-8 bg-pattern relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-accent-yellow/10 to-transparent rounded-full blur-3xl"></div>

      <div className="relative card-gradient max-w-md w-full backdrop-blur-sm">
        {/* Logo/Header Section */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-accent-yellow rounded-full shadow-2xl mb-3 transform hover:rotate-12 transition-transform duration-300">
            <svg
              className="w-8 h-8 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-1">
            <span className="text-gradient">Criar Conta</span>
          </h1>
          <p className="text-gray-600 text-sm">
            Junte-se ao Sistema Agarra Mais 🧸
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="alert-error animate-pulse">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="nome"
              className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2"
            >
              <svg
                className="w-4 h-4 text-primary"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clipRule="evenodd"
                />
              </svg>
              Nome Completo
            </label>
            <input
              id="nome"
              name="nome"
              type="text"
              value={formData.nome}
              onChange={handleChange}
              className="input-field"
              placeholder="Seu nome"
              required
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2"
            >
              <svg
                className="w-4 h-4 text-primary"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="input-field"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div>
            <label
              htmlFor="telefone"
              className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2"
            >
              <svg
                className="w-4 h-4 text-gray-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
              Telefone <span className="text-xs text-gray-500">(opcional)</span>
            </label>
            <input
              id="telefone"
              name="telefone"
              type="tel"
              value={formData.telefone}
              onChange={handleChange}
              className="input-field"
              placeholder="(11) 99999-9999"
            />
          </div>

          <div>
            <label
              htmlFor="senha"
              className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2"
            >
              <svg
                className="w-4 h-4 text-primary"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
              Senha
            </label>
            <input
              id="senha"
              name="senha"
              type="password"
              value={formData.senha}
              onChange={handleChange}
              className="input-field"
              placeholder="Mínimo 6 caracteres"
              required
            />
          </div>

          <div>
            <label
              htmlFor="confirmarSenha"
              className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2"
            >
              <svg
                className="w-4 h-4 text-primary"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Confirmar Senha
            </label>
            <input
              id="confirmarSenha"
              name="confirmarSenha"
              type="password"
              value={formData.confirmarSenha}
              onChange={handleChange}
              className="input-field"
              placeholder="Digite a senha novamente"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
          >
            {loading ? (
              <>
                <div className="spinner w-5 h-5"></div>
                Registrando...
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
                Criar Conta
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 rounded-full">
                ou
              </span>
            </div>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            Já tem uma conta?{" "}
            <Link
              to="/login"
              className="font-bold text-primary hover:text-accent-yellow transition-colors inline-flex items-center gap-1"
            >
              Faça login
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
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
          </p>
        </div>

        {/* Footer decorativo */}
        <div className="mt-6 pt-4 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            🧸 Bem-vindo à família Agarra Mais
          </p>
        </div>
      </div>
    </div>
  );
}
