import { FluxoCaixa, Movimentacao, Maquina, Loja, Usuario } from "../models/index.js";
import { Op } from "sequelize";

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

const calcularValorEsperadoRetirada = async ({
  movimentacaoAtual,
  fluxoAtualId = null,
}) => {
  if (!movimentacaoAtual?.maquinaId || !movimentacaoAtual?.dataColeta) {
    return {
      valorEsperadoCalculado: null,
      ultimoContadorInRetirada: null,
      ultimoContadorOutRetirada: null,
      deltaContadorIn: null,
      deltaContadorOut: null,
      algoritmoValorEsperado: null,
    };
  }

  const whereFluxoAnterior = {};
  if (fluxoAtualId) {
    whereFluxoAnterior.id = { [Op.ne]: fluxoAtualId };
  }

  const retiradaAnterior = await FluxoCaixa.findOne({
    where: whereFluxoAnterior,
    include: [
      {
        model: Movimentacao,
        as: "movimentacao",
        required: true,
        where: {
          maquinaId: movimentacaoAtual.maquinaId,
          dataColeta: { [Op.lt]: movimentacaoAtual.dataColeta },
        },
        attributes: ["id", "contadorIn", "contadorOut", "dataColeta"],
      },
    ],
    order: [
      [{ model: Movimentacao, as: "movimentacao" }, "dataColeta", "DESC"],
      [{ model: Movimentacao, as: "movimentacao" }, "createdAt", "DESC"],
    ],
  });

  const contadorInAtual = inteiroOuNull(movimentacaoAtual.contadorIn);
  const contadorOutAtual = inteiroOuNull(movimentacaoAtual.contadorOut);

  let baseIn = null;
  let baseOut = null;

  if (retiradaAnterior?.movimentacao) {
    baseIn = inteiroOuNull(retiradaAnterior.movimentacao.contadorIn);
    baseOut = inteiroOuNull(retiradaAnterior.movimentacao.contadorOut);
  } else {
    // Fallback: quando não há retirada anterior, tentar usar campos anteriores da própria movimentação atual.
    baseIn = inteiroOuNull(
      movimentacaoAtual.contadorInAnterior ??
        movimentacaoAtual.contador_in_anterior ??
        movimentacaoAtual?.dataValues?.contadorInAnterior,
    );
    baseOut = inteiroOuNull(
      movimentacaoAtual.contadorOutAnterior ??
        movimentacaoAtual.contador_out_anterior ??
        movimentacaoAtual?.dataValues?.contadorOutAnterior,
    );
  }

  const deltaContadorIn =
    baseIn !== null && contadorInAtual !== null
      ? Math.max(0, contadorInAtual - baseIn)
      : null;
  const deltaContadorOut =
    baseOut !== null && contadorOutAtual !== null
      ? Math.max(0, contadorOutAtual - baseOut)
      : null;

  const valorJogada = decimalOuNull(movimentacaoAtual?.maquina?.valorFicha);

  let valorEsperadoCalculado = null;
  let algoritmoValorEsperado = null;

  if (valorJogada !== null && valorJogada > 0) {
    if (deltaContadorIn !== null) {
      valorEsperadoCalculado = arredondar2(deltaContadorIn / valorJogada);
      algoritmoValorEsperado = "delta_in_div_valor_ficha";
    } else if (deltaContadorOut !== null) {
      valorEsperadoCalculado = arredondar2(deltaContadorOut / valorJogada);
      algoritmoValorEsperado = "delta_out_div_valor_ficha";
    }
  }

  return {
    valorEsperadoCalculado,
    ultimoContadorInRetirada: baseIn,
    ultimoContadorOutRetirada: baseOut,
    deltaContadorIn,
    deltaContadorOut,
    algoritmoValorEsperado,
  };
};

