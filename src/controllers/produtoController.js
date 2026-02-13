import { Produto } from "../models/index.js";

// US06 - Listar produtos
export const listarProdutos = async (req, res) => {
  try {
    const { categoria, incluirInativos } = req.query;
    const where = {};

    if (categoria) {
      where.categoria = categoria;
    }

    // Por padrão, só mostra produtos ativos
    // Para ver inativos, passar ?incluirInativos=true
    if (incluirInativos !== "true") {
      where.ativo = true;
    }

    const produtos = await Produto.findAll({
      where,
      order: [["nome", "ASC"]],
    });

    res.json(produtos);
  } catch (error) {
    console.error("Erro ao listar produtos:", error);
    res.status(500).json({ error: "Erro ao listar produtos" });
  }
};

// US06 - Obter produto por ID
export const obterProduto = async (req, res) => {
  try {
    const produto = await Produto.findByPk(req.params.id);

    if (!produto) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    res.json(produto);
  } catch (error) {
    console.error("Erro ao obter produto:", error);
    res.status(500).json({ error: "Erro ao obter produto" });
  }
};

// US06 - Criar produto
export const criarProduto = async (req, res) => {
  try {
    const {
      codigo,
      nome,
      descricao,
      categoria,
      tamanho,
      emoji,
      preco,
      custoUnitario,
      estoqueAtual,
      estoqueMinimo,
      imagemUrl,
      ativo,
    } = req.body;

    if (!nome) {
      return res.status(400).json({ error: "Nome do produto é obrigatório" });
    }

    // Verificar se código já existe (se fornecido)
    if (codigo) {
      const produtoExistente = await Produto.findOne({ where: { codigo } });
      if (produtoExistente) {
        return res.status(400).json({ error: "Código de produto já existe" });
      }
    }

    const produto = await Produto.create({
      codigo,
      nome,
      descricao,
      categoria,
      tamanho,
      emoji,
      preco,
      custoUnitario,
      estoqueAtual,
      estoqueMinimo,
      imagemUrl,
      ativo,
    });

    res.locals.entityId = produto.id;
    res.status(201).json(produto);
  } catch (error) {
    console.error("Erro ao criar produto:", error);
    res.status(500).json({ error: "Erro ao criar produto" });
  }
};

// US06 - Atualizar produto
export const atualizarProduto = async (req, res) => {
  try {
    const produto = await Produto.findByPk(req.params.id);

    if (!produto) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    const {
      codigo,
      nome,
      descricao,
      categoria,
      tamanho,
      emoji,
      preco,
      custoUnitario,
      estoqueAtual,
      estoqueMinimo,
      imagemUrl,
      ativo,
    } = req.body;

    // Verificar código duplicado se estiver mudando
    if (codigo && codigo !== produto.codigo) {
      const produtoExistente = await Produto.findOne({ where: { codigo } });
      if (produtoExistente) {
        return res.status(400).json({ error: "Código de produto já existe" });
      }
    }

    await produto.update({
      codigo: codigo ?? produto.codigo,
      nome: nome ?? produto.nome,
      descricao: descricao ?? produto.descricao,
      categoria: categoria ?? produto.categoria,
      tamanho: tamanho ?? produto.tamanho,
      emoji: emoji ?? produto.emoji,
      preco: preco ?? produto.preco,
      custoUnitario: custoUnitario ?? produto.custoUnitario,
      estoqueAtual: estoqueAtual ?? produto.estoqueAtual,
      estoqueMinimo: estoqueMinimo ?? produto.estoqueMinimo,
      imagemUrl: imagemUrl ?? produto.imagemUrl,
      ativo: ativo ?? produto.ativo,
    });

    res.json(produto);
  } catch (error) {
    console.error("Erro ao atualizar produto:", error);
    res.status(500).json({ error: "Erro ao atualizar produto" });
  }
};

// US06 - Deletar produto (soft delete na 1ª vez, hard delete na 2ª)
export const deletarProduto = async (req, res) => {
  try {
    const produto = await Produto.findByPk(req.params.id);

    if (!produto) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    // Se já está inativo, deletar permanentemente
    if (!produto.ativo) {
      await produto.destroy();
      res.locals.entityId = req.params.id;
      return res.json({
        message: "Produto excluído permanentemente com sucesso",
        permanentDelete: true,
      });
    }

    // Se está ativo, apenas desativar (soft delete)
    await produto.update({ ativo: false });
    res.locals.entityId = produto.id;
    res.json({
      message:
        "Produto desativado com sucesso. Clique novamente para excluir permanentemente.",
      permanentDelete: false,
    });
  } catch (error) {
    console.error("Erro ao deletar produto:", error);
    res.status(500).json({ error: "Erro ao deletar produto" });
  }
};

// Listar categorias únicas
export const listarCategorias = async (req, res) => {
  try {
    const categorias = await Produto.findAll({
      attributes: [
        [sequelize.fn("DISTINCT", sequelize.col("categoria")), "categoria"],
      ],
      where: {
        categoria: { [sequelize.Op.ne]: null },
      },
      raw: true,
    });

    res.json(categorias.map((c) => c.categoria));
  } catch (error) {
    console.error("Erro ao listar categorias:", error);
    res.status(500).json({ error: "Erro ao listar categorias" });
  }
};
