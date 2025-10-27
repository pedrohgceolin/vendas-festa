// client/src/components/Caixa.jsx
import { useState, useEffect } from 'react';
import PagamentoModal from './PagamentoModal';
import jsPDF from 'jspdf';

const API_URL='';

// Defina o nome do seu evento aqui para fácil alteração
const NOME_DO_EVENTO = "V BARTERAAACA"; 

export default function Caixa({ user }) {
  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [total, setTotal] = useState(0);
  const [ultimaVenda, setUltimaVenda] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  // Estado para guardar as definições dos combos: { comboId: { base_product_name: 'NomeBase', quantidade: 3, ... } }
  const [comboDefinitions, setComboDefinitions] = useState({}); 
  const [loadingInitialData, setLoadingInitialData] = useState(true); // Estado para carregamento inicial

  // Busca produtos E definições de combo ao carregar
  useEffect(() => {
    const fetchData = async () => {
      setLoadingInitialData(true);
      try {
        const [prodRes, comboDefRes] = await Promise.all([
          fetch(`${API_URL}/api/produtos`),
          fetch(`${API_URL}/api/combos/definitions`) // Rota que busca as definições
        ]);

        if (!prodRes.ok || !comboDefRes.ok) {
            throw new Error('Falha ao buscar produtos ou definições de combo.');
        }

        const prodData = await prodRes.json();
        const comboDefData = await comboDefRes.json(); 
        
        setProdutos(prodData);

        // Transforma o array de definições em um objeto para acesso rápido
        const defs = {};
        comboDefData.forEach(def => { defs[def.combo_product_id] = def; });
        setComboDefinitions(defs);
        console.log('Produtos carregados:', prodData);
        console.log('Definições de Combo Carregadas:', defs);

      } catch(err) { 
          console.error("Erro ao carregar dados do caixa:", err); 
          alert("Erro ao carregar produtos/combos. Verifique a conexão com o servidor.");
      } finally {
          setLoadingInitialData(false);
      }
    };
    fetchData();
  }, []); // O [] vazio garante que rode apenas ao montar

  // Recalcula o total (garantindo que preco é número)
  useEffect(() => {
    const novoTotal = carrinho.reduce((acc, item) => acc + ((parseFloat(item.preco) || 0) * item.quantidade), 0);
    setTotal(novoTotal);
  }, [carrinho]);

  // Adiciona item ao carrinho (incluindo flag 'is_combo')
  const adicionarAoCarrinho = (produto) => {
    setCarrinho(prevCarrinho => {
      const itemExistente = prevCarrinho.find(item => item.id === produto.id);
      if (itemExistente) {
        return prevCarrinho.map(item =>
          item.id === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item
        );
      } else {
        // Adiciona o produto completo, incluindo 'is_combo'
        return [...prevCarrinho, { ...produto, quantidade: 1 }]; 
      }
    });
  };

  // Limpa o carrinho e a última venda (para impressão)
  const limparCarrinho = () => { 
    setCarrinho([]); 
    setUltimaVenda(null); 
  };

  // Função para imprimir via Share (Celular) - COM LÓGICA DE COMBO
  const handleSharePrint = async () => {
    if (!ultimaVenda) return;
    console.log("Iniciando SharePrint. Última Venda:", ultimaVenda); 
    console.log("Definições de Combo:", comboDefinitions); 

    let ticketsConcatenados = '';
    const horaVenda = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    ultimaVenda.itens.forEach(item => { 
        if (item.is_combo && comboDefinitions[item.id]) {
            const def = comboDefinitions[item.id];
            const totalBaseItems = item.quantidade * def.quantidade; 
            console.log(`Combo ${item.nome}: Imprimindo ${totalBaseItems} tickets de ${def.base_product_name}`); 
            for (let i = 0; i < totalBaseItems; i++) {
                ticketsConcatenados += `      ${NOME_DO_EVENTO}\n`;
                ticketsConcatenados += '--------------------------------\n';
                ticketsConcatenados += `Venda #${ultimaVenda.id} | ${horaVenda} | Caixa: ${user.username}\n\n`;
                ticketsConcatenados += `       VALE 1x ${def.base_product_name.toUpperCase()}\n\n`; // <-- USA NOME BASE
                ticketsConcatenados += '--------------------------------\n\n\n\n';
            }
        } else if (!item.is_combo) { 
            console.log(`Item ${item.nome}: Imprimindo ${item.quantidade} tickets`); 
            for (let i = 0; i < item.quantidade; i++) {
                ticketsConcatenados += `      ${NOME_DO_EVENTO}\n`;
                ticketsConcatenados += '--------------------------------\n';
                ticketsConcatenados += `Venda #${ultimaVenda.id} | ${horaVenda} | Caixa: ${user.username}\n\n`;
                ticketsConcatenados += `       VALE 1x ${item.nome.toUpperCase()}\n\n`; // <-- USA NOME DO ITEM
                ticketsConcatenados += '--------------------------------\n\n\n\n';
            }
        } else {
             console.warn(`Definição não encontrada para combo ${item.nome}. Impressão pode estar incorreta.`);
             // Mantém a impressão genérica como fallback
             for (let i = 0; i < item.quantidade; i++) {
                 ticketsConcatenados += `      ${NOME_DO_EVENTO}\n--------------------------------\nVenda #${ultimaVenda.id} | ${horaVenda} | Caixa: ${user.username}\n\n       ERRO: VALE ${item.nome.toUpperCase()}\n\n--------------------------------\n\n\n\n`;
             }
        }
    });

    if (navigator.share) {
      try {
        await navigator.share({ title: `Ticket Venda #${ultimaVenda.id}`, text: ticketsConcatenados });
      } catch (error) { console.error('Erro/Cancelamento Share:', error); }
    } else { alert('Função de compartilhamento indisponível.'); }
  };

  // Função para imprimir via PDF (Desktop) - COM LÓGICA DE COMBO
  const handlePdfPrint = () => {
    if (!ultimaVenda) return;
    console.log("Iniciando PdfPrint. Última Venda:", ultimaVenda); 
    console.log("Definições de Combo:", comboDefinitions);

    const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: [226, 842] }); // A4 height approx
    let y = 20; const margin = 10; const ticketWidth = 226;
    const horaVenda = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    ultimaVenda.itens.forEach(item => {
         if (item.is_combo && comboDefinitions[item.id]) {
            const def = comboDefinitions[item.id];
            const totalBaseItems = item.quantidade * def.quantidade;
            console.log(`Combo ${item.nome}: Gerando ${totalBaseItems} tickets PDF de ${def.base_product_name}`); 
            for (let i = 0; i < totalBaseItems; i++) {
                if (y > 800) { doc.addPage(); y = 20; } // Adiciona página se necessário
                doc.setFontSize(10); doc.setFont(undefined, 'bold'); doc.text(NOME_DO_EVENTO, ticketWidth / 2, y, { align: 'center' }); y += 15;
                doc.setFontSize(8); doc.setFont(undefined, 'normal'); doc.text('-------------------------------------------', ticketWidth / 2, y, { align: 'center' }); y += 15;
                doc.text(`Venda #${ultimaVenda.id} | ${horaVenda} | Caixa: ${user.username}`, margin, y); y += 20;
                doc.setFontSize(14); doc.setFont(undefined, 'bold'); doc.text(`VALE 1x ${def.base_product_name.toUpperCase()}`, ticketWidth / 2, y, { align: 'center' }); y += 20; // <-- USA NOME BASE
                doc.text('-------------------------------------------', ticketWidth / 2, y, { align: 'center' }); y += 30; 
            }
        } else if (!item.is_combo) { 
             console.log(`Item ${item.nome}: Gerando ${item.quantidade} tickets PDF`); 
             for (let i = 0; i < item.quantidade; i++) {
                if (y > 800) { doc.addPage(); y = 20; }
                doc.setFontSize(10); doc.setFont(undefined, 'bold'); doc.text(NOME_DO_EVENTO, ticketWidth / 2, y, { align: 'center' }); y += 15;
                doc.setFontSize(8); doc.setFont(undefined, 'normal'); doc.text('-------------------------------------------', ticketWidth / 2, y, { align: 'center' }); y += 15;
                doc.text(`Venda #${ultimaVenda.id} | ${horaVenda} | Caixa: ${user.username}`, margin, y); y += 20;
                doc.setFontSize(14); doc.setFont(undefined, 'bold'); doc.text(`VALE 1x ${item.nome.toUpperCase()}`, ticketWidth / 2, y, { align: 'center' }); y += 20; // <-- USA NOME DO ITEM
                doc.text('-------------------------------------------', ticketWidth / 2, y, { align: 'center' }); y += 30; 
             }
        } else {
             console.warn(`Definição não encontrada para combo ${item.nome}. PDF pode estar incorreto.`);
             if (y > 800) { doc.addPage(); y = 20; }
             // Mantém impressão genérica como fallback
             doc.setFontSize(10); doc.setFont(undefined, 'bold'); doc.text(NOME_DO_EVENTO, ticketWidth / 2, y, { align: 'center' }); y += 15; doc.setFontSize(8); doc.setFont(undefined, 'normal'); doc.text('---', ticketWidth / 2, y, { align: 'center' }); y += 15; doc.text(`Venda #${ultimaVenda.id} | ${horaVenda} | Caixa: ${user.username}`, margin, y); y += 20; doc.setFontSize(14); doc.setFont(undefined, 'bold'); doc.setTextColor(255,0,0); doc.text(`ERRO: VALE ${item.nome.toUpperCase()}`, ticketWidth / 2, y, { align: 'center' }); doc.setTextColor(0,0,0); y += 20; doc.text('---', ticketWidth / 2, y, { align: 'center' }); y += 30;
        }
    });
    doc.output('dataurlnewwindow');
  };

  // Função para finalizar a venda (envia carrinho original para o backend)
  const handleFinalizarVendaComPagamento = async (metodoPagamentoId) => {
    setModalAberto(false);
    try {
      const response = await fetch(`${API_URL}/api/vendas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            total: total, 
            itens: carrinho, // Envia o carrinho com a flag 'is_combo'
            usuarioId: user.id,
            metodoPagamentoId: metodoPagamentoId,
            username: user.username 
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro desconhecido ao registrar venda.');
      
      alert(`Venda #${data.vendaId} registrada com sucesso!`);
      
      // Salva o carrinho ORIGINAL no estado ultimaVenda para usar na impressão
      setUltimaVenda({ id: data.vendaId, total, itens: carrinho }); 
      
      setCarrinho([]); // Limpa o carrinho para a próxima venda

    } catch (err) {
      console.error('ERRO AO FINALIZAR VENDA:', err);
      alert(`Erro ao registrar a venda: ${err.message}`);
    }
  };
  
  const handleOpenPagamentoModal = () => {
    if (carrinho.length === 0) return alert("Adicione pelo menos um item.");
    setModalAberto(true);
  };

  // Renderização
  if (loadingInitialData) {
      return <p>Carregando caixa...</p>;
  }

  return (
    <> {/* Usa Fragment para agrupar elementos */}
      <div className="caixa-container">
        <div className="produtos-grid">
          {produtos.map(p => (
            <button key={p.id} className="produto-card" onClick={() => adicionarAoCarrinho(p)}>
              <h2>{p.nome} {p.is_combo ? '(Combo)' : ''}</h2> {/* Indica se é combo */}
              <p>R$ {(parseFloat(p.preco) || 0).toFixed(2).replace('.', ',')}</p> 
            </button>
          ))}
          {produtos.length === 0 && <p>Nenhum produto cadastrado.</p>}
        </div>
        <div className="carrinho">
          <h2>Venda Atual</h2>
          <ul className="carrinho-lista">
            {carrinho.length === 0 && <li>Carrinho vazio</li>}
            {carrinho.map(item => (
              <li key={`${item.id}-${item.quantidade}`}> {/* Chave mais específica */}
                <span>{item.nome} (x{item.quantidade})</span>
                <span>R$ {((parseFloat(item.preco) || 0) * item.quantidade).toFixed(2).replace('.', ',')}</span>
              </li>
            ))}
          </ul>
          <div className="carrinho-total">
            <strong>TOTAL: R$ {total.toFixed(2).replace('.', ',')}</strong>
          </div>
          <div className="carrinho-acoes">
            <button onClick={handleOpenPagamentoModal} className="btn-finalizar" disabled={carrinho.length === 0}>Finalizar Venda</button>
            <button onClick={limparCarrinho} className="btn-limpar" disabled={carrinho.length === 0 && !ultimaVenda}>Limpar</button>
          </div>
          
          {/* Botões de impressão aparecem após finalizar */}
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
      </div>

      {/* Modal de Pagamento */}
      {modalAberto && (
        <PagamentoModal 
          total={total}
          onPaymentSelected={handleFinalizarVendaComPagamento}
          onClose={() => setModalAberto(false)}
        />
      )}

      {/* A modal 'ticketParaCopiar' foi removida, pois handlePdfPrint é o fallback */}
    </>
  );
}