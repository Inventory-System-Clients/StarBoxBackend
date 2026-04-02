import test from "node:test";
import assert from "node:assert/strict";

import {
  calcularValorRetiradoTotal,
  calcularConferenciaAutomaticaFluxoCaixa,
} from "../src/controllers/fluxoCaixaController.js";

test("calcula valor total retirado como soma de fisico e digital", () => {
  const total = calcularValorRetiradoTotal({
    valorRetiradoFisico: 120.5,
    valorRetiradoDigital: 79.5,
  });

  assert.equal(total, 200);
});

test("usa campo legado valorRetirado quando fisico/digital nao vierem", () => {
  const total = calcularValorRetiradoTotal({
    valorRetirado: 150,
  });

  assert.equal(total, 150);
});

test("conferencia automatica retorna bateu quando total igual ao esperado", () => {
  const status = calcularConferenciaAutomaticaFluxoCaixa({
    valorEsperado: 500,
    valorRetiradoTotal: 500,
  });

  assert.equal(status, "bateu");
});

test("conferencia automatica retorna nao_bateu quando total diferente do esperado", () => {
  const status = calcularConferenciaAutomaticaFluxoCaixa({
    valorEsperado: 500,
    valorRetiradoTotal: 480,
  });

  assert.equal(status, "nao_bateu");
});

test("conferencia automatica retorna pendente quando faltam valores", () => {
  const status = calcularConferenciaAutomaticaFluxoCaixa({
    valorEsperado: null,
    valorRetiradoTotal: 100,
  });

  assert.equal(status, "pendente");
});
