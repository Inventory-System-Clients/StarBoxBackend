import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { billsAPI, categoriesAPI } from "../services/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Filter,
  Search,
} from "lucide-react";
import BillModal from "../components/BillModal";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import Header from "../components/Header";
import Footer from "../components/Footer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";

export default function BillsPage() {
  const { type } = useParams();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const billType = type === "company" ? "company" : "personal";
  const pageTitle =
    type === "company" ? "Contas Empresariais" : "Contas Particulares";

  const [bills, setBills] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    billId: null,
  });

  const [filters, setFilters] = useState({
    status: "",
    category: "",
    city: "",
    search: "",
  });

  useEffect(() => {
    fetchData();
  }, [billType]);

  const fetchData = async () => {
    try {
      const [billsData, categoriesData] = await Promise.all([
        billsAPI.getAll({ bill_type: billType }),
        categoriesAPI.getAll(),
      ]);
      console.log("Bills retornados da API:", billsData);
      setBills(billsData);
      setCategories(categoriesData);
    } catch (error) {
      toast.error("Erro ao carregar contas");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (billId, newStatus) => {
    try {
      await billsAPI.updateStatus(billId, newStatus);
      toast.success(
        `Conta marcada como ${newStatus === "paid" ? "paga" : "em aberto"}!`,
      );
      fetchData();
    } catch (error) {
      toast.error("Erro ao atualizar status da conta");
    }
  };

  const handleDelete = async () => {
    try {
      await billsAPI.delete(deleteDialog.billId);
      toast.success("Conta excluída com sucesso!");
      setDeleteDialog({ open: false, billId: null });
      fetchData();
    } catch (error) {
      toast.error("Erro ao excluir conta");
    }
  };

  const handleEdit = (bill) => {
    setEditingBill(bill);
    setShowModal(true);
  };

  const filteredBills = bills.filter((bill) => {
    if (filters.status && bill.status !== filters.status) return false;
    if (filters.category && bill.category !== filters.category) return false;
    if (
      filters.city &&
      !bill.city.toLowerCase().includes(filters.city.toLowerCase())
    )
      return false;
    if (
      filters.search &&
      !(bill.name || bill.account)
        ?.toLowerCase()
        .includes(filters.search.toLowerCase())
    )
      return false;
    return true;
  });

  const getDaysUntilDue = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (bill) => {
    if (bill.status === "paid") return "bg-green-100 text-green-700";
    const days = getDaysUntilDue(bill.due_date);
    if (days < 0) return "bg-red-100 text-red-700";
    if (days <= 1) return "bg-red-100 text-red-700";
    if (days <= 3) return "bg-yellow-100 text-yellow-700";
    return "bg-blue-100 text-blue-700";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col app-container">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 space-y-4 sm:space-y-0">
            <div>
              <h1
                className="text-4xl font-bold text-gray-800 mb-2"
                data-testid="page-title"
              >
                {pageTitle}
              </h1>
              <p className="text-gray-600">
                Gerencie suas contas{" "}
                {type === "company" ? "empresariais" : "particulares"}
              </p>
            </div>
            {isAdmin && (
              <Button
                onClick={() => {
                  setEditingBill(null);
                  setShowModal(true);
                }}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg btn-primary"
                data-testid="btn-add-bill"
              >
                <Plus size={20} className="mr-2" />
                Nova Conta
              </Button>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-purple-100">
            <div className="flex items-center space-x-2 mb-4">
              <Filter size={20} className="text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-800">Filtros</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">
                  Buscar
                </label>
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <Input
                    placeholder="Nome da conta"
                    value={filters.search}
                    onChange={(e) =>
                      setFilters({ ...filters, search: e.target.value })
                    }
                    className="pl-10"
                    data-testid="filter-search"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">
                  Status
                </label>
                <Select
                  value={filters.status}
                  onValueChange={(value) =>
                    setFilters({ ...filters, status: value })
                  }
                >
                  <SelectTrigger data-testid="filter-status">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="open">Em Aberto</SelectItem>
                    <SelectItem value="paid">Paga</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">
                  Categoria
                </label>
                <Select
                  value={filters.category}
                  onValueChange={(value) =>
                    setFilters({ ...filters, category: value })
                  }
                >
                  <SelectTrigger data-testid="filter-category">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">
                  Cidade
                </label>
                <Input
                  placeholder="Filtrar por cidade"
                  value={filters.city}
                  onChange={(e) =>
                    setFilters({ ...filters, city: e.target.value })
                  }
                  data-testid="filter-city"
                />
              </div>
            </div>
            {(filters.status ||
              filters.category ||
              filters.city ||
              filters.search) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setFilters({ status: "", category: "", city: "", search: "" })
                }
                className="mt-3 text-purple-600 hover:text-purple-700"
                data-testid="btn-clear-filters"
              >
                Limpar Filtros
              </Button>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-md border border-purple-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="bills-table">
                <thead className="bg-gradient-to-r from-purple-50 to-blue-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Conta
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Vencimento
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Valor
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Categoria
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Cidade
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredBills.length === 0 ? (
                    <tr>
                      <td
                        colSpan="7"
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        Nenhuma conta encontrada
                      </td>
                    </tr>
                  ) : (
                    filteredBills.map((bill) => (
                      <tr
                        key={bill.id}
                        className="hover:bg-purple-50 transition-colors"
                        data-testid={`bill-row-${bill.id}`}
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-800">
                              {bill.name || bill.account}
                            </p>
                            {bill.observations && (
                              <p className="text-sm text-gray-500">
                                {bill.observations}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-700">
                          {new Date(bill.due_date).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-gray-800">
                            R$ {(bill.value !== undefined && bill.value !== null && !isNaN(Number(bill.value)) && isFinite(Number(bill.value)))
                              ? Number(bill.value).toFixed(2)
                              : "--"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                            {bill.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-700">{bill.city}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(bill)}`}
                          >
                            {bill.status === "paid" ? "Paga" : "Em Aberto"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center space-x-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleStatusChange(
                                  bill.id,
                                  bill.status === "paid" ? "open" : "paid",
                                )
                              }
                              className={`${
                                bill.status === "paid"
                                  ? "text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                                  : "text-green-600 hover:text-green-700 hover:bg-green-50"
                              }`}
                              title={
                                bill.status === "paid"
                                  ? "Marcar como em aberto"
                                  : "Marcar como paga"
                              }
                              data-testid={`btn-toggle-status-${bill.id}`}
                            >
                              {bill.status === "paid" ? (
                                <XCircle size={18} />
                              ) : (
                                <CheckCircle size={18} />
                              )}
                            </Button>
                            {isAdmin && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEdit(bill)}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  data-testid={`btn-edit-${bill.id}`}
                                >
                                  <Edit size={18} />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    setDeleteDialog({
                                      open: true,
                                      billId: bill.id,
                                    })
                                  }
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  data-testid={`btn-delete-${bill.id}`}
                                >
                                  <Trash2 size={18} />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {showModal && (
        <BillModal
          open={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingBill(null);
          }}
          onSuccess={() => {
            fetchData();
            setShowModal(false);
            setEditingBill(null);
          }}
          categories={categories}
          bill={editingBill}
          defaultType={billType}
        />
      )}

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, billId: null })}
      >
        <AlertDialogContent data-testid="delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta conta? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="btn-cancel-delete">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              data-testid="btn-confirm-delete"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
