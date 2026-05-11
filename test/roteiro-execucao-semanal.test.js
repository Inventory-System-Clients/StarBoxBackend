import test from "node:test";
import assert from "node:assert/strict";

import {
  getFaixaSemanaAtualUtc,
  isFinalizadoNaSemana,
  isHorarioResetSemanalSaoPaulo,
} from "../src/utils/roteiroExecucaoSemanal.js";

test("ciclo semanal de roteiro vira apenas no domingo as 21h de Sao Paulo", () => {
  const antesDoReset = new Date("2026-05-10T23:30:00.000Z"); // domingo 20:30 em Sao Paulo
  const depoisDoReset = new Date("2026-05-11T00:30:00.000Z"); // domingo 21:30 em Sao Paulo

  const faixaAntes = getFaixaSemanaAtualUtc(antesDoReset);
  const faixaDepois = getFaixaSemanaAtualUtc(depoisDoReset);

  assert.equal(faixaAntes.inicioSemana, "2026-05-03");
  assert.equal(faixaDepois.inicioSemana, "2026-05-10");
  assert.equal(isHorarioResetSemanalSaoPaulo(antesDoReset), false);
  assert.equal(isHorarioResetSemanalSaoPaulo(depoisDoReset), true);
});

test("finalizacao permanece valida ate o reset semanal de domingo as 21h", () => {
  const execucao = {
    finalizadoEm: new Date("2026-05-06T15:00:00.000Z"),
  };

  assert.equal(
    isFinalizadoNaSemana(execucao, new Date("2026-05-10T23:30:00.000Z")),
    true,
  );
  assert.equal(
    isFinalizadoNaSemana(execucao, new Date("2026-05-11T00:30:00.000Z")),
    false,
  );
});
