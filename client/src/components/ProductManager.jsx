// client/src/components/ProductManager.jsx
import { useState, useEffect } from 'react';

const API_URL='';

export default function ProductManager() {
  const [produtos, setProdutos] = useState([]);
  const [produtosBase, setProdutosBase] = useState([]);
  
  // Estados para formulário de produto normal
  const [nomeProduto, setNomeProduto] = useState('');
  const [precoProduto, setPrecoProduto] = useState('');
  
  // Estados para formulário de combo
  const [nomeCombo, setNomeCombo] = useState('');
  const [precoCombo, setPrecoCombo] = useState('');
  const [baseProductId, setBaseProductId] = useState('');
  const [quantidadeCombo, setQuantidadeCombo] = useState(1);

  // Estados para feedback
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true); // Estado de carregamento

  // Busca produtos gerais e produtos base ao carregar
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); // Inicia o carregamento
      setError(''); // Limpa erros anteriores
      setMessage(''); // Limpa mensagens anteriores
      try {
        const [produtosRes, baseRes] = await Promise.all([
          fetch(`${API_URL}/api/produtos`),
          fetch(`${API_URL}/api/produtos/base`)
        ]);

        if (!produtosRes.ok || !baseRes.ok) {
            throw new Error('Falha ao buscar dados dos produtos.');
        }

        const produtosData = await produtosRes.json();
        const baseData = await baseRes.json();
        
        setProdutos(produtosData);
        setProdutosBase(baseData);
        
        // Define um produto base padrão para o select do combo, se houver algum
        if (baseData.length > 0 && !baseProductId) { // Define apenas se não houver um já selecionado
          setBaseProductId(baseData[0].id); 
        }
      } catch(err) {
          console.error("Erro ao buscar produtos:", err);
          setError("Erro ao carregar produtos. Tente recarregar a página.");
      } finally {
          setLoading(false); // Finaliza o carregamento
      }
    };
    fetchData();
  }, []); // O [] vazio garante que rode apenas uma vez ao montar

  // Função para ADICIONAR um produto NORMAL
  const handleAddProduto = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/api/produtos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nomeProduto.trim(), preco: precoProduto }), // Usa trim()
      });

      const newProduct = await response.json();
      if (!response.ok) {
        throw new Error(newProduct.error || 'Erro ao cadastrar produto.');
      }

      setProdutos([...produtos, newProduct]); // Adiciona na lista
      // Limpa o formulário de produto normal
      setNomeProduto('');
      setPrecoProduto('');
      setMessage(`Produto "${newProduct.nome}" cadastrado com sucesso!`);

    } catch (err) {
      setError(err.message);
    }
  };

  // Função para EXCLUIR um produto (normal ou combo)
  const handleDeleteProduto = async (productId) => {
    if (!window.confirm('Tem certeza que deseja excluir este produto/combo?')) {
      return;
    }
    setError('');
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/api/produtos/${productId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao excluir produto.');
      }

      // Remove o produto da lista na tela
      setProdutos(produtos.filter(p => p.id !== productId));
      setMessage('Produto/Combo excluído com sucesso!');

    } catch (err) {
      setError(err.message);
    }
  };

  // Função para ADICIONAR um COMBO
  const handleAddCombo = async (e) => {
    e.preventDefault();
    setError(''); 
    setMessage('');

    // Validação extra para garantir que um produto base foi selecionado
    if (!baseProductId) {
        setError("Por favor, selecione um produto base para o combo.");
        return;
    }

    try {
      const response = await fetch(`${API_URL}/api/combos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            nome: nomeCombo.trim(), 
            preco: precoCombo, 
            base_product_id: baseProductId,
            quantidade: quantidadeCombo 
        }),
      });
      const newCombo = await response.json();
      if (!response.ok) throw new Error(newCombo.error || 'Erro ao criar combo.');

      setProdutos([...produtos, newCombo]); // Adiciona na lista geral
      // Limpa o formulário de combo
      setNomeCombo(''); 
      setPrecoCombo(''); 
      // Não reseta baseProductId, pode ser útil manter o último selecionado
      setQuantidadeCombo(1); 
      setMessage(`Combo "${newCombo.nome}" criado com sucesso!`);
    } catch (err) { 
        setError(err.message); 
    }
  };

  // Renderização durante o carregamento
  if (loading) {
      return <p>Carregando gerenciador de produtos...</p>;
  }

  // Renderização principal
  return (
    <div className="product-manager admin-section"> {/* Adiciona classe admin-section */}
      <h2>Gerenciar Produtos e Combos</h2>
      
      {/* Exibe mensagens de erro ou sucesso */}
      {error && <p className="feedback-message error" style={{marginTop: 0, marginBottom: '1rem'}}>{error}</p>}
      {message && <p className="feedback-message success" style={{marginTop: 0, marginBottom: '1rem'}}>{message}</p>}

      {/* Formulário Produto Normal */}
      <form onSubmit={handleAddProduto} className="product-form admin-form"> {/* Adiciona classe admin-form */}
        <h3>Cadastrar Produto Individual</h3>
        <input 
          type="text" 
          value={nomeProduto} 
          onChange={(e) => setNomeProduto(e.target.value)} 
          placeholder="Nome do Produto" 
          required 
        />
        <input 
          type="number" 
          value={precoProduto} 
          onChange={(e) => setPrecoProduto(e.target.value)} 
          placeholder="Preço (ex: 12.50)" 
          step="0.01" 
          required 
        />
        <button type="submit">Cadastrar Produto</button>
      </form>

      <hr style={{margin: '1.5rem 0'}}/> 

      {/* Formulário para Combos */}
      <form onSubmit={handleAddCombo} className="product-form combo-form admin-form"> {/* Adiciona classe admin-form */}
        <h3>Criar Novo Combo</h3>
        <input 
            type="text" 
            value={nomeCombo} 
            onChange={(e) => setNomeCombo(e.target.value)} 
            placeholder="Nome do Combo (Ex: 3 Cervejas)" 
            required 
        />
        <input 
            type="number" 
            value={precoCombo} 
            onChange={(e) => setPrecoCombo(e.target.value)} 
            placeholder="Preço do Combo (Ex: 30.00)" 
            step="0.01" 
            required 
        />
        <label htmlFor="baseProductSelect">Produto Base:</label>
        <select 
            id="baseProductSelect" 
            value={baseProductId} 
            onChange={(e) => setBaseProductId(e.target.value)} 
            required
            disabled={produtosBase.length === 0} // Desabilita se não houver produtos base
        >
          {produtosBase.length === 0 && <option value="">Cadastre produtos individuais primeiro</option>}
          {produtosBase.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <label htmlFor="comboQuantity">Quantidade no Combo:</label>
        <input 
            id="comboQuantity" 
            type="number" 
            value={quantidadeCombo} 
            onChange={(e) => setQuantidadeCombo(e.target.value)} 
            min="1" 
            required 
        />
        <button type="submit" disabled={produtosBase.length === 0}>Criar Combo</button>
      </form>

      <hr style={{margin: '1.5rem 0'}}/> 

      {/* Lista de Produtos (Normais e Combos) */}
      <div className="product-list">
        <h3>Produtos e Combos Cadastrados</h3>
        <ul className="admin-list"> {/* Usa classe admin-list */}
          {produtos.length === 0 && <li>Nenhum produto cadastrado.</li>}
          {produtos.map(p => (
            <li key={p.id}> {/* Usa estilo da admin-list */}
              <span>{p.nome} {p.is_combo ? <b style={{color: '#61dafb'}}>(Combo)</b> : ''}</span> {/* Indica se é combo */}
              <div className="product-details">
                <span>R$ {(parseFloat(p.preco) || 0).toFixed(2).replace('.', ',')}</span>
                <button 
                  onClick={() => handleDeleteProduto(p.id)} 
                  className="btn-delete-small" /* Usa estilo de botão pequeno */
                  title={`Excluir ${p.nome}`}
                >
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}