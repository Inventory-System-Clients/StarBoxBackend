import { Veiculo } from "../models/index.js";

// Função utilitária para gerar alertas de veículos
export async function gerarAlertasVeiculos() {
  const veiculos = await Veiculo.findAll();
  const alertas = [];

  for (const v of veiculos) {
    // Combustível baixo
    if (
      v.nivelCombustivel &&
      (v.nivelCombustivel === "1 palzinho" || v.nivelCombustivel === "Vazio")
    ) {
      alertas.push({
        tipo: "combustivel_baixo",
        mensagem: `Nível de combustível baixo em ${v.nome} (${v.nivelCombustivel})`,
        veiculo: v.nome,
        nivel: "warning",
      });
    }
    // Limpeza
    if (v.nivelLimpeza && v.nivelLimpeza === "precisa limpar") {
      alertas.push({
        tipo: "limpeza",
        mensagem: `${v.nome} precisa de limpeza`,
        veiculo: v.nome,
        nivel: "info",
      });
    }
    // Modo emprestado
    if (v.modo && v.modo === "emprestado") {
      alertas.push({
        tipo: "emprestado",
        mensagem: `${v.nome} está no modo emprestado`,
        veiculo: v.nome,
        nivel: "warning",
      });
    }
    // Estado ruim
    if (v.estado && v.estado === "Ruim") {
      alertas.push({
        tipo: "estado_ruim",
        mensagem: `${v.nome} está com estado ruim`,
        veiculo: v.nome,
        nivel: "danger",
      });
    }
    // Kmetragem inválida (última menor que anterior)
    // Aqui, para exemplo, vamos supor que existe um campo kmAnterior
    if (
      v.kmAnterior !== undefined &&
      v.km !== undefined &&
      v.km < v.kmAnterior
    ) {
      alertas.push({
        tipo: "km_invalido",
        mensagem: `A última km do ${v.nome} é menor que a anterior`,
        veiculo: v.nome,
        nivel: "danger",
      });
    }
  }
  return alertas;
}
