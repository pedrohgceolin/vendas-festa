// client/src/components/Caixa.jsx
import { useState, useEffect } from 'react';
import PagamentoModal from './PagamentoModal';
import jsPDF from 'jspdf';


const API_URL='';

export default function Caixa({ user }) {
  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [total, setTotal] = useState(0);
  const [ultimaVenda, setUltimaVenda] = useState(null);
  const [ticketParaCopiar, setTicketParaCopiar] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
    
  console.log('Usuário no Caixa:', user);

  // Busca os produtos da API quando o componente carrega
  useEffect(() => {
    const fetchProdutos = async () => {
      const response = await fetch(`${API_URL}/api/produtos`);
      const data = await response.json();
      setProdutos(data);
    };
    fetchProdutos();
  }, []);

  // Recalcula o total sempre que o carrinho mudar
  useEffect(() => {
    const novoTotal = carrinho.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
    setTotal(novoTotal);
  }, [carrinho]);

  const adicionarAoCarrinho = (produto) => {
    setCarrinho(prevCarrinho => {
      const itemExistente = prevCarrinho.find(item => item.id === produto.id);
      if (itemExistente) {
        // Se o item já existe, apenas incrementa a quantidade
        return prevCarrinho.map(item =>
          item.id === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item
        );
      } else {
        // Se é um item novo, adiciona ao carrinho com quantidade 1
        return [...prevCarrinho, { ...produto, quantidade: 1 }];
      }
    });
  };

  const limparCarrinho = () => {
    setCarrinho([]);
  };

  const handleFinalizarVendaComPagamento = async (metodoPagamentoId) => {
    setModalAberto(false); // Fecha a modal

    try {
      const response = await fetch(`${API_URL}/api/vendas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            total: total, 
            itens: carrinho, 
            usuarioId: user.id,
            metodoPagamentoId: metodoPagamentoId // <-- ADICIONAMOS AQUI
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      alert(`Venda #${data.vendaId} registrada com sucesso!`);

      setUltimaVenda({ id: data.vendaId, total, itens: carrinho, metodoPagamentoId });
      setCarrinho([]);

    } catch (err) {
      console.error('ERRO AO FINALIZAR VENDA:', err);
      alert(`Erro ao registrar a venda: ${err.message}`);
    }
  };

  const handleOpenPagamentoModal = () => {
    if (carrinho.length === 0) {
      alert("Adicione pelo menos um item para finalizar a venda.");
      return;
    }
    setModalAberto(true);
  };

  const handleSharePrint = async () => {
    console.log('entrou handleDharePrint');
    if (!ultimaVenda) return;

    let ticketsConcatenados = '';
    
    ultimaVenda.itens.forEach(item => {
        // 3. Itera baseado na QUANTIDADE de cada produto (ex: se item.quantidade for 3, roda 3 vezes)
        for (let i = 0; i < item.quantidade; i++) {
            // 4. Monta o texto para UM ÚNICO TICKET/VALE
            ticketsConcatenados += '      CALOURAAACA\n';
            ticketsConcatenados += '--------------------------------\n';
            ticketsConcatenados += `Venda #${ultimaVenda.id} | Caixa: ${user.username}\n\n`;
            
            // A parte mais importante: o item a ser retirado
            ticketsConcatenados += `       VALE 1x ${item.nome.toUpperCase()}\n\n`;
            
            ticketsConcatenados += '--------------------------------\n';
            
            // Adiciona vários espaços para dar distância entre um ticket e outro
            ticketsConcatenados += '\n\n\n\n'; 
        }
    });

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ticket Venda #${ultimaVenda.id}`,
          text: ticketsConcatenados,
        });
      } catch (error) {
        console.error('Erro ou cancelamento no compartilhamento:', error);
      }
    } else {
      alert('A função de compartilhamento não está disponível neste navegador.');
    }
  };

  const handlePdfPrint = () => {
    if (!ultimaVenda) return;

    console.log("Modo de impressão: Desktop (via PDF)");

      const ticketWidth = 226; // 80mm
      const ticketHeight = 1000;
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: [ticketWidth, ticketHeight]
      });

      let y = 20;
      const margin = 10;

      ultimaVenda.itens.forEach(item => {
        for (let i = 0; i < item.quantidade; i++) {
          doc.setFontSize(10);
          doc.setFont(undefined, 'bold');
          doc.text('CALOURAAACA', ticketWidth / 2, y, { align: 'center' });
          y += 15;
          doc.setFontSize(8);
          doc.setFont(undefined, 'normal');
          doc.text('-------------------------------------------', ticketWidth / 2, y, { align: 'center' });
          y += 15;
          doc.text(`Venda #${ultimaVenda.id} | Caixa: ${user.username}`, margin, y);
          y += 20;
          doc.setFontSize(14);
          doc.setFont(undefined, 'bold');
          doc.text(`VALE 1x ${item.nome.toUpperCase()}`, ticketWidth / 2, y, { align: 'center' });
          y += 20;
          doc.text('-------------------------------------------', ticketWidth / 2, y, { align: 'center' });
          y += 30;
        }
      });
      
      doc.output('dataurlnewwindow');
  };

  // // A função de finalizar a venda continua a mesma, sem a lógica de impressão
  // const handleFinalizarVendaComPagamento = async (metodoPagamentoId) => {
  //     setUltimaVenda({ id: data.vendaId, total, itens: carrinho });
  //     setCarrinho([]);
  // };

  
  

  return (
    <div className="caixa-container">
      <div className="produtos-grid">
        {produtos.map(p => (
          <button key={p.id} className="produto-card" onClick={() => adicionarAoCarrinho(p)}>
            <h2>{p.nome}</h2>
            <p>R$ {p.preco.toFixed(2).replace('.', ',')}</p>
          </button>
        ))}
      </div>
      <div className="carrinho">
        <h2>Venda Atual</h2>
        <ul className="carrinho-lista">
          {carrinho.map(item => (
            <li key={item.id}>
              <span>{item.nome} (x{item.quantidade})</span>
              <span>R$ {(item.preco * item.quantidade).toFixed(2).replace('.', ',')}</span>
            </li>
          ))}
        </ul>
        <div className="carrinho-total">
          <strong>TOTAL: R$ {total.toFixed(2).replace('.', ',')}</strong>
        </div>
        <div className="carrinho-acoes">
          <button onClick={handleOpenPagamentoModal} className="btn-finalizar">Finalizar Venda</button>
          <button onClick={limparCarrinho} className="btn-limpar">Limpar</button>
        </div>
        
        {modalAberto && (
        <PagamentoModal 
          total={total}
          onPaymentSelected={handleFinalizarVendaComPagamento}
          onClose={() => setModalAberto(false)}
        />
      )}
        {ultimaVenda && (
          <div className="post-venda-acoes">
            <h4>Imprimir Tickets (Venda #{ultimaVenda.id})</h4>
            <div className="print-options">
              <button onClick={handleSharePrint} className="btn-imprimir-share">
                📱 Imprimir via Celular (Compartilhar)
              </button>
              <button onClick={handlePdfPrint} className="btn-imprimir-pdf">
                🖨️ Imprimir via PC (Gerar PDF)
              </button>
            </div>
          </div>
        )}
      </div>
      {ticketParaCopiar && (
            <div className="modal-overlay">
                <div className="modal-content">
                    <h3>Copiar Texto do Ticket</h3>
                    <textarea readOnly value={ticketParaCopiar}></textarea>
                    <button onClick={() => setTicketParaCopiar('')}>Fechar</button>
                </div>
            </div>
        )}
    </div>
  );
}