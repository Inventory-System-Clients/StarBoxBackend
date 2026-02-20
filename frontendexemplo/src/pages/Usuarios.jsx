import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";

export function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState({ role: "", ativo: "true", busca: "" });

  useEffect(() => {
    carregarUsuarios();
  }, [filtro]);

  const carregarUsuarios = async () => {
    try {
      const params = new URLSearchParams();
      if (filtro.role) params.append("role", filtro.role);
      if (filtro.ativo) params.append("ativo", filtro.ativo);
      if (filtro.busca) params.append("busca", filtro.busca);

      const response = await api.get(`/usuarios?${params.toString()}`);
      setUsuarios(response.data);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDesativar = async (id) => {
    if (!window.confirm("Deseja realmente desativar este usuário?")) return;

    try {
      await api.delete(`/usuarios/${id}`);
      carregarUsuarios();
    } catch (error) {
      alert(error.response?.data?.error || "Erro ao desativar usuário");
    }
  };

  const handleReativar = async (id) => {
    try {
      await api.patch(`/usuarios/${id}/reativar`);
      carregarUsuarios();
    } catch (error) {
      alert(error.response?.data?.error || "Erro ao reativar usuário");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#62A1D9] via-[#A6806A] to-[#24094E] text-[#24094E]">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Gestão de Usuários
          </h1>
          <Link to="/usuarios/novo" className="btn-primary">
            ➕ Novo Usuário
          </Link>
        </div>

        {/* Filtros */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Nome ou email..."
                value={filtro.busca}
                onChange={(e) =>
                  setFiltro({ ...filtro, busca: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Perfil
              </label>
              <select
                className="input-field"
                value={filtro.role}
                onChange={(e) => setFiltro({ ...filtro, role: e.target.value })}
              >
                <option value="">Todos</option>
                <option value="ADMIN">Administrador</option>
                <option value="FUNCIONARIO">Funcionário</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                className="input-field"
                value={filtro.ativo}
                onChange={(e) =>
                  setFiltro({ ...filtro, ativo: e.target.value })
                }
              >
                <option value="">Todos</option>
                <option value="true">Ativos</option>
                <option value="false">Inativos</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de Usuários */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Perfil
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Telefone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Lojas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usuarios.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {usuario.nome}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {usuario.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          usuario.role === "ADMIN"
                            ? "bg-primary/20 text-primary"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {usuario.role === "ADMIN" ? "Admin" : "Funcionário"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {usuario.telefone || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {usuario.role === "ADMIN" ? (
                        <span className="text-gray-400 italic">Todas</span>
                      ) : usuario.permissoesLojas?.length > 0 ? (
                        <span>{usuario.permissoesLojas.length} loja(s)</span>
                      ) : (
                        <span className="text-red-600">Nenhuma</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {usuario.ativo ? (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                          Ativo
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <Link
                          to={`/usuarios/${usuario.id}/editar`}
                          className="text-primary hover:text-primary-light font-semibold"
                        >
                          Editar
                        </Link>
                        {usuario.ativo ? (
                          <button
                            onClick={() => handleDesativar(usuario.id)}
                            className="text-red-600 hover:text-red-800 font-semibold"
                          >
                            Desativar
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReativar(usuario.id)}
                            className="text-green-600 hover:text-green-800 font-semibold"
                          >
                            Reativar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {usuarios.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Nenhum usuário encontrado
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
