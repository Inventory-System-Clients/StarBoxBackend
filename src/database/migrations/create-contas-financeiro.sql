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
    observations TEXT
);
-- Índice para busca rápida
CREATE INDEX idx_contas_financeiro_bill_type ON public.contas_financeiro(bill_type);