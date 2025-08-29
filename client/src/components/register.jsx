// client/src/components/Register.jsx
import { useState } from 'react';
const API_URL='';

export default function Register({ onRegisterSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const response = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setMessage('Cadastro realizado com sucesso! Agora você pode fazer o login.');
      onRegisterSuccess();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Registrar</h2>
      <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Usuário" required />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" required />
      <button type="submit">Registrar</button>
      {/* 👇 Adicione as classes para as mensagens */}
      {error && <p className="feedback-message error">{error}</p>}
      {message && <p className="feedback-message success">{message}</p>}
    </form>
  );
}