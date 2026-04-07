import {
  FluxoCaixa,
  Movimentacao,
  Maquina,
  Loja,
  Usuario,
} from "../models/index.js";
import { Op } from "sequelize";
import { calcularEsperadoMovimentacaoRetirada } from "../services/fluxoCaixaCalculoService.js";

const possuiNumero = (valor) =>
  valor !== null &&
  valor !== undefined &&
  valor !== "" &&
  !Number.isNaN(Number(valor));

const inteiroOuNull = (valor) => {
  if (!possuiNumero(valor)) return null;
  return parseInt(valor, 10);
};

const decimalOuNull = (valor) => {
  if (!possuiNumero(valor)) return null;
  return Number(valor);
};

const arredondar2 = (valor) => {
  if (!possuiNumero(valor)) return null;
  return Number(Number(valor).toFixed(2));
};

const STATUS_FLUXO_VALIDOS = new Set(["pendente", "bateu", "nao_bateu"]);

export const calcularValorRetiradoTotal = ({
  valorRetiradoFisico,
  valorRetiradoDigital,
  valorRetirado,
}) => {
  const fisico = decimalOuNull(valorRetiradoFisico);
  const digital = decimalOuNull(valorRetiradoDigital);

  if (fisico === null && digital === null) {
    return decimalOuNull(valorRetirado);
  }

  return arredondar2((fisico || 0) + (digital || 0));
};

export const calcularConferenciaAutomaticaFluxoCaixa = ({
  valorEsperado,
  valorRetiradoTotal,
}) => {
  const esperado = decimalOuNull(valorEsperado);
  const retirado = decimalOuNull(valorRetiradoTotal);

  if (esperado === null || retirado === null) {
    return "pendente";
  }

  return Math.abs(esperado - retirado) <= 0.009 ? "bateu" : "nao_bateu";
};

const calcularValorEsperadoRetirada = async ({ movimentacaoAtual }) => {
  const valorJogada = decimalOuNull(movimentacaoAtual?.maquina?.valorFicha);
  return calcularEsperadoMovimentacaoRetirada({
    movimentacaoAtual,
    valorFicha: valorJogada,
    permitirFallbackDeltaOut: false,
  });
};

const enriquecerFluxoComCalculo = async (fluxoInstance) => {
  const fluxo = fluxoInstance.toJSON();
  const calculo = await calcularValorEsperadoRetirada({
    movimentacaoAtual: fluxo.movimentacao,
  });

  const valorRetiradoTotal = calcularValorRetiradoTotal(fluxo);

  return {
    ...fluxo,
    valorRetiradoTotal,
    valorEsperadoCalculado: calculo.valorEsperadoCalculado,
    ultimoContadorInRetirada: calculo.ultimoContadorInRetirada,
    ultimoContadorOutRetirada: calculo.ultimoContadorOutRetirada,
    deltaContadorIn: calculo.deltaContadorIn,
    deltaContadorOut: calculo.deltaContadorOut,
    algoritmoValorEsperado: calculo.algoritmoValorEsperado,
  };
};

