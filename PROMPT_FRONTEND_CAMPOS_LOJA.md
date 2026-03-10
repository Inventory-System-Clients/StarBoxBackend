# 🏪 Prompt Frontend - Campos Número e Bairro no Formulário de Lojas

## 📋 Objetivo
Adicionar os campos **"Número"** e **"Bairro"** no formulário de criação e edição de lojas.

---

## ✅ Alterações no Backend (Já Implementadas)

O backend já foi atualizado e aceita os seguintes campos:

```typescript
interface Loja {
  id: string;
  nome: string;
  endereco: string;
  numero: string;        // ✨ NOVO
  bairro: string;        // ✨ NOVO
  cidade: string;
  estado: string;
  responsavel: string;
  telefone: string;
  ativo: boolean;
}
```

---

## 🎨 Implementação Frontend

### 1. **Adicionar Campos no Formulário**

Insira os campos `numero` e `bairro` logo após o campo `endereco`:

```jsx
<form onSubmit={handleSubmit}>
  {/* Campo Nome */}
  <div className="form-group">
    <label htmlFor="nome">Nome da Loja *</label>
    <input
      type="text"
      id="nome"
      name="nome"
      value={formData.nome}
      onChange={handleChange}
      required
      placeholder="Ex: Loja Centro"
    />
  </div>

  {/* Campo Endereço */}
  <div className="form-group">
    <label htmlFor="endereco">Endereço</label>
    <input
      type="text"
      id="endereco"
      name="endereco"
      value={formData.endereco}
      onChange={handleChange}
      placeholder="Ex: Rua das Flores"
    />
  </div>

  {/* ✨ NOVO: Campo Número */}
  <div className="form-group">
    <label htmlFor="numero">Número</label>
    <input
      type="text"
      id="numero"
      name="numero"
      value={formData.numero}
      onChange={handleChange}
      placeholder="Ex: 123"
      maxLength={20}
    />
  </div>

  {/* ✨ NOVO: Campo Bairro */}
  <div className="form-group">
    <label htmlFor="bairro">Bairro</label>
    <input
      type="text"
      id="bairro"
      name="bairro"
      value={formData.bairro}
      onChange={handleChange}
      placeholder="Ex: Centro"
      maxLength={100}
    />
  </div>

  {/* Campo Cidade */}
  <div className="form-group">
    <label htmlFor="cidade">Cidade</label>
    <input
      type="text"
      id="cidade"
      name="cidade"
      value={formData.cidade}
      onChange={handleChange}
      placeholder="Ex: São Paulo"
    />
  </div>

  {/* Campo Estado */}
  <div className="form-group">
    <label htmlFor="estado">Estado (UF)</label>
    <input
      type="text"
      id="estado"
      name="estado"
      value={formData.estado}
      onChange={handleChange}
      placeholder="Ex: SP"
      maxLength={2}
    />
  </div>

  {/* Restante dos campos... */}
</form>
```

---

### 2. **Atualizar Estado do Formulário**

Adicione os novos campos no estado inicial:

```javascript
const [formData, setFormData] = useState({
  nome: '',
  endereco: '',
  numero: '',        // ✨ NOVO
  bairro: '',        // ✨ NOVO
  cidade: '',
  estado: '',
  responsavel: '',
  telefone: '',
  ativo: true
});
```

---

### 3. **Incluir Campos na Requisição**

Certifique-se de que os campos `numero` e `bairro` estão sendo enviados na requisição:

#### **Criar Loja:**
```javascript
const criarLoja = async (dados) => {
  try {
    const response = await fetch('/api/lojas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        nome: dados.nome,
        endereco: dados.endereco,
        numero: dados.numero,        // ✨ NOVO
        bairro: dados.bairro,        // ✨ NOVO
        cidade: dados.cidade,
        estado: dados.estado,
        responsavel: dados.responsavel,
        telefone: dados.telefone
      })
    });

    if (response.ok) {
      const novaLoja = await response.json();
      alert('Loja criada com sucesso!');
      return novaLoja;
    } else {
      const erro = await response.json();
      alert(`Erro: ${erro.error}`);
    }
  } catch (error) {
    console.error('Erro ao criar loja:', error);
    alert('Erro ao criar loja');
  }
};
```

