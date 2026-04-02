import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const Movimentacao = sequelize.define(
  "Movimentacao",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    maquinaId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "maquinas",
        key: "id",
      },
    },
    usuarioId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "usuarios",
        key: "id",
      },
    },
    dataColeta: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    // US08 - Registro de Abastecimento
    totalPre: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Quantidade antes da coleta",
    },
    sairam: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Quantidade de prêmios que saíram",
    },
    abastecidas: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Quantidade reposta",
    },
    totalPos: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Quantidade final (totalPre - sairam + abastecidas)",
    },

    // US09 - Coleta de Fichas
    fichas: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Número de fichas coletadas",
    },
    contadorMaquina: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Valor do contador da máquina",
    },
    contadorIn: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "contador_in",
      comment: "Valor do contador IN da máquina",
    },
    contadorInDigital: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "contador_in_digital",
      comment: "Valor do contador IN digital da máquina",
    },
    contadorInAnterior: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "contador_in_anterior",
      comment: "Contador IN anterior usado como base de cálculo",
    },
    contadorOut: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "contador_out",
      comment: "Valor do contador OUT da máquina",
    },
    contadorOutDigital: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "contador_out_digital",
      comment: "Valor do contador OUT digital da máquina",
    },
    contadorOutAnterior: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "contador_out_anterior",
      comment: "Contador OUT anterior usado como base de cálculo",
    },
    valorFaturado: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: "Calculado automaticamente: fichas * valorFicha",
    },

    // Retirada de Estoque
    retiradaEstoque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "retirada_estoque",
      comment:
        "Indica se é uma retirada de estoque (não conta como venda/receita)",
    },

    // Retirada de Dinheiro (Fluxo de Caixa)
    retiradaDinheiro: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "retirada_dinheiro",
      comment:
        "Indica se é uma retirada de dinheiro que deve aparecer no fluxo de caixa",
    },

    // Notas e Pagamento Digital
    quantidade_notas_entrada: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: "Quantidade/valor de notas inseridas na máquina",
    },
    valor_entrada_maquininha_pix: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: "Valor de pagamento digital (maquininha/pix)",
    },
    // US10 - Observações
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    justificativa_ordem: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Justificativa quando funcionário pulou a ordem de lojas no roteiro",
    },
    status_justificativa: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: "nova",
      comment: "Status da justificativa de quebra de ordem (nova, oculta, etc)",
    },
    tipoOcorrencia: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: "Ex: Normal, Manutenção, Troca de Máquina, Problema",
    },

    // Cálculos automáticos (US11, US12)
    mediaFichasPremio: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: "fichas / sairam (se sairam > 0)",
    },

    roteiroId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    produtoNaMaquinaId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "produto_na_maquina_id",
      references: {
        model: "produtos",
        key: "id",
      },
      comment:
        "Produto predominante na maquina no momento da movimentacao (fallback para relatorios sem detalhe)",
    },
  },
  {
    tableName: "movimentacoes",
    timestamps: true,
    hooks: {
      beforeSave: async (movimentacao) => {
        // Corrige cálculo para movimentações normais (não retirada de estoque)
        if (!movimentacao.retiradaEstoque) {
          movimentacao.totalPos = movimentacao.totalPre + movimentacao.abastecidas;
        } else {
          // Para retirada de estoque, mantém lógica anterior
          movimentacao.totalPos = movimentacao.totalPre - movimentacao.sairam + movimentacao.abastecidas;
        }

        // Calcular média fichas/prêmio
        if (movimentacao.sairam > 0) {
          movimentacao.mediaFichasPremio = (
            movimentacao.fichas / movimentacao.sairam
          ).toFixed(2);
        }

        // Calcular valor faturado (será atualizado com valor da máquina na controller)
        // movimentacao.valorFaturado é calculado na controller com o valorFicha atual da máquina
      },
    },
  }
);

export default Movimentacao;