// Listar todos os registros de fluxo de caixa (apenas movimentações marcadas como retirada de dinheiro)
export const listarFluxoCaixa = async (req, res) => {
  try {
    const { dataInicio, dataFim, lojaId, status, roteiroId } = req.query;

    // Construir filtros para a busca
    const whereMovimentacao = {};
    const whereLoja = {};
    const whereFluxo = {};

    if (dataInicio && dataFim) {
      whereMovimentacao.dataColeta = {
        [Op.between]: [
          new Date(`${dataInicio}T00:00:00`),
          new Date(`${dataFim}T23:59:59`),
        ],
      };
    }

    if (lojaId) {
      whereLoja.id = lojaId;
    }

    if (roteiroId) {
      whereMovimentacao.roteiroId = roteiroId;
    }

    if (status && STATUS_FLUXO_VALIDOS.has(status)) {
      whereFluxo.conferencia = status;
    }

    const fluxos = await FluxoCaixa.findAll({
      where: whereFluxo,
      include: [
        {
          model: Movimentacao,
          as: "movimentacao",
          where: whereMovimentacao,
          include: [
            {
              model: Maquina,
              as: "maquina",
              include: [
                {
                  model: Loja,
                  as: "loja",
                  where: whereLoja,
                  attributes: [
                    "id",
                    "nome",
                    "endereco",
                    "numero",
                    "bairro",
                    "cidade",
                    "estado",
                  ],
                },
              ],
              attributes: ["id", "nome", "codigo", "valorFicha", "lojaId"],
            },
            {
              model: Usuario,
              as: "usuario",
              attributes: ["id", "nome", "email"],
            },
          ],
          attributes: [
            "id",
            "maquinaId",
            "dataColeta",
            "fichas",
            "valorFaturado",
            "contadorMaquina",
            "contadorIn",
            "contadorOut",
            "observacoes",
          ],
        },
        {
          model: Usuario,
          as: "conferidoPorUsuario",
          attributes: ["id", "nome", "email"],
        },
      ],
      order: [
        [{ model: Movimentacao, as: "movimentacao" }, "dataColeta", "DESC"],
      ],
    });

    const fluxosEnriquecidos = await Promise.all(
      fluxos.map((fluxo) => enriquecerFluxoComCalculo(fluxo)),
    );

    res.json(fluxosEnriquecidos);
  } catch (error) {
    console.error("[listarFluxoCaixa] Erro:", error);
    res.status(500).json({ error: "Erro ao listar fluxo de caixa" });
  }
};

// Obter um registro específico
export const obterFluxoCaixa = async (req, res) => {
  try {
    const { id } = req.params;

    const fluxo = await FluxoCaixa.findByPk(id, {
      include: [
        {
          model: Movimentacao,
          as: "movimentacao",
          include: [
            {
              model: Maquina,
              as: "maquina",
              attributes: ["id", "codigo", "nome", "valorFicha", "lojaId"],
              include: [
                {
                  model: Loja,
                  as: "loja",
                  attributes: [
                    "id",
                    "nome",
                    "endereco",
                    "numero",
                    "bairro",
                    "cidade",
                    "estado",
                  ],
                },
              ],
            },
            {
              model: Usuario,
              as: "usuario",
              attributes: ["id", "nome", "email"],
            },
          ],
        },
        {
          model: Usuario,
          as: "conferidoPorUsuario",
          attributes: ["id", "nome", "email"],
        },
      ],
    });

    if (!fluxo) {
      return res
        .status(404)
        .json({ error: "Registro de fluxo de caixa não encontrado" });
    }

    const fluxoEnriquecido = await enriquecerFluxoComCalculo(fluxo);

    res.json(fluxoEnriquecido);
  } catch (error) {
    console.error("[obterFluxoCaixa] Erro:", error);
    res.status(500).json({ error: "Erro ao obter registro de fluxo de caixa" });
  }
};

