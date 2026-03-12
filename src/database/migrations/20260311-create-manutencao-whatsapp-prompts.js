export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable("manutencao_whatsapp_prompts", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal("gen_random_uuid()"),
      primaryKey: true,
    },
    manutencao_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "manutencoes", key: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
    loja_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "lojas", key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    maquina_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "maquinas", key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    roteiro_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "roteiros", key: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
    funcionario_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "usuarios", key: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
    criado_por_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "usuarios", key: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
    destinatario_telefone: {
      type: Sequelize.STRING(30),
      allowNull: true,
    },
    mensagem: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    whatsapp_url: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    origem_responsavel: {
      type: Sequelize.STRING(30),
      allowNull: false,
      defaultValue: "nao_encontrado",
    },
    metadata: {
      type: Sequelize.JSONB,
      allowNull: true,
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
  });

  await queryInterface.addIndex("manutencao_whatsapp_prompts", ["loja_id"], {
    name: "idx_manutencao_whatsapp_prompts_loja_id",
  });

  await queryInterface.addIndex(
    "manutencao_whatsapp_prompts",
    ["funcionario_id"],
    {
      name: "idx_manutencao_whatsapp_prompts_funcionario_id",
    },
  );

  await queryInterface.addIndex("manutencao_whatsapp_prompts", ["created_at"], {
    name: "idx_manutencao_whatsapp_prompts_created_at",
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable("manutencao_whatsapp_prompts");
};
