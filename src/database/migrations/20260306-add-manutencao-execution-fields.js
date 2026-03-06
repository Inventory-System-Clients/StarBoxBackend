/**
 * Migration: Adiciona campos para manutenções durante execução de roteiro
 * Data: 2026-03-06
 * 
 * Adiciona colunas para:
 * - Registrar explicações quando não fazer ou não usar peças
 * - Rastrear verificação (quando funcionário opta por não fazer)
 * - Registrar qual peça foi usada para concluir
 */

export const up = async (queryInterface, Sequelize) => {
  await queryInterface.addColumn('manutencoes', 'explicacao_nao_fazer', {
    type: Sequelize.STRING(100),
    allowNull: true,
    comment: 'Explicação do funcionário de porque não fez a manutenção'
  });

  await queryInterface.addColumn('manutencoes', 'explicacao_sem_peca', {
    type: Sequelize.STRING(100),
    allowNull: true,
    comment: 'Explicação do funcionário de porque não usou peças'
  });

  await queryInterface.addColumn('manutencoes', 'verificadoPorId', {
    type: Sequelize.UUID,
    allowNull: true,
    references: {
      model: 'usuarios',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
    comment: 'ID do funcionário que verificou/optou por não fazer'
  });

  await queryInterface.addColumn('manutencoes', 'verificadoEm', {
    type: Sequelize.DATE,
    allowNull: true,
    comment: 'Data/hora que o funcionário optou por não fazer'
  });

  await queryInterface.addColumn('manutencoes', 'pecaUsadaId', {
    type: Sequelize.UUID,
    allowNull: true,
    references: {
      model: 'pecas',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
    comment: 'ID da peça usada para concluir a manutenção'
  });
};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.removeColumn('manutencoes', 'pecaUsadaId');
  await queryInterface.removeColumn('manutencoes', 'verificadoEm');
  await queryInterface.removeColumn('manutencoes', 'verificadoPorId');
  await queryInterface.removeColumn('manutencoes', 'explicacao_sem_peca');
  await queryInterface.removeColumn('manutencoes', 'explicacao_nao_fazer');
};