// Atualizar conferência de fluxo de caixa (admin preenche o valor e a conferência)
export const atualizarFluxoCaixa = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      valorEsperado,
      valorRetirado,
      valorRetiradoFisico,
      valorRetiradoDigital,
      conferencia,
      observacoes,
    } = req.body;
    const usuarioId = req.usuario.id;

    const fluxo = await FluxoCaixa.findByPk(id);

    if (!fluxo) {
      return res
        .status(404)
        .json({ error: "Registro de fluxo de caixa não encontrado" });
    }

    // Atualizar dados
    fluxo.valorEsperado =
      valorEsperado !== undefined ? valorEsperado : fluxo.valorEsperado;
    fluxo.valorRetiradoFisico =
      valorRetiradoFisico !== undefined
        ? valorRetiradoFisico
        : fluxo.valorRetiradoFisico;
    fluxo.valorRetiradoDigital =
      valorRetiradoDigital !== undefined
        ? valorRetiradoDigital
        : fluxo.valorRetiradoDigital;

    // Backward compatibility: se frontend antigo enviar apenas valorRetirado,
    // considera como valor físico.
    if (
      valorRetirado !== undefined &&
      valorRetiradoFisico === undefined &&
      valorRetiradoDigital === undefined
    ) {
      fluxo.valorRetiradoFisico = valorRetirado;
      fluxo.valorRetiradoDigital = 0;
    }

    const valorRetiradoTotal = calcularValorRetiradoTotal({
      valorRetiradoFisico: fluxo.valorRetiradoFisico,
      valorRetiradoDigital: fluxo.valorRetiradoDigital,
      valorRetirado: fluxo.valorRetirado,
    });

    fluxo.valorRetirado = valorRetiradoTotal;

    fluxo.conferencia =
      conferencia && STATUS_FLUXO_VALIDOS.has(conferencia)
        ? conferencia
        : calcularConferenciaAutomaticaFluxoCaixa({
            valorEsperado: fluxo.valorEsperado,
            valorRetiradoTotal,
          });
    fluxo.observacoes =
      observacoes !== undefined ? observacoes : fluxo.observacoes;
    fluxo.conferidoPor = usuarioId;
    fluxo.dataConferencia = new Date();

    await fluxo.save();

    // Buscar registro completo atualizado
    const fluxoAtualizado = await FluxoCaixa.findByPk(id, {
      include: [
        {
          model: Movimentacao,
          as: "movimentacao",
          include: [
            {
              model: Maquina,
              as: "maquina",
              attributes: ["id", "codigo", "nome", "valorFicha", "lojaId"],
              include: [
                {
                  model: Loja,
                  as: "loja",
                  attributes: [
                    "id",
                    "nome",
                    "endereco",
                    "numero",
                    "bairro",
                    "cidade",
                    "estado",
                  ],
                },
              ],
            },
            {
              model: Usuario,
              as: "usuario",
              attributes: ["id", "nome", "email"],
            },
          ],
          attributes: [
            "id",
            "maquinaId",
            "contadorIn",
            "contadorOut",
            "dataColeta",
            "fichas",
            "valorFaturado",
            "contadorMaquina",
            "observacoes",
          ],
        },
        {
          model: Usuario,
          as: "conferidoPorUsuario",
          attributes: ["id", "nome", "email"],
        },
      ],
    });

    const fluxoAtualizadoEnriquecido =
      await enriquecerFluxoComCalculo(fluxoAtualizado);

    res.json(fluxoAtualizadoEnriquecido);
  } catch (error) {
    console.error("[atualizarFluxoCaixa] Erro:", error);
    res.status(500).json({ error: "Erro ao atualizar fluxo de caixa" });
  }
};

