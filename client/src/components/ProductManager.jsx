// client/src/components/ProductManager.jsx
import { useState, useEffect } from 'react';

const API_URL='';

export default function ProductManager() {
  const [produtos, setProdutos] = useState([]);
  const [nomeProduto, setNomeProduto] = useState('');
  const [precoProduto, setPrecoProduto] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Busca os produtos existentes ao carregar o componente
  useEffect(() => {
    const fetchProdutos = async () => {
      const response = await fetch(`${API_URL}/api/produtos`);
      const data = await response.json();
      setProdutos(data);
    };
    fetchProdutos();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/api/produtos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nomeProduto, preco: precoProduto }),
      });

      const newProduct = await response.json();
      if (!response.ok) {
        throw new Error(newProduct.error || 'Erro ao cadastrar produto.');
      }

      // Sucesso! Adiciona o novo produto à lista na tela e limpa o formulário
      setProdutos([...produtos, newProduct]);
      setNomeProduto('');
      setPrecoProduto('');
      setMessage(`Produto "${newProduct.nome}" cadastrado com sucesso!`);

    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (productId) => {
    // Pede uma confirmação antes de deletar, uma boa prática!
    if (!window.confirm('Tem certeza que deseja excluir este produto?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/produtos/${productId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao excluir produto.');
      }

      // Sucesso! Remove o produto da lista na tela.
      setProdutos(produtos.filter(p => p.id !== productId));
      setMessage('Produto excluído com sucesso!');

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="product-manager">
      <h2>Gerenciar Produtos</h2>

      <form onSubmit={handleSubmit} className="product-form">
        <h3>Cadastrar Novo Produto</h3>
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
        <button type="submit">Cadastrar</button>
        {error && <p className="feedback-message error">{error}</p>}
        {message && <p className="feedback-message success">{message}</p>}
      </form>

      <div className="product-list">
        <h3>Produtos Cadastrados</h3>
        <ul>
          {produtos.map(p => (
            <li key={p.id} className="product-list-item"> {/* Adicionei uma classe aqui */}
              <span>{p.nome}</span>
              <div className="product-details"> {/* Criei um container para preço e botão */}
                <span>R$ {p.preco.toFixed(2).replace('.', ',')}</span>
                {/* 👇👇 ADICIONE O NOVO BOTÃO DE EXCLUIR 👇👇 */}
                <button onClick={() => handleDelete(p.id)} className="delete-button">
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