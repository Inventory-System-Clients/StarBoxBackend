import test from "node:test";
import assert from "node:assert/strict";

import {
  calcularEsperadoComHistorico,
  ordenarMovimentacoesDeterministico,
} from "../src/services/fluxoCaixaCalculoService.js";

test("Primeira movimentacao com dois registros calcula delta IN corretamente", () => {
  const maquinaId = "maq-1";
  const base = {
    id: "mov-a",
    maquinaId,
    dataColeta: "2026-03-31T10:00:00.000Z",
    createdAt: "2026-03-31T10:00:00.000Z",
    contadorIn: 1000,
    contadorOut: 500,
  };
  const atual = {
    id: "mov-b",
    maquinaId,
    dataColeta: "2026-03-31T10:00:00.000Z",
    createdAt: "2026-03-31T10:00:00.000Z",
    contadorIn: 1200,
    contadorOut: 550,
  };

  const calculo = calcularEsperadoComHistorico({
    movimentacaoAtual: atual,
    historicoMovimentacoes: [atual, base],
    valorFicha: 2,
    permitirFallbackDeltaOut: false,
  });

  assert.equal(calculo.ultimoContadorInRetirada, 1000);
  assert.equal(calculo.deltaContadorIn, 200);
  assert.equal(calculo.valorEsperadoCalculado, 200);
  assert.equal(calculo.algoritmoValorEsperado, "delta_in_bruto");
});

test("Ordenacao deterministica desempata por contadorIn, contadorOut e id", () => {
  const maquinaId = "maq-1";
  const registros = [
    {
      id: "z-id",
      maquinaId,
      dataColeta: "2026-03-31T10:00:00.000Z",
      createdAt: "2026-03-31T10:00:00.000Z",
      contadorIn: 1200,
      contadorOut: 520,
    },
    {
      id: "a-id",
      maquinaId,
      dataColeta: "2026-03-31T10:00:00.000Z",
      createdAt: "2026-03-31T10:00:00.000Z",
      contadorIn: 1200,
      contadorOut: 510,
    },
    {
      id: "b-id",
      maquinaId,
      dataColeta: "2026-03-31T10:00:00.000Z",
      createdAt: "2026-03-31T10:00:00.000Z",
      contadorIn: 1000,
      contadorOut: 500,
    },
  ];

  const ordenado = [...registros].sort(ordenarMovimentacoesDeterministico);

  assert.deepEqual(
    ordenado.map((item) => item.id),
    ["b-id", "a-id", "z-id"],
  );
});

test("Quando contador anterior do payload vier nulo usa ultimo contador valido sem sobrescrever por nulo", () => {
  const maquinaId = "maq-2";
  const historico = [
    {
      id: "mov-1",
      maquinaId,
      dataColeta: "2026-03-30T10:00:00.000Z",
      createdAt: "2026-03-30T10:00:00.000Z",
      contadorIn: 900,
      contadorOut: 300,
    },
    {
      id: "mov-2",
      maquinaId,
      dataColeta: "2026-03-31T09:00:00.000Z",
      createdAt: "2026-03-31T09:00:00.000Z",
      contadorIn: null,
      contadorOut: 320,
    },
    {
      id: "mov-3",
      maquinaId,
      dataColeta: "2026-03-31T10:00:00.000Z",
      createdAt: "2026-03-31T10:00:00.000Z",
      contadorIn: 1100,
      contadorOut: 350,
    },
  ];

  const calculo = calcularEsperadoComHistorico({
    movimentacaoAtual: historico[2],
    historicoMovimentacoes: historico,
    valorFicha: 2,
    contadorInAnteriorFallback: null,
    permitirFallbackDeltaOut: false,
  });

  assert.equal(calculo.ultimoContadorInRetirada, 900);
  assert.equal(calculo.deltaContadorIn, 200);
  assert.equal(calculo.valorEsperadoCalculado, 200);
});

test("Sem delta IN nao usa delta OUT quando fallback nao estiver habilitado", () => {
  const maquinaId = "maq-3";
  const historico = [
    {
      id: "mov-1",
      maquinaId,
      dataColeta: "2026-03-30T10:00:00.000Z",
      createdAt: "2026-03-30T10:00:00.000Z",
      contadorIn: null,
      contadorOut: 300,
    },
    {
      id: "mov-2",
      maquinaId,
      dataColeta: "2026-03-31T10:00:00.000Z",
      createdAt: "2026-03-31T10:00:00.000Z",
      contadorIn: null,
      contadorOut: 500,
    },
  ];

  const calculo = calcularEsperadoComHistorico({
    movimentacaoAtual: historico[1],
    historicoMovimentacoes: historico,
    valorFicha: 2,
    permitirFallbackDeltaOut: false,
  });

  assert.equal(calculo.deltaContadorOut, 200);
  assert.equal(calculo.valorEsperadoCalculado, null);
});
