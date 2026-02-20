import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus } from 'lucide-react';
import { billsAPI, categoriesAPI } from '../services/api';
import { toast } from 'sonner';

export default function BillModal({ open, onClose, onSuccess, categories, bill = null, defaultType = 'company' }) {
  const [formData, setFormData] = useState({
    name: bill?.name || '',
    due_date: bill?.due_date || '',
    city: bill?.city || '',
    account: bill?.account || '',
    category: bill?.category || '',
    observations: bill?.observations || '',
    bill_type: bill?.bill_type || defaultType,
    amount: bill?.amount || ''
  });
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let categoryToUse = formData.category;

      if (showNewCategory && newCategory.trim()) {
        const newCat = await categoriesAPI.create(newCategory.trim());
        categoryToUse = newCat.name;
      }

      let amountValue = parseFloat(formData.amount);
      if (!isFinite(amountValue) || isNaN(amountValue)) {
        amountValue = 0;
      }
      const billData = {
        ...formData,
        category: categoryToUse,
        amount: amountValue
      };

      if (bill) {
        await billsAPI.update(bill.id, billData);
        toast.success('Conta atualizada com sucesso!');
      } else {
        await billsAPI.create(billData);
        toast.success('Conta cadastrada com sucesso!');
      }

      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bill-modal-content" data-testid="bill-modal">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            {bill ? 'Editar Conta' : 'Cadastrar Conta à Pagar'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Conta de Luz"
                required
                data-testid="input-name"
              />
            </div>
            <div>
              <Label htmlFor="due_date">Data de Vencimento *</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                required
                data-testid="input-due-date"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Valor (R$) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
                data-testid="input-amount"
              />
            </div>
            <div></div>
          </div>

          <div>
            <Label htmlFor="city">Cidade *</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="São Paulo"
              required
              data-testid="input-city"
            />
          </div>

          <div>
            <Label htmlFor="account">Conta (Nome ou Número) *</Label>
            <Input
              id="account"
              value={formData.account}
              onChange={(e) => setFormData({ ...formData, account: e.target.value })}
              placeholder="Conta de Luz - 123456"
              required
              data-testid="input-account"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Categoria *</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowNewCategory(!showNewCategory)}
                className="text-purple-600 hover:text-purple-700"
                data-testid="toggle-new-category"
              >
                <Plus size={16} className="mr-1" />
                Nova Categoria
              </Button>
            </div>

            {showNewCategory ? (
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Digite o nome da nova categoria"
                required
                data-testid="input-new-category"
              />
            ) : (
              <select
                className="input-field"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                required
                data-testid="select-category"
              >
                <option value="">Selecione uma categoria</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <Label htmlFor="bill_type">Tipo *</Label>
            <select
              className="input-field"
              value={formData.bill_type}
              onChange={e => setFormData({ ...formData, bill_type: e.target.value })}
              required
              data-testid="select-bill-type"
            >
              <option value="">Selecione o tipo</option>
              <option value="company">Empresarial</option>
              <option value="personal">Particular</option>
            </select>
          </div>

          <div>
            <Label htmlFor="observations">Observações</Label>
            <Textarea
              id="observations"
              value={formData.observations}
              onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              placeholder="Internet / App / Email"
              rows={3}
              data-testid="input-observations"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              data-testid="cancel-button"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              data-testid="submit-button"
            >
              {loading ? 'Salvando...' : bill ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