#### **Atualizar Loja:**
```javascript
const atualizarLoja = async (lojaId, dados) => {
  try {
    const response = await fetch(`/api/lojas/${lojaId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        nome: dados.nome,
        endereco: dados.endereco,
        numero: dados.numero,        // ✨ NOVO
        bairro: dados.bairro,        // ✨ NOVO
        cidade: dados.cidade,
        estado: dados.estado,
        responsavel: dados.responsavel,
        telefone: dados.telefone,
        ativo: dados.ativo
      })
    });

    if (response.ok) {
      const lojaAtualizada = await response.json();
      alert('Loja atualizada com sucesso!');
      return lojaAtualizada;
    } else {
      const erro = await response.json();
      alert(`Erro: ${erro.error}`);
    }
  } catch (error) {
    console.error('Erro ao atualizar loja:', error);
    alert('Erro ao atualizar loja');
  }
};
```

---

### 4. **Exibir Campos na Listagem/Detalhes**

Ao exibir os dados da loja, inclua os novos campos:

```jsx
<div className="loja-detalhes">
  <h2>{loja.nome}</h2>
  
  <div className="endereco-completo">
    <p>
      <strong>Endereço:</strong> {loja.endereco}
      {loja.numero && `, ${loja.numero}`}
    </p>
    {loja.bairro && (
      <p><strong>Bairro:</strong> {loja.bairro}</p>
    )}
    <p>
      <strong>Cidade:</strong> {loja.cidade} - {loja.estado}
    </p>
  </div>

  <p><strong>Responsável:</strong> {loja.responsavel}</p>
  <p><strong>Telefone:</strong> {loja.telefone}</p>
</div>
```

**Ou exibir endereço completo em uma linha:**

```jsx
<p>
  <strong>Endereço Completo:</strong> 
  {[
    loja.endereco,
    loja.numero && `nº ${loja.numero}`,
    loja.bairro,
    loja.cidade,
    loja.estado
  ].filter(Boolean).join(', ')}
</p>

// Exemplo de saída:
// "Rua das Flores, nº 123, Centro, São Paulo, SP"
```

---

## 🎨 Sugestão de Layout (Grid)

Para um layout mais organizado, você pode usar grid com 2 colunas:

```jsx
<div className="form-row">
  <div className="form-group col-md-8">
    <label>Endereço</label>
    <input
      type="text"
      name="endereco"
      value={formData.endereco}
      onChange={handleChange}
      placeholder="Rua, Avenida..."
    />
  </div>

  <div className="form-group col-md-4">
    <label>Número</label>
    <input
      type="text"
      name="numero"
      value={formData.numero}
      onChange={handleChange}
      placeholder="123"
    />
  </div>
</div>

<div className="form-row">
  <div className="form-group col-md-6">
    <label>Bairro</label>
    <input
      type="text"
      name="bairro"
      value={formData.bairro}
      onChange={handleChange}
      placeholder="Centro"
    />
  </div>

  <div className="form-group col-md-4">
    <label>Cidade</label>
    <input
      type="text"
      name="cidade"
      value={formData.cidade}
      onChange={handleChange}
      placeholder="São Paulo"
    />
  </div>

  <div className="form-group col-md-2">
    <label>UF</label>
    <input
      type="text"
      name="estado"
      value={formData.estado}
      onChange={handleChange}
      placeholder="SP"
      maxLength={2}
    />
  </div>
</div>
```

---

## 📱 Exemplo Completo (React Component)

```jsx
import React, { useState } from 'react';

