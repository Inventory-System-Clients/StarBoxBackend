-- Tabela para contas financeiras
CREATE TABLE public.contas_financeiro (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL,
    value NUMERIC(12,2) NOT NULL,
    due_date DATE NOT NULL,
    category VARCHAR(50),
    city VARCHAR(50),
    bill_type VARCHAR(20) NOT NULL,
    observations TEXT,
    payment_method VARCHAR(20) DEFAULT 'boleto',
    payment_details VARCHAR(500)
);
-- Índices para busca rápida
CREATE INDEX idx_contas_financeiro_bill_type ON public.contas_financeiro(bill_type);
CREATE INDEX idx_contas_financeiro_payment_method ON public.contas_financeiro(payment_method);

-- Comentários para documentação
COMMENT ON COLUMN public.contas_financeiro.payment_method IS 'Método de pagamento: boleto, pix ou email';
COMMENT ON COLUMN public.contas_financeiro.payment_details IS 'Detalhes de pagamento (número PIX, email ou código boleto)';