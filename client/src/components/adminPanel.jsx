// client/src/components/AdminPanel.jsx
import { useState, useEffect } from 'react';

const API_URL='';

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [metodosPagamento, setMetodosPagamento] = useState([]); // <-- NOVO: Estado para pagamentos
  const [novoMetodo, setNovoMetodo] = useState(''); // <-- NOVO: Estado para o input
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  // Busca usuários e métodos de pagamento
  useEffect(() => {
    const fetchUsersAndPayments = async () => {
      try {
        const usersResponse = await fetch(`${API_URL}/api/users`);
        const paymentsResponse = await fetch(`${API_URL}/api/pagamentos`);

        if (!usersResponse.ok || !paymentsResponse.ok) {
          throw new Error('Falha ao buscar dados do painel.');
        }

        const usersData = await usersResponse.json();
        const paymentsData = await paymentsResponse.json();

        setUsers(usersData);
        setMetodosPagamento(paymentsData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUsersAndPayments();
  }, []);

  const handlePermissionChange = async (userToUpdate) => {
  const newPermissionStatus = userToUpdate.podeCadastrarProdutos === 1 ? 0 : 1;

  try {
    const response = await fetch(`${API_URL}/api/users/permission`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userToUpdate.id,
        podeCadastrarProdutos: newPermissionStatus,
      }),
    });

    if (!response.ok) {
      throw new Error('Falha ao atualizar a permissão.');
    }

    // Sucesso! Agora atualizamos a lista de usuários na tela
    // sem precisar recarregar a página.
    setUsers(users.map(user => 
      user.id === userToUpdate.id 
        ? { ...user, podeCadastrarProdutos: newPermissionStatus } 
        : user
    ));

  } catch (err) {
    // Em um app real, mostraríamos um erro mais amigável
    alert(err.message);
  }
};

const handleAddMetodo = async (e) => {
    e.preventDefault();
    if (!novoMetodo) return;

    try {
      const response = await fetch(`${API_URL}/api/pagamentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novoMetodo }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setMetodosPagamento([...metodosPagamento, data]);
      setNovoMetodo('');
      alert('Método de pagamento adicionado!');
    } catch (err) {
      alert(`Erro: ${err.message}`);
    }
  };

//   // Lógica para alterar a permissão (será criada no próximo passo)
//   const handlePermissionChange = (userToUpdate) => {
//     console.log("Alterar permissão para:", userToUpdate);
//   };

  if (loading) return <p>Carregando usuários...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div className="admin-panel">
      <h2>Painel do Administrador</h2>
       <div className="admin-section">
        <h3>Métodos de Pagamento</h3>
        <form onSubmit={handleAddMetodo} className="admin-form">
          <input 
            type="text" 
            value={novoMetodo} 
            onChange={(e) => setNovoMetodo(e.target.value)} 
            placeholder="Ex: Pix, Cartão, Dinheiro" 
            required 
          />
          <button type="submit">Adicionar</button>
        </form>
        <ul className="admin-list">
          {metodosPagamento.map(m => <li key={m.id}>{m.nome}</li>)}
        </ul>
      </div>

      <p>Gerenciar permissões de usuários.</p>
      
      {/* 👇 ADICIONE A LISTA DE USUÁRIOS 👇 */}
      <ul className="user-list">
        {users.map(user => (
          <li key={user.id} className="user-item">
            <span>{user.username} {user.isAdmin === 1 && '(Admin)'}</span>
            <label className="permission-toggle">
              Pode cadastrar produtos:
              <input 
                type="checkbox"
                checked={user.podeCadastrarProdutos === 1}
                onChange={() => handlePermissionChange(user)}
                disabled={user.isAdmin === 1} // Desativa o toggle para o próprio admin
              />
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

