import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer.jsx";
import {
  PageHeader,
  StatsGrid,
  DataTable,
  AlertBox,
  Modal,
  Badge,
  ConfirmDialog,
} from "../components/UIComponents";
import { LoadingSpinner, EmptyState } from "../components/Loading";

export function StyleGuide() {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Dados de exemplo para as estatísticas
  const exampleStats = [
    {
      label: "Total de Vendas",
      value: "R$ 15.420,00",
      subtitle: "💰 Este mês",
      gradient: "bg-gradient-to-br from-primary to-accent-yellow",
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      label: "Pelúcias em Estoque",
      value: "1,248",
      subtitle: "🧸 Unidades",
      gradient: "bg-gradient-to-br from-blue-500 to-blue-600",
    },
    {
      label: "Máquinas Ativas",
      value: "42",
      subtitle: "🎮 Operacionais",
      gradient: "bg-gradient-to-br from-green-500 to-green-600",
    },
    {
      label: "Alertas Pendentes",
      value: "8",
      subtitle: "⚠️ Requer atenção",
      gradient: "bg-gradient-to-br from-red-500 to-red-600",
    },
  ];

  // Dados de exemplo para a tabela
  const tableHeaders = [
    {
      label: "Produto",
      key: "produto",
      icon: (
        <svg
          className="w-4 h-4 text-primary"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
        </svg>
      ),
    },
    {
      label: "Quantidade",
      key: "quantidade",
      icon: (
        <svg
          className="w-4 h-4 text-blue-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
      render: (row) => <Badge variant="info">{row.quantidade}</Badge>,
    },
    {
      label: "Status",
      key: "status",
      render: (row) => (
        <Badge variant={row.status === "Ativo" ? "success" : "danger"}>
          {row.status}
        </Badge>
      ),
    },
    {
      label: "Preço",
      key: "preco",
      render: (row) => (
        <span className="font-bold text-green-600">R$ {row.preco}</span>
      ),
    },
  ];

  const tableData = [
    {
      produto: "Urso de Pelúcia Grande",
      quantidade: 45,
      status: "Ativo",
      preco: "89,90",
    },
    {
      produto: "Coelho Fofo Médio",
      quantidade: 32,
      status: "Ativo",
      preco: "59,90",
    },
    {
      produto: "Panda Gigante",
      quantidade: 12,
      status: "Inativo",
      preco: "129,90",
    },
    {
      produto: "Unicórnio Colorido",
      quantidade: 28,
      status: "Ativo",
      preco: "79,90",
    },
  ];

  return (
    <div className="min-h-screen bg-background-light bg-pattern teddy-pattern">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Guia de Estilo"
          subtitle="Componentes e elementos de design do sistema"
          icon="🎨"
          action={
            <button className="btn-primary" onClick={() => setModalOpen(true)}>
              Abrir Modal
            </button>
          }
        />

        {/* Seção de Cores */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span className="bg-gradient-to-r from-primary to-accent-yellow p-2 rounded-lg text-white">
              🎨
            </span>
            Paleta de Cores
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="card text-center">
              <div className="w-full h-24 bg-primary rounded-lg mb-3"></div>
              <p className="font-bold text-sm">Primary</p>
              <p className="text-xs text-gray-600">#F2A20C</p>
            </div>
            <div className="card text-center">
              <div className="w-full h-24 bg-accent-yellow rounded-lg mb-3"></div>
              <p className="font-bold text-sm">Accent Yellow</p>
              <p className="text-xs text-gray-600">#F2B705</p>
            </div>
            <div className="card text-center">
              <div className="w-full h-24 bg-accent-cream rounded-lg mb-3"></div>
              <p className="font-bold text-sm">Accent Cream</p>
              <p className="text-xs text-gray-600">#F2DC99</p>
            </div>
            <div className="card text-center">
              <div className="w-full h-24 bg-background-light rounded-lg mb-3 border-2 border-gray-300"></div>
              <p className="font-bold text-sm">Background Light</p>
              <p className="text-xs text-gray-600">#F2F2F2</p>
            </div>
            <div className="card text-center">
              <div className="w-full h-24 bg-background-dark rounded-lg mb-3"></div>
              <p className="font-bold text-sm">Background Dark</p>
              <p className="text-xs text-gray-600">#0D0D0D</p>
            </div>
          </div>
        </section>

        {/* Cards de Estatísticas */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span className="bg-gradient-to-r from-blue-500 to-blue-600 p-2 rounded-lg text-white">
              📊
            </span>
            Cards de Estatísticas
          </h2>
          <StatsGrid stats={exampleStats} />
        </section>

        {/* Botões */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span className="bg-gradient-to-r from-green-500 to-green-600 p-2 rounded-lg text-white">
              🔘
            </span>
            Botões
          </h2>
          <div className="card">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button className="btn-primary">Botão Primary</button>
              <button className="btn-secondary">Botão Secondary</button>
              <button className="btn-success">Botão Success</button>
              <button className="btn-danger">Botão Danger</button>
            </div>
          </div>
        </section>

        {/* Inputs */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span className="bg-gradient-to-r from-purple-500 to-purple-600 p-2 rounded-lg text-white">
              ✏️
            </span>
            Campos de Entrada
          </h2>
          <div className="card">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Input Text
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Digite algo..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select
                </label>
                <select className="select-field">
                  <option>Opção 1</option>
                  <option>Opção 2</option>
                  <option>Opção 3</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Badges */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-2 rounded-lg text-white">
              🏷️
            </span>
            Badges
          </h2>
          <div className="card">
            <div className="flex flex-wrap gap-3">
              <Badge variant="success">Success</Badge>
              <Badge variant="danger">Danger</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="info">Info</Badge>
              <Badge variant="success" size="sm">
                Small
              </Badge>
              <Badge variant="info" size="lg">
                Large
              </Badge>
            </div>
          </div>
        </section>

        {/* Alerts */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span className="bg-gradient-to-r from-red-500 to-red-600 p-2 rounded-lg text-white">
              ⚠️
            </span>
            Alertas
          </h2>
          <div className="space-y-4">
            <AlertBox
              type="success"
              title="Sucesso!"
              message="Operação realizada com sucesso."
            />
            <AlertBox
              type="error"
              title="Erro!"
              message="Ocorreu um erro ao processar sua solicitação."
            />
            <AlertBox
              type="warning"
              title="Atenção!"
              message="Esta ação requer sua confirmação."
            />
            <AlertBox type="info" message="Esta é uma mensagem informativa." />
          </div>
        </section>

        {/* Tabela */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-2 rounded-lg text-white">
              📋
            </span>
            Tabela de Dados
          </h2>
          <DataTable headers={tableHeaders} data={tableData} />
        </section>

        {/* Loading States */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span className="bg-gradient-to-r from-pink-500 to-pink-600 p-2 rounded-lg text-white">
              ⏳
            </span>
            Estados de Loading
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card">
              <LoadingSpinner size="sm" message="Carregando..." />
            </div>
            <div className="card">
              <LoadingSpinner size="md" message="Processando..." />
            </div>
            <div className="card">
              <LoadingSpinner size="lg" message="Aguarde..." />
            </div>
          </div>
        </section>

        {/* Empty State */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span className="bg-gradient-to-r from-gray-500 to-gray-600 p-2 rounded-lg text-white">
              📭
            </span>
            Estado Vazio
          </h2>
          <EmptyState
            icon="🧸"
            title="Nenhuma pelúcia encontrada"
            description="Adicione sua primeira pelúcia ao estoque para começar"
            action={<button className="btn-primary">Adicionar Pelúcia</button>}
          />
        </section>

        {/* Ações de Demonstração */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span className="bg-gradient-to-r from-teal-500 to-teal-600 p-2 rounded-lg text-white">
              🎯
            </span>
            Diálogos Interativos
          </h2>
          <div className="card">
            <div className="flex gap-4">
              <button
                className="btn-primary"
                onClick={() => setModalOpen(true)}
              >
                Abrir Modal
              </button>
              <button
                className="btn-danger"
                onClick={() => setConfirmOpen(true)}
              >
                Abrir Confirmação
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Modal de exemplo */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Modal de Exemplo"
        size="md"
      >
        <div className="mb-6">
          <p className="text-gray-700 mb-4">
            Este é um exemplo de modal. Você pode adicionar qualquer conteúdo
            aqui.
          </p>
          <div className="space-y-4">
            <input
              type="text"
              className="input-field"
              placeholder="Digite algo..."
            />
            <select className="select-field">
              <option>Selecione uma opção</option>
              <option>Opção 1</option>
              <option>Opção 2</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">
            Cancelar
          </button>
          <button onClick={() => setModalOpen(false)} className="btn-primary">
            Confirmar
          </button>
        </div>
      </Modal>

      {/* Dialog de confirmação */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => alert("Confirmado!")}
        title="Confirmar Ação"
        message="Tem certeza que deseja realizar esta ação? Esta operação não pode ser desfeita."
        confirmText="Sim, confirmar"
        cancelText="Cancelar"
      />

      <Footer />
    </div>
  );
}
