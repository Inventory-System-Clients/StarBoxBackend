import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const RoteiroResumoExecucao = sequelize.define(
  "RoteiroResumoExecucao",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    roteiroId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "roteiro_id",
      references: {
        model: "Roteiros",
        key: "id",
      },
    },
    data: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "em_andamento",
    },
    fechadoEm: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "fechado_em",
    },
    fechadoPorId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "fechado_por_id",
      references: {
        model: "usuarios",
        key: "id",
      },
    },
    roteiroNome: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "roteiro_nome",
    },
    pontosFeitos: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      field: "pontos_feitos",
    },
    pontosNaoFeitos: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      field: "pontos_nao_feitos",
    },
    maquinasFeitas: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      field: "maquinas_feitas",
    },
    maquinasNaoFeitas: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      field: "maquinas_nao_feitas",
    },
    estoqueInicialTotal: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "estoque_inicial_total",
    },
    estoqueFinalTotal: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "estoque_final_total",
    },
    consumoTotalProdutos: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "consumo_total_produtos",
    },
    despesaTotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: "despesa_total",
    },
    sobraValorDespesa: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: "sobra_valor_despesa",
    },
    totalManutencoesRealizadas: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "total_manutencoes_realizadas",
    },
    lojasComManutencaoRealizada: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      field: "lojas_com_manutencao_realizada",
    },
    manutencoesRealizadas: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      field: "manutencoes_realizadas",
    },
    manutencoesNaoRealizadas: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      field: "manutencoes_nao_realizadas",
    },
    manutencoesNaoRealizadasPorPonto: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      field: "manutencoes_nao_realizadas_por_ponto",
    },
  },
  {
    tableName: "roteiro_resumo_execucao",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["roteiro_id", "data"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["data"],
      },
    ],
  },
);

export default RoteiroResumoExecucao;