const enriquecerFluxoComCalculo = async (fluxoInstance) => {
  const fluxo = fluxoInstance.toJSON();
  const calculo = await calcularValorEsperadoRetirada({
    movimentacaoAtual: fluxo.movimentacao,
    fluxoAtualId: fluxo.id,
  });

  return {
    ...fluxo,
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
    const { dataInicio, dataFim, lojaId, status } = req.query;

    // Construir filtros para a busca
    const whereMovimentacao = {};
    const whereLoja = {};
    const whereFluxo = {};

    if (dataInicio && dataFim) {
      whereMovimentacao.dataColeta = {
        [Op.between]: [
          new Date(`${dataInicio}T00:00:00`),
          new Date(`${dataFim}T23:59:59`)
        ]
      };
    }

    if (lojaId) {
      whereLoja.id = lojaId;
    }

    if (status) {
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
                  attributes: ["id", "nome", "endereco", "numero", "bairro", "cidade", "estado"]
                }
              ],
              attributes: ["id", "nome", "codigo", "valorFicha", "lojaId"]
            },
            {
              model: Usuario,
              as: "usuario",
              attributes: ["id", "nome", "email"]
            }
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
            "observacoes"
          ]
        },
        {
          model: Usuario,
          as: "conferidoPorUsuario",
          attributes: ["id", "nome", "email"]
        }
      ],
      order: [
        [{ model: Movimentacao, as: "movimentacao" }, "dataColeta", "DESC"]
      ]
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
                  attributes: ["id", "nome", "endereco", "numero", "bairro", "cidade", "estado"]
                }
              ]
            },
            {
              model: Usuario,
              as: "usuario",
              attributes: ["id", "nome", "email"]
            }
          ]
        },
        {
          model: Usuario,
          as: "conferidoPorUsuario",
          attributes: ["id", "nome", "email"]
        }
      ]
    });

    if (!fluxo) {
      return res.status(404).json({ error: "Registro de fluxo de caixa não encontrado" });
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
    const { valorEsperado, valorRetirado, conferencia, observacoes } = req.body;
    const usuarioId = req.usuario.id;

    const fluxo = await FluxoCaixa.findByPk(id);

    if (!fluxo) {
      return res.status(404).json({ error: "Registro de fluxo de caixa não encontrado" });
    }

    // Atualizar dados
    fluxo.valorEsperado = valorEsperado !== undefined ? valorEsperado : fluxo.valorEsperado;
    fluxo.valorRetirado = valorRetirado !== undefined ? valorRetirado : fluxo.valorRetirado;
    fluxo.conferencia = conferencia || fluxo.conferencia;
    fluxo.observacoes = observacoes !== undefined ? observacoes : fluxo.observacoes;
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
                  attributes: ["id", "nome", "endereco", "numero", "bairro", "cidade", "estado"]
                }
              ]
            },
            {
              model: Usuario,
              as: "usuario",
              attributes: ["id", "nome", "email"]
            }
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
          attributes: ["id", "nome", "email"]
        }
      ]
    });

    const fluxoAtualizadoEnriquecido = await enriquecerFluxoComCalculo(
      fluxoAtualizado,
    );

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
      return res.status(400).json({ error: "dataInicio e dataFim são obrigatórios" });
    }

    const whereMovimentacao = {
      dataColeta: {
        [Op.between]: [
          new Date(`${dataInicio}T00:00:00`),
          new Date(`${dataFim}T23:59:59`)
        ]
      }
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
                  attributes: ["id", "nome"]
                }
              ]
            }
          ]
        }
      ]
    });

    // Calcular estatísticas
    let totalPendentes = 0;
    let totalBateu = 0;
    let totalNaoBateu = 0;
    let valorTotalRetirado = 0;
    let valorTotalEsperado = 0;

    fluxos.forEach(fluxo => {
      if (fluxo.conferencia === "pendente") {
        totalPendentes++;
      } else if (fluxo.conferencia === "bateu") {
        totalBateu++;
      } else if (fluxo.conferencia === "nao_bateu") {
        totalNaoBateu++;
      }

      if (fluxo.valorRetirado !== null) {
        valorTotalRetirado += parseFloat(fluxo.valorRetirado);
      }

      if (fluxo.movimentacao && fluxo.movimentacao.valorFaturado !== null) {
        valorTotalEsperado += parseFloat(fluxo.movimentacao.valorFaturado);
      }
    });

    const diferencaTotal = valorTotalRetirado - valorTotalEsperado;

    res.json({
      totalRegistros: fluxos.length,
      totalPendentes,
      totalBateu,
      totalNaoBateu,
      valorTotalRetirado: parseFloat(valorTotalRetirado.toFixed(2)),
      valorTotalEsperado: parseFloat(valorTotalEsperado.toFixed(2)),
      diferencaTotal: parseFloat(diferencaTotal.toFixed(2)),
      taxaAcerto: fluxos.length > 0 
        ? parseFloat(((totalBateu / fluxos.length) * 100).toFixed(2)) 
        : 0
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
                  attributes: ["id", "nome", "endereco", "numero", "bairro", "cidade", "estado"]
                }
              ]
            }
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
          attributes: ["id", "nome", "email"]
        }
      ]
    });

    if (!fluxo) {
      return res.status(404).json({ error: "Registro de fluxo de caixa não encontrado para esta movimentação" });
    }

    const fluxoEnriquecido = await enriquecerFluxoComCalculo(fluxo);

    res.json(fluxoEnriquecido);
  } catch (error) {
    console.error("[obterFluxoPorMovimentacao] Erro:", error);
    res.status(500).json({ error: "Erro ao obter fluxo de caixa" });
  }
};