function FormularioLoja({ lojaInicial = null, onSalvar, onCancelar }) {
  const [formData, setFormData] = useState(lojaInicial || {
    nome: '',
    endereco: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    responsavel: '',
    telefone: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nome) {
      alert('Nome da loja é obrigatório');
      return;
    }

    await onSalvar(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="formulario-loja">
      <h3>{lojaInicial ? 'Editar Loja' : 'Nova Loja'}</h3>

      <div className="form-group">
        <label>Nome da Loja *</label>
        <input
          type="text"
          name="nome"
          value={formData.nome}
          onChange={handleChange}
          required
          placeholder="Loja Centro"
        />
      </div>

      <div className="form-row">
        <div className="form-group col-8">
          <label>Endereço</label>
          <input
            type="text"
            name="endereco"
            value={formData.endereco}
            onChange={handleChange}
            placeholder="Rua das Flores"
          />
        </div>

        <div className="form-group col-4">
          <label>Número</label>
          <input
            type="text"
            name="numero"
            value={formData.numero}
            onChange={handleChange}
            placeholder="123"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group col-6">
          <label>Bairro</label>
          <input
            type="text"
            name="bairro"
            value={formData.bairro}
            onChange={handleChange}
            placeholder="Centro"
          />
        </div>

        <div className="form-group col-4">
          <label>Cidade</label>
          <input
            type="text"
            name="cidade"
            value={formData.cidade}
            onChange={handleChange}
            placeholder="São Paulo"
          />
        </div>

        <div className="form-group col-2">
          <label>UF</label>
          <input
            type="text"
            name="estado"
            value={formData.estado}
            onChange={handleChange}
            placeholder="SP"
            maxLength={2}
            style={{ textTransform: 'uppercase' }}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Responsável</label>
        <input
          type="text"
          name="responsavel"
          value={formData.responsavel}
          onChange={handleChange}
          placeholder="João Silva"
        />
      </div>

      <div className="form-group">
        <label>Telefone</label>
        <input
          type="text"
          name="telefone"
          value={formData.telefone}
          onChange={handleChange}
          placeholder="(11) 98765-4321"
        />
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-primary">
          {lojaInicial ? 'Atualizar' : 'Criar'} Loja
        </button>
        <button type="button" onClick={onCancelar} className="btn-secondary">
          Cancelar
        </button>
      </div>
    </form>
  );
}

export default FormularioLoja;
```

---

## 📊 Exemplo de Tabela de Listagem

```jsx
<table className="tabela-lojas">
  <thead>
    <tr>
      <th>Nome</th>
      <th>Endereço Completo</th>
      <th>Responsável</th>
      <th>Telefone</th>
      <th>Ações</th>
    </tr>
  </thead>
  <tbody>
    {lojas.map(loja => (
      <tr key={loja.id}>
        <td>{loja.nome}</td>
        <td>
          {[
            loja.endereco,
            loja.numero && `nº ${loja.numero}`,
            loja.bairro,
            `${loja.cidade}/${loja.estado}`
          ].filter(Boolean).join(', ')}
        </td>
        <td>{loja.responsavel}</td>
        <td>{loja.telefone}</td>
        <td>
          <button onClick={() => editarLoja(loja)}>Editar</button>
          <button onClick={() => deletarLoja(loja.id)}>Excluir</button>
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

---

## ✅ Checklist de Implementação

- [ ] Adicionar campos `numero` e `bairro` no estado do formulário
- [ ] Adicionar inputs de `numero` e `bairro` no JSX
- [ ] Incluir `numero` e `bairro` na requisição POST (criar)
- [ ] Incluir `numero` e `bairro` na requisição PUT (atualizar)
- [ ] Atualizar exibição de endereço na listagem de lojas
- [ ] Atualizar exibição de endereço nos detalhes da loja
- [ ] Testar criação de loja com os novos campos
- [ ] Testar edição de loja com os novos campos
- [ ] Validar que campos são opcionais (podem ficar vazios)

---

## 🎯 Exemplo de Payload Completo

**POST /api/lojas**
```json
{
  "nome": "Loja Centro",
  "endereco": "Rua das Flores",
  "numero": "123",
  "bairro": "Centro",
  "cidade": "São Paulo",
  "estado": "SP",
  "responsavel": "João Silva",
  "telefone": "(11) 98765-4321"
}
```

**Resposta (201 Created)**
```json
{
  "id": "uuid-gerado",
  "nome": "Loja Centro",
  "endereco": "Rua das Flores",
  "numero": "123",
  "bairro": "Centro",
  "cidade": "São Paulo",
  "estado": "SP",
  "responsavel": "João Silva",
  "telefone": "(11) 98765-4321",
  "ativo": true,
  "createdAt": "2026-03-10T15:30:00.000Z",
  "updatedAt": "2026-03-10T15:30:00.000Z"
}
```

---

## 💡 Dicas

1. **Validação de CEP**: Você pode adicionar um campo de CEP e usar alguma API (ViaCEP) para preencher automaticamente o endereço, número, bairro, cidade e estado.

2. **Formatação**: Os campos `numero` e `bairro` são opcionais. Apenas nome é obrigatório.

3. **Limites**:
   - `numero`: máximo 20 caracteres
   - `bairro`: máximo 100 caracteres

4. **Normalização**: Considere converter o estado (UF) para maiúsculas automaticamente no frontend.

---

**📅 Data de criação**: 10/03/2026  
**🔧 Backend atualizado**: ✅ Sim  
**🗄️ Banco de dados**: Execute o arquivo `adicionar-campos-lojas.sql` no DBeaver
