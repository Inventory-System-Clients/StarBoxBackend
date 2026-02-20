import { useCallback, useRef } from 'react';

export function useToast(timeout = 3000) {
  const timer = useRef();

  const showToast = useCallback((message, type = 'info') => {
    // Implemente aqui a lógica de exibir toast customizado se necessário
    // Exemplo: setToast({ message, type })
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      // Esconde o toast
    }, timeout);
    alert(`${type.toUpperCase()}: ${message}`); // fallback simples
  }, [timeout]);

  return showToast;
}
