/**
 * PageHeader - Componente de cabeçalho de página padronizado
 */
export function PageHeader({ title, subtitle, icon, action }) {
  return (
    <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          {icon && <span className="text-5xl">{icon}</span>}
          <span className="text-gradient">{title}</span>
        </h1>
        {subtitle && <p className="text-gray-600 text-lg">{subtitle}</p>}
      </div>
      {action && (
        <div>
          {typeof action === "object" && action.label ? (
            <button onClick={action.onClick} className="btn-primary">
              {action.label}
            </button>
          ) : (
            action
          )}
        </div>
      )}
    </div>
  );
}

/**
 * StatsGrid - Grid de cards de estatísticas
 */
export function StatsGrid({ stats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => (
        <div
          key={index}
          className={`stat-card ${
            stat.gradient || "bg-gradient-to-br from-primary to-accent-yellow"
          }`}
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium opacity-90">{stat.label}</h3>
              {stat.icon && (
                <div className="w-8 h-8 opacity-80">{stat.icon}</div>
              )}
            </div>
            <p className="text-3xl font-bold">{stat.value}</p>
            {stat.subtitle && (
              <p className="text-xs opacity-75 mt-1">{stat.subtitle}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * DataTable - Tabela de dados moderna
 */
export function DataTable({
  headers,
  data,
  emptyMessage = "Nenhum dado encontrado",
}) {
  // Proteção contra dados inválidos
  if (!headers || !Array.isArray(headers) || headers.length === 0) {
    console.error("DataTable: headers inválido", headers);
    return (
      <div className="card text-center py-12">
        <div className="text-6xl mb-4">⚠️</div>
        <p className="text-gray-600">Configuração de tabela inválida</p>
      </div>
    );
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="card text-center py-12">
        <div className="text-6xl mb-4">📊</div>
        <p className="text-gray-600">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="table-modern">
          <thead>
            <tr>
              {headers.map((header, index) => (
                <th key={index}>
                  <div className="flex items-center gap-2">
                    {header.icon && header.icon}
                    {header.label}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {headers.map((header, cellIndex) => (
                  <td key={cellIndex}>
                    {header.render ? header.render(row) : row[header.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * AlertBox - Caixa de alerta com ícones e estilos
 */
export function AlertBox({ type = "info", title, message, onClose }) {
  const configs = {
    success: {
      class: "alert-success",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    error: {
      class: "alert-error",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    warning: {
      class: "alert-warning",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    info: {
      class: "alert-info",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
  };

  const config = configs[type];

  return (
    <div className={`alert ${config.class} animate-pulse`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
          <div className="flex-1">
            {title && <h4 className="font-bold mb-1">{title}</h4>}
            <p className="text-sm">{message}</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 ml-4 hover:opacity-70 transition-opacity"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Modal - Componente de modal/dialog
 */
export function Modal({ isOpen, onClose, title, children, size = "md" }) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity backdrop-blur-sm"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div
          className={`relative card ${sizeClasses[size]} w-full transform transition-all`}
        >
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <h3 className="text-2xl font-bold text-gradient">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Badge - Componente de badge/tag
 */
export function Badge({ children, variant = "info", size = "md" }) {
  const variants = {
    success: "badge-success",
    danger: "badge-danger",
    warning: "badge-warning",
    info: "badge-info",
  };

  const sizes = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  };

  return (
    <span className={`badge ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  );
}

/**
 * ConfirmDialog - Dialog de confirmação
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  type = "danger",
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="mb-6">
        <p className="text-gray-700">{message}</p>
      </div>
      <div className="flex gap-3 justify-end">
        <button onClick={onClose} className="btn-secondary">
          {cancelText}
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={type === "danger" ? "btn-danger" : "btn-primary"}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