// Obter resumo/estatísticas do fluxo de caixa
export const resumoFluxoCaixa = async (req, res) => {
  try {
    const { dataInicio, dataFim, lojaId } = req.query;

    if (!dataInicio || !dataFim) {
      return res
        .status(400)
        .json({ error: "dataInicio e dataFim são obrigatórios" });
    }

    const whereMovimentacao = {
      dataColeta: {
        [Op.between]: [
          new Date(`${dataInicio}T00:00:00`),
          new Date(`${dataFim}T23:59:59`),
        ],
      },
    };

    const whereLoja = lojaId ? { id: lojaId } : {};

    const fluxos = await FluxoCaixa.findAll({
      include: [
        {
          model: Movimentacao,
          as: "movimentacao",
          where: whereMovimentacao,
          include: [
            {
              model: Maquina,
              as: "maquina",
              include: [
                {
                  model: Loja,
                  as: "loja",
                  where: whereLoja,
                  attributes: ["id", "nome"],
                },
              ],
            },
          ],
        },
      ],
    });

    // Calcular estatísticas
    let totalPendentes = 0;
    let totalBateu = 0;
    let totalNaoBateu = 0;
    let valorTotalRetirado = 0;
    let valorTotalRetiradoFisico = 0;
    let valorTotalRetiradoDigital = 0;
    let valorTotalEsperado = 0;

    for (const fluxo of fluxos) {
      if (fluxo.conferencia === "pendente") {
        totalPendentes++;
      } else if (fluxo.conferencia === "bateu") {
        totalBateu++;
      } else if (fluxo.conferencia === "nao_bateu") {
        totalNaoBateu++;
      }

      const valorFisico = decimalOuNull(fluxo.valorRetiradoFisico) || 0;
      const valorDigital = decimalOuNull(fluxo.valorRetiradoDigital) || 0;
      const valorTotalLinha = calcularValorRetiradoTotal(fluxo) || 0;

      valorTotalRetiradoFisico += valorFisico;
      valorTotalRetiradoDigital += valorDigital;
      valorTotalRetirado += valorTotalLinha;

      const calculo = await calcularValorEsperadoRetirada({
        movimentacaoAtual: fluxo.movimentacao,
      });

      const valorEsperadoManual = decimalOuNull(fluxo.valorEsperado);
      const valorEsperadoReferencia =
        valorEsperadoManual !== null
          ? valorEsperadoManual
          : calculo.valorEsperadoCalculado;

      if (valorEsperadoReferencia !== null) {
        valorTotalEsperado += valorEsperadoReferencia;
      }
    }

    const diferencaTotal = valorTotalRetirado - valorTotalEsperado;

    res.json({
      totalRegistros: fluxos.length,
      totalPendentes,
      totalBateu,
      totalNaoBateu,
      valorTotalRetirado: parseFloat(valorTotalRetirado.toFixed(2)),
      valorTotalRetiradoFisico: parseFloat(valorTotalRetiradoFisico.toFixed(2)),
      valorTotalRetiradoDigital: parseFloat(
        valorTotalRetiradoDigital.toFixed(2),
      ),
      valorTotalEsperado: parseFloat(valorTotalEsperado.toFixed(2)),
      diferencaTotal: parseFloat(diferencaTotal.toFixed(2)),
      taxaAcerto:
        fluxos.length > 0
          ? parseFloat(((totalBateu / fluxos.length) * 100).toFixed(2))
          : 0,
    });
  } catch (error) {
    console.error("[resumoFluxoCaixa] Erro:", error);
    res.status(500).json({ error: "Erro ao gerar resumo do fluxo de caixa" });
  }
};

// Obter fluxo de caixa por movimentação
export const obterFluxoPorMovimentacao = async (req, res) => {
  try {
    const { movimentacaoId } = req.params;

    const fluxo = await FluxoCaixa.findOne({
      where: { movimentacaoId },
      include: [
        {
          model: Movimentacao,
          as: "movimentacao",
          include: [
            {
              model: Maquina,
              as: "maquina",
              attributes: ["id", "codigo", "nome", "valorFicha", "lojaId"],
              include: [
                {
                  model: Loja,
                  as: "loja",
                  attributes: [
                    "id",
                    "nome",
                    "endereco",
                    "numero",
                    "bairro",
                    "cidade",
                    "estado",
                  ],
                },
              ],
            },
          ],
          attributes: [
            "id",
            "maquinaId",
            "contadorIn",
            "contadorOut",
            "dataColeta",
            "fichas",
            "valorFaturado",
            "contadorMaquina",
            "observacoes",
          ],
        },
        {
          model: Usuario,
          as: "conferidoPorUsuario",
          attributes: ["id", "nome", "email"],
        },
      ],
    });

    if (!fluxo) {
      return res.status(404).json({
        error:
          "Registro de fluxo de caixa não encontrado para esta movimentação",
      });
    }

    const fluxoEnriquecido = await enriquecerFluxoComCalculo(fluxo);

    res.json(fluxoEnriquecido);
  } catch (error) {
    console.error("[obterFluxoPorMovimentacao] Erro:", error);
    res.status(500).json({ error: "Erro ao obter fluxo de caixa" });
  }
};
