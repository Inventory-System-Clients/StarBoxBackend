import test from "node:test";
import assert from "node:assert/strict";

import {
  calcularEsperadoComHistorico,
  ordenarMovimentacoesDeterministico,
  extrairContadorAtualMovimentacao,
} from "../src/services/fluxoCaixaCalculoService.js";

test("Cenario A: primeira via cadastro vira base da proxima movimentacao", () => {
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
  assert.equal(calculo.algoritmoValorEsperado, "delta_in_direto");
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

test("Cenario C: usa coalesce de contador IN digital quando contador IN principal vier nulo", () => {
  const maquinaId = "maq-4";
  const historico = [
    {
      id: "mov-1",
      maquinaId,
      dataColeta: "2026-03-30T10:00:00.000Z",
      createdAt: "2026-03-30T10:00:00.000Z",
      contadorIn: 1000,
      contadorOut: 500,
    },
    {
      id: "mov-2",
      maquinaId,
      dataColeta: "2026-03-31T10:00:00.000Z",
      createdAt: "2026-03-31T10:00:00.000Z",
      contadorIn: null,
      contadorInDigital: 1200,
      contadorOut: 550,
    },
  ];

  const calculo = calcularEsperadoComHistorico({
    movimentacaoAtual: historico[1],
    historicoMovimentacoes: historico,
    valorFicha: 2,
    permitirFallbackDeltaOut: false,
  });

  assert.equal(calculo.ultimoContadorInRetirada, 1000);
  assert.equal(calculo.deltaContadorIn, 200);
  assert.equal(calculo.valorEsperadoCalculado, 200);
});

test("Cenario D: contadorInAnterior da atual tem prioridade sobre historico", () => {
  const maquinaId = "maq-5";
  const historico = [
    {
      id: "mov-1",
      maquinaId,
      dataColeta: "2026-03-30T10:00:00.000Z",
      createdAt: "2026-03-30T10:00:00.000Z",
      contadorIn: 1000,
      contadorOut: 500,
    },
    {
      id: "mov-2",
      maquinaId,
      dataColeta: "2026-03-31T10:00:00.000Z",
      createdAt: "2026-03-31T10:00:00.000Z",
      contadorInAnterior: 1100,
      contadorIn: 1200,
      contadorOut: 550,
    },
  ];

  const calculo = calcularEsperadoComHistorico({
    movimentacaoAtual: historico[1],
    historicoMovimentacoes: historico,
    valorFicha: 2,
    contadorInAnteriorFallback: 1000,
    permitirFallbackDeltaOut: false,
  });

  assert.equal(calculo.ultimoContadorInRetirada, 1100);
  assert.equal(calculo.deltaContadorIn, 100);
  assert.equal(calculo.valorEsperadoCalculado, 100);
});

test("Extrator de contador atual usa contador principal e fallback digital", () => {
  const principal = extrairContadorAtualMovimentacao({
    contadorIn: 2000,
    contadorInDigital: 3000,
    contadorOut: 1000,
    contadorOutDigital: 1500,
  });
  assert.equal(principal.contadorInAtual, 2000);
  assert.equal(principal.contadorOutAtual, 1000);

  const fallback = extrairContadorAtualMovimentacao({
    contadorIn: null,
    contadorInDigital: 3000,
    contadorOut: null,
    contadorOutDigital: 1500,
  });
  assert.equal(fallback.contadorInAtual, 3000);
  assert.equal(fallback.contadorOutAtual, 1500);
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
