// backend/src/scripts/reset-roteiros-manual.js
import { resetarRoteirosDiarios } from "../utils/resetRoteiros.js";

(async () => {
  await resetarRoteirosDiarios();
  process.exit(0);
})();
