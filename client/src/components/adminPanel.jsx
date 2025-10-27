// client/src/components/AdminPanel.jsx
import { useState, useEffect } from 'react';

const API_URL='';

export default function AdminPanel() {
  // Estados para métodos de pagamento
  const [metodosPagamento, setMetodosPagamento] = useState([]);
  const [novoMetodo, setNovoMetodo] = useState('');
  
  // Estado para o caixa inicial
  const [caixaInicial, setCaixaInicial] = useState(0);
  const [caixaInput, setCaixaInput] = useState('0'); // Estado separado para o input, para evitar problemas de digitação

  // Estados de controle
  const [loading, setLoading] = useState(true);

  // Busca os dados iniciais (métodos de pagamento e caixa inicial)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Busca em paralelo para mais eficiência
        const [paymentsResponse, caixaResponse] = await Promise.all([
          fetch(`${API_URL}/api/pagamentos`),
          fetch(`${API_URL}/api/caixa-inicial`)
        ]);

        if (!paymentsResponse.ok || !caixaResponse.ok) {
          throw new Error('Falha ao buscar dados do painel.');
        }

        const paymentsData = await paymentsResponse.json();
        const caixaData = await caixaResponse.json();

        setMetodosPagamento(paymentsData);
        setCaixaInicial(caixaData.valor);
        setCaixaInput(caixaData.valor.toString()); // Atualiza o input

      } catch (err) {
        console.error("Erro ao carregar dados:", err.message);
        alert("Erro ao carregar dados do painel.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []); // O [] vazio garante que isso rode apenas ao montar o componente

  // Função para adicionar um novo método de pagamento
  const handleAddMetodo = async (e) => {
    e.preventDefault();
    if (!novoMetodo.trim()) return; // Evita adicionar nomes vazios

    try {
      const response = await fetch(`${API_URL}/api/pagamentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novoMetodo.trim() }), // Usa trim() para limpar espaços
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro desconhecido ao adicionar.');

      // Adiciona o novo método à lista na tela
      setMetodosPagamento([...metodosPagamento, data]);
      setNovoMetodo(''); // Limpa o input
      alert('Método de pagamento adicionado!');
    } catch (err) {
      alert(`Erro: ${err.message}`);
    }
  };

  // Função para excluir um método de pagamento
  const handleDeleteMetodo = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este método de pagamento? Vendas passadas associadas a ele podem ficar sem referência clara.')) return;

    try {
      const response = await fetch(`${API_URL}/api/pagamentos/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
         const data = await response.json();
         throw new Error(data.error || 'Falha ao excluir.');
      }
      
      // Remove o método da lista na tela
      setMetodosPagamento(metodosPagamento.filter(m => m.id !== id));
      alert('Método de pagamento excluído.');
    } catch (err) {
      alert(`Erro: ${err.message}`);
    }
  };

  // Função para atualizar o valor inicial do caixa
  const handleUpdateCaixa = async (e) => {
    e.preventDefault();
    const valorNumerico = parseFloat(caixaInput);
    if (isNaN(valorNumerico)) {
        return alert("Por favor, insira um valor numérico válido para o caixa.");
    }

    try {
      const response = await fetch(`${API_URL}/api/caixa-inicial`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor: valorNumerico }),
      });
      if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Falha ao atualizar.');
      }
      
      setCaixaInicial(valorNumerico); // Atualiza o valor "real"
      alert('Valor do caixa inicial salvo!');
    } catch (err) {
      alert(`Erro: ${err.message}`);
    }
  };

  // Renderização enquanto carrega
  if (loading) return <p>Carregando painel do administrador...</p>;

  // Renderização principal do painel
  return (
    <div className="admin-panel">
      <h2>Painel do Administrador</h2>
      
      {/* Seção de Gerenciamento de Caixa */}
      <div className="admin-section">
        <h3>Gerenciamento de Caixa</h3>
        <form onSubmit={handleUpdateCaixa} className="admin-form">
          <label htmlFor="caixaInicialInput">Valor Inicial em Caixa (R$):</label>
          <input 
            id="caixaInicialInput"
            type="number" 
            step="0.01" // Permite centavos
            value={caixaInput} 
            // Atualiza o estado do input, permitindo a digitação
            onChange={(e) => setCaixaInput(e.target.value)} 
            placeholder="0.00"
            required 
          />
          <button type="submit">Salvar Caixa Inicial</button>
        </form>
      </div>

      {/* Seção de Métodos de Pagamento */}
      <div className="admin-section">
        <h3>Métodos de Pagamento</h3>
        <form onSubmit={handleAddMetodo} className="admin-form">
          <input 
            type="text" 
            value={novoMetodo} 
            onChange={(e) => setNovoMetodo(e.target.value)} 
            placeholder="Ex: Pix, Dinheiro, Cartão" 
            required 
          />
          <button type="submit">Adicionar Método</button>
        </form>
        
        <ul className="admin-list">
          {metodosPagamento.length === 0 && <li>Nenhum método cadastrado.</li>}
          {metodosPagamento.map(m => (
            <li key={m.id}>
              <span>{m.nome}</span>
              <button 
                onClick={() => handleDeleteMetodo(m.id)} 
                className="btn-delete-small"
                title={`Excluir ${m.nome}`} // Adiciona dica de ferramenta
              >
                Excluir
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* A seção de usuários foi completamente removida */}
    </div>
  );
}