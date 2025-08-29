// client/src/App.jsx
import { useState } from 'react';
import Login from './components/Login'; // Vamos criar este componente
import Register from './components/Register'; // E este também
import MainApp from './components/MainApp'; // A tela principal do app
import './App.css';

function App() {
  const [user, setUser] = useState(null); // null = deslogado, objeto user = logado
  const [showRegister, setShowRegister] = useState(false);

  const handleLogout = () => {
    setUser(null);
  };

  // Se não há usuário logado...
  if (!user) {
    return (
      <div className="auth-container">
        {showRegister ? (
          <Register onRegisterSuccess={() => setShowRegister(false)} />
        ) : (
          <Login onLoginSuccess={setUser} />
        )}
        <button className="toggle-auth" onClick={() => setShowRegister(!showRegister)}>
          {showRegister ? 'Já tem uma conta? Faça Login' : 'Não tem uma conta? Registre-se'}
        </button>
      </div>
    );
  }

  // Se há um usuário logado...
  return <MainApp user={user} onLogout={handleLogout} />;
}

export default App;