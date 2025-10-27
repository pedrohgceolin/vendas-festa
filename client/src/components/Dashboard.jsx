// client/src/components/Dashboard.jsx
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
const API_URL='';

export default function Dashboard() {
  // O estado se chama 'dados' e a função para atualizá-lo é 'setDados'
  const [dados, setDados] = useState({ 
    totalVendas: 0, 
    faturamentoTotal: 0,
    vendasPorMetodo: [],
    caixaInicial: 0,
    faturamentoDinheiro: 0
  });

  useEffect(() => {
    // 1. Busca os dados iniciais via API normal
    const fetchInitialData = async () => {
      try {
        const response = await fetch(`${API_URL}/api/vendas/stats`);
        if (!response.ok) { // Adiciona verificação de erro
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setDados(data); // <-- CORREÇÃO: Usa 'setDados'
      } catch (error) {
        console.error("Erro ao buscar dados iniciais do dashboard:", error);
      }
    };
    fetchInitialData();

    // 2. Conecta-se ao servidor via WebSocket
    const socket = io(API_URL); // Usa a API_URL importada

    // 3. Ouve por eventos de 'nova_venda' vindos do servidor
    socket.on('nova_venda', (novosDados) => {
      console.log('Nova venda recebida via WebSocket!', novosDados);
      setDados(novosDados); // <-- CORREÇÃO: Usa 'setDados'
    });

    // 4. Limpa a conexão quando o componente é desmontado
    return () => {
      socket.disconnect();
    };
  }, []); // O [] vazio garante que isso rode apenas uma vez

  // Calcula o valor esperado em caixa
  const valorEsperadoEmCaixa = (dados.caixaInicial || 0) + (dados.faturamentoDinheiro || 0);

  return (
    <div className="dashboard">
      <h2>Dashboard (Tempo Real)</h2>
      <div className="stats-container">
        
        {/* Card: Esperado em Caixa */}
        <div className="stat-card" style={{backgroundColor: '#2ecc71', borderColor: '#27ae60'}}>
          <h3>Esperado em Caixa (Dinheiro)</h3>
          {/* 👇 CORREÇÃO: Usa 'dados.' e o cálculo 'valorEsperadoEmCaixa' 👇 */}
          <p>R$ {valorEsperadoEmCaixa.toFixed(2).replace('.', ',')}</p> 
        </div>

        {/* Card: Faturamento Total */}
        <div className="stat-card">
          <h3>Faturamento Total (Geral)</h3>
           {/* 👇 CORREÇÃO: Usa 'dados.' 👇 */}
          <p>R$ {(dados.faturamentoTotal || 0).toFixed(2).replace('.', ',')}</p>
        </div>

        {/* Card: Receita por Método */}
        <div className="stat-card breakdown-card">
          <h3>Receita por Método</h3>
          <ul className="breakdown-list">
             {/* 👇 CORREÇÃO: Usa 'dados.' e verifica se 'vendasPorMetodo' existe 👇 */}
            {(dados.vendasPorMetodo || []).map(metodo => ( 
              <li key={metodo.nome}>
                <span>{metodo.nome}</span>
                <span className="breakdown-details">
                  {metodo.quantidade_vendas} - <strong>R$ {(metodo.valor_total || 0).toFixed(2).replace('.', ',')}</strong>
                </span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Card: Total de Vendas */}
        <div className="stat-card">
              <h3>Total de Vendas</h3>
              {/* 👇 CORREÇÃO: Usa 'dados.' 👇 */}
              <p>{dados.totalVendas || 0}</p> 
        </div>

      </div>
    </div>
  );
}