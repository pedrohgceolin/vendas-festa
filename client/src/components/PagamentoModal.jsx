// client/src/components/PagamentoModal.jsx
import { useState, useEffect } from 'react';
const API_URL='';

export default function PagamentoModal({ total, onPaymentSelected, onClose }) {
  const [metodos, setMetodos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetodos = async () => {
      try {
        const response = await fetch(`${API_URL}/api/pagamentos`);
        const data = await response.json();
        setMetodos(data);
      } catch (err) {
        console.error('Erro ao buscar métodos de pagamento:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetodos();
  }, []);

  if (loading) return <div className="modal-overlay"><p>Carregando métodos de pagamento...</p></div>;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Método de Pagamento</h2>
        <h3>Total: R$ {total.toFixed(2).replace('.', ',')}</h3>
        <p>Selecione como o cliente vai pagar:</p>
        <div className="payment-options">
          {metodos.map(metodo => (
            <button 
              key={metodo.id}
              onClick={() => onPaymentSelected(metodo.id)}
              className="payment-button"
            >
              {metodo.nome}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="btn-cancelar">Cancelar</button>
      </div>
    </div>
  );
}