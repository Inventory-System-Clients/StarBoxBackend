// Armazenamento temporário (em memória) de justificativas de quebra de ordem.
// Keyed por lojaId. Consumido e limpo quando a movimentação daquela loja é criada.
const justificativasPendentes = new Map();

export default justificativasPendentes;
