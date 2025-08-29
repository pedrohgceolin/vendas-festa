// client/src/components/MainApp.jsx
import { useState, useEffect } from 'react';
import AdminPanel from './AdminPanel'; // Importe o componente
import ProductManager from './ProductManager';
import Caixa from './Caixa';
// Futuramente, aqui teremos a tela de produtos, vendas e o painel de admin.

export default function MainApp({ user, onLogout }) {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Caixa da Festa</h1>
        <div>
          <span>Olá, {user.username}!</span>
          <button onClick={onLogout} style={{ marginLeft: '1rem' }}>Sair</button>
        </div>
      </header>
      <main>
        <Caixa user={user} />
        <hr style={{width: '80%', borderColor: '#555'}} />
        {user.podeCadastrarProdutos === 1 && <ProductManager />}
        {user.isAdmin === 1 && <AdminPanel />}
      </main>
    </div>
  );
}
