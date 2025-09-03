// client/src/components/Dashboard.jsx
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
const API_URL='';

export default function Dashboard() {
  const [dadosVendas, setDadosVendas] = useState({ totalVendas: 0, faturamentoTotal: 0 });

  useEffect(() => {
    // 1. Busca os dados iniciais via API normal
    const fetchInitialData = async () => {
      try {
        const response = await fetch(`${API_URL}/api/vendas/stats`);
        const data = await response.json();
        setDadosVendas(data);
      } catch (error) {
        console.error("Erro ao buscar dados iniciais do dashboard:", error);
      }
    };
    fetchInitialData();

    // 2. Conecta-se ao servidor via WebSocket
    const socket = io(API_URL);

    // 3. Ouve por eventos de 'nova_venda' vindos do servidor
    socket.on('nova_venda', (novosDados) => {
      console.log('Nova venda recebida via WebSocket!', novosDados);
      setDadosVendas(novosDados);
    });

    // 4. Limpa a conexão quando o componente é desmontado (muito importante!)
    return () => {
      socket.disconnect();
    };
  }, []); // O [] vazio garante que isso rode apenas uma vez

  return (
    <div className="dashboard">
      <h2>Dashboard de Vendas (Tempo Real)</h2>
      <div className="stats-container">
        <div className="stat-card">
          <h3>Total de Vendas</h3>
          <p>{dadosVendas.totalVendas}</p>
        </div>
        <div className="stat-card">
          <h3>Faturamento</h3>
          <p>R$ {dadosVendas.faturamentoTotal.toFixed(2).replace('.', ',')}</p>
        </div>
      </div>
    </div>
  );
}