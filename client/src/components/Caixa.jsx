// client/src/components/Caixa.jsx
import { useState, useEffect } from 'react';
import PagamentoModal from './PagamentoModal';


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

  // 👇 NOVA FUNÇÃO PARA GERAR O TEXTO E COMPARTILHAR 👇
  const handleImprimir = async () => {
    console.log('entrou handleimprimir');
    if (!ultimaVenda) return;

    // 1. Inicializa uma string vazia que vai acumular todos os tickets
    let ticketsConcatenados = '';

    // 2. Itera sobre cada TIPO de produto no carrinho da última venda (ex: Cerveja, depois Água)
    ultimaVenda.itens.forEach(item => {
        // 3. Itera baseado na QUANTIDADE de cada produto (ex: se item.quantidade for 3, roda 3 vezes)
        for (let i = 0; i < item.quantidade; i++) {
            // 4. Monta o texto para UM ÚNICO TICKET/VALE
            ticketsConcatenados += '      NOME DA FESTA\n';
            ticketsConcatenados += '--------------------------------\n';
            ticketsConcatenados += `Venda #${ultimaVenda.id} | Caixa: ${user.username}\n\n`;
            
            // A parte mais importante: o item a ser retirado
            ticketsConcatenados += `       VALE 1x ${item.nome.toUpperCase()}\n\n`;
            
            ticketsConcatenados += '--------------------------------\n';
            
            // Adiciona vários espaços para dar distância entre um ticket e outro
            ticketsConcatenados += '\n\n\n\n'; 
        }
    });
 
    // 5. A lógica de compartilhar ou copiar continua a mesma, mas agora com os tickets concatenados
    if (navigator.share) {
        try {
            // Tenta executar o compartilhamento
            await navigator.share({
                title: `Ticket Venda #${ultimaVenda.id}`,
                text: ticketsConcatenados,
            });
        } catch (error) {
            // Se o usuário cancelar ou se houver um erro, ele entra aqui
            alert(`4. ERRO ou CANCELAMENTO: ${error.name} - ${error.message}`);
        }
    } else {
        // Se a API não existir, ele vai para o fallback
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(ticketsConcatenados);
            alert('Texto do ticket copiado para a área de transferência!');
        } else {
            setTicketParaCopiar(ticketsConcatenados);
        }
    }
  };

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
            <button onClick={handleImprimir} className="btn-imprimir">
              Imprimir Ticket da Venda #{ultimaVenda.id}
            </button>
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