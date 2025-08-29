// client/src/components/AdminPanel.jsx
import { useState, useEffect } from 'react';

const API_URL='';

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 👇 ADICIONE ESTE useEffect 👇
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${API_URL}/api/users`);
        if (!response.ok) {
          throw new Error('Não foi possível buscar os usuários.');
        }
        const data = await response.json();
        setUsers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []); // O [] vazio garante que isso rode apenas uma vez

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

//   // Lógica para alterar a permissão (será criada no próximo passo)
//   const handlePermissionChange = (userToUpdate) => {
//     console.log("Alterar permissão para:", userToUpdate);
//   };

  if (loading) return <p>Carregando usuários...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div className="admin-panel">
      <h2>Painel do Administrador</h2>
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

