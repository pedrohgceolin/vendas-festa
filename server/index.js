// server/index.js
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const bcrypt = require("bcrypt");
const path = require("path");
const https = require("https");
const fs = require("fs");
const { Server } = require("socket.io");

const saltRounds = 10; // Fator de complexidade da criptografia

const app = express();
const port = 3001; // Porta que nosso servidor vai rodar

app.use(cors()); // Permite que nosso frontend acesse o backend
app.use(express.json()); // Permite que o servidor entenda JSON

// Conecta ou cria o banco de dados 'database.db'
const db = new sqlite3.Database("./database.db", (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log("Conectado ao banco de dados SQLite.");
  // Cria a tabela de produtos se ela não existir
  db.run(
    "CREATE TABLE IF NOT EXISTS produtos(id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT, preco REAL)"
  );

  // <-- ADICIONE O CÓDIGO ABAIXO -->
  // Cria a tabela de usuários
  db.run(`
        CREATE TABLE IF NOT EXISTS usuarios(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            isAdmin INTEGER DEFAULT 0,
            podeCadastrarProdutos INTEGER DEFAULT 0
        )
    `);

  db.run(`
        CREATE TABLE IF NOT EXISTS metodos_pagamento (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT UNIQUE
        )
    `);

  db.run(`
        CREATE TABLE IF NOT EXISTS vendas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            total REAL NOT NULL,
            usuario_id INTEGER,
            metodo_pagamento_id INTEGER,  -- <-- COLUNA NOVA
            data_venda DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
            FOREIGN KEY (metodo_pagamento_id) REFERENCES metodos_pagamento(id) -- <-- REFERÊNCIA
        )
    `);

  db.run(`
        CREATE TABLE IF NOT EXISTS itens_venda (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venda_id INTEGER,
            produto_id INTEGER,
            quantidade INTEGER NOT NULL,
            preco_unitario REAL NOT NULL,
            FOREIGN KEY (venda_id) REFERENCES vendas(id),
            FOREIGN KEY (produto_id) REFERENCES produtos(id)
        )
    `);
});

const options = {
  key: fs.readFileSync("./localhost+2-key.pem"), // <-- MUDE PARA O NOME DO SEU ARQUIVO DE CHAVE
  cert: fs.readFileSync("./localhost+2.pem"), // <-- MUDE PARA O NOME DO SEU ARQUIVO DE CERTIFICADO
};

// Middleware para servir os arquivos estáticos da pasta 'dist' do cliente
app.use(express.static(path.join(__dirname, "../client/dist")));

// Rota para buscar todos os produtos (API)
app.get("/api/produtos", (req, res) => {
  const sql = "SELECT * FROM produtos";
  db.all(sql, [], (err, rows) => {
    if (err) {
      throw err;
    }
    res.json(rows);
  });
});

// Rota para CADASTRAR um novo produto
app.post("/api/produtos", (req, res) => {
  // Pega o nome e o preço do corpo da requisição
  const { nome, preco } = req.body;

  // Validação simples para garantir que os dados não estão vazios
  if (!nome || preco == null) {
    return res.status(400).json({ error: "Nome e preço são obrigatórios." });
  }

  // Converte o preço para um número, caso ele venha como texto
  const precoNumerico = parseFloat(preco);
  if (isNaN(precoNumerico)) {
    return res
      .status(400)
      .json({ error: "O preço deve ser um número válido." });
  }

  const sql = `INSERT INTO produtos (nome, preco) VALUES (?, ?)`;

  db.run(sql, [nome, precoNumerico], function (err) {
    if (err) {
      console.error("Erro ao inserir produto:", err);
      return res.status(500).json({ error: err.message });
    }
    // Se der certo, retorna o novo produto com o ID gerado
    res.status(201).json({ id: this.lastID, nome, preco: precoNumerico });
  });
});

// Rota para EXCLUIR um produto pelo seu ID
app.delete("/api/produtos/:id", (req, res) => {
  // Pegamos o ID que vem como parâmetro na URL
  const { id } = req.params;

  const sql = `DELETE FROM produtos WHERE id = ?`;

  db.run(sql, [id], function (err) {
    if (err) {
      console.error("Erro ao deletar produto:", err);
      return res.status(500).json({ error: err.message });
    }

    // A propriedade 'this.changes' nos diz quantas linhas foram afetadas.
    // Se for 0, significa que não encontrou nenhum produto com aquele ID.
    if (this.changes === 0) {
      return res.status(404).json({ error: "Produto não encontrado." });
    }

    // Se deu certo, retorna uma mensagem de sucesso.
    res.json({ message: "Produto excluído com sucesso." });
  });
});

app.post("/api/vendas", (req, res) => {
  // Agora também recebemos o metodo_pagamento_id
  const { total, itens, usuarioId, metodoPagamentoId } = req.body;

  if (
    !total ||
    !itens ||
    itens.length === 0 ||
    !usuarioId ||
    !metodoPagamentoId
  ) {
    return res.status(400).json({ error: "Dados da venda inválidos." });
  }

  const sqlVenda = `INSERT INTO vendas (total, usuario_id, metodo_pagamento_id) VALUES (?, ?, ?)`;
  db.run(sqlVenda, [total, usuarioId, metodoPagamentoId], function (err) {
    if (err) {
      console.error("Erro ao inserir na tabela vendas:", err);
      return res.status(500).json({ error: err.message });
    }

    const vendaId = this.lastID;
    const sqlItem = `INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)`;
    const stmt = db.prepare(sqlItem);

    itens.forEach((item) => {
      stmt.run(vendaId, item.id, item.quantidade, item.preco);
    });

    stmt.finalize((err) => {
      if (err) {
        console.error("Erro ao inserir na tabela itens_venda:", err);
        return res.status(500).json({ error: err.message });
      }
      const sqlStats =
        "SELECT COUNT(*) as totalVendas, SUM(total) as faturamentoTotal FROM vendas";
      db.get(sqlStats, [], (err, row) => {
        if (row) {
          // Envia uma mensagem 'nova_venda' para todos os clientes conectados
          io.emit("nova_venda", {
            totalVendas: row.totalVendas,
            faturamentoTotal: row.faturamentoTotal,
          });
        }
      });
      res
        .status(201)
        .json({ vendaId: vendaId, message: "Venda registrada com sucesso!" });
    });
  });
});

// Rota para registrar um novo usuário
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;

  // Verifica se já existem usuários para definir o primeiro como admin
  db.get("SELECT COUNT(*) as count FROM usuarios", async (err, row) => {
    if (err) return res.status(500).json({ error: err.message });

    const isFirstUser = row.count === 0;
    const isAdmin = isFirstUser ? 1 : 0;
    const podeCadastrarProdutos = isFirstUser ? 1 : 0;

    try {
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      const sql = `INSERT INTO usuarios (username, password, isAdmin, podeCadastrarProdutos) VALUES (?, ?, ?, ?)`;

      db.run(
        sql,
        [username, hashedPassword, isAdmin, podeCadastrarProdutos],
        function (err) {
          if (err) {
            return res
              .status(400)
              .json({ error: "Nome de usuário já existe." });
          }
          res.json({
            message: "Usuário registrado com sucesso!",
            userId: this.lastID,
          });
        }
      );
    } catch {
      res.status(500).json({ error: "Erro ao criptografar a senha." });
    }
  });
});

// Rota para fazer login
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const sql = "SELECT * FROM usuarios WHERE username = ?";

  db.get(sql, [username], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user)
      return res.status(400).json({ error: "Usuário ou senha inválidos." });

    try {
      const match = await bcrypt.compare(password, user.password);
      if (match) {
        // Senha correta! Retorna os dados do usuário (sem a senha)
        const { password, ...userData } = user;
        res.json({ message: "Login bem-sucedido!", user: userData });
      } else {
        // Senha incorreta
        res.status(400).json({ error: "Usuário ou senha inválidos." });
      }
    } catch {
      res.status(500).json({ error: "Erro ao verificar a senha." });
    }
  });
});

// Rota para o admin buscar todos os usuários
app.get("/api/users", (req, res) => {
  // AQUI, NUM APP REAL, VERIFICARÍAMOS SE O REQUISITANTE É ADMIN (com tokens, etc)
  // Por simplicidade, vamos confiar no frontend por enquanto.
  const sql =
    "SELECT id, username, isAdmin, podeCadastrarProdutos FROM usuarios";
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Rota para o admin atualizar a permissão de um usuário
app.put("/api/users/permission", (req, res) => {
  const { userId, podeCadastrarProdutos } = req.body;
  console.log("Dados recebidos no backend:", req.body);
  const sql = `UPDATE usuarios SET podeCadastrarProdutos = ? WHERE id = ?`;

  db.run(sql, [podeCadastrarProdutos, userId], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ message: "Permissão atualizada com sucesso." });
  });
});

// Rota para o admin CADASTRAR um novo método de pagamento
app.post("/api/pagamentos", (req, res) => {
  const { nome } = req.body;
  if (!nome) {
    return res
      .status(400)
      .json({ error: "O nome do método de pagamento é obrigatório." });
  }
  const sql = `INSERT INTO metodos_pagamento (nome) VALUES (?)`;
  db.run(sql, [nome], function (err) {
    if (err)
      return res.status(400).json({ error: "Método de pagamento já existe." });
    res.status(201).json({ id: this.lastID, nome });
  });
});

// Rota para a tela de vendas LISTAR os métodos de pagamento
app.get("/api/pagamentos", (req, res) => {
  const sql = "SELECT * FROM metodos_pagamento";
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get("/api/vendas/stats", (req, res) => {
  const sql =
    "SELECT COUNT(*) as totalVendas, SUM(total) as faturamentoTotal FROM vendas";
  db.get(sql, [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({
      totalVendas: row.totalVendas || 0,
      faturamentoTotal: row.faturamentoTotal || 0,
    });
  });
});

app.get("/api/relatorios/vendas-detalhadas", (req, res) => {
  const sql = `
        SELECT
            v.id as venda_id,
            v.total as venda_total,
            v.data_venda,
            u.username as usuario_nome,
            mp.nome as metodo_pagamento_nome,
            p.nome as produto_nome,
            iv.quantidade,
            iv.preco_unitario
        FROM vendas v
        LEFT JOIN usuarios u ON v.usuario_id = u.id
        LEFT JOIN metodos_pagamento mp ON v.metodo_pagamento_id = mp.id
        LEFT JOIN itens_venda iv ON iv.venda_id = v.id
        LEFT JOIN produtos p ON iv.produto_id = p.id
        ORDER BY v.id DESC;
    `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    // Agrupa os itens por venda para facilitar a exibição no frontend
    const vendasAgrupadas = {};
    rows.forEach((row) => {
      if (!vendasAgrupadas[row.venda_id]) {
        vendasAgrupadas[row.venda_id] = {
          id: row.venda_id,
          total: row.venda_total,
          data: row.data_venda,
          usuario: row.usuario_nome,
          metodoPagamento: row.metodo_pagamento_nome,
          itens: [],
        };
      }
      vendasAgrupadas[row.venda_id].itens.push({
        nome: row.produto_nome,
        quantidade: row.quantidade,
        preco: row.preco_unitario,
      });
    });
    res.json(Object.values(vendasAgrupadas));
  });
});

// ROTA 2: Sumário de quantidade por produto
app.get("/api/relatorios/produtos-vendidos", (req, res) => {
  const sql = `
        SELECT
            p.nome,
            SUM(iv.quantidade) as quantidade_total
        FROM itens_venda iv
        JOIN produtos p ON iv.produto_id = p.id
        GROUP BY p.nome
        ORDER BY quantidade_total DESC;
    `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ROTA 3: Sumário de vendas por método de pagamento
app.get("/api/relatorios/vendas-por-pagamento", (req, res) => {
  const sql = `
        SELECT
            mp.nome,
            COUNT(v.id) as quantidade_vendas,
            SUM(v.total) as valor_total
        FROM vendas v
        JOIN metodos_pagamento mp ON v.metodo_pagamento_id = mp.id
        GROUP BY mp.nome
        ORDER BY quantidade_vendas DESC;
    `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Rota "catch-all": para qualquer outra requisição GET que não seja uma API,
// envie o index.html do cliente. Isso permite que o Vue/React Router funcione.
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist", "index.html"));
});

const httpsServer = https.createServer(options, app);

const io = new Server(httpsServer, {
  cors: {
    origin: "*", // Permite conexões de qualquer origem (seguro para nosso caso)
    methods: ["GET", "POST"],
  },
});

// Lógica para quando um cliente (navegador) se conectar via WebSocket
io.on("connection", (socket) => {
  console.log("Um usuário se conectou via WebSocket:", socket.id);
  socket.on("disconnect", () => {
    console.log("Usuário desconectado:", socket.id);
  });
});

// Inicia o servidor
httpsServer.listen(port, "0.0.0.0", () => {
  console.log(
    `Servidor HTTPS e WebSocket rodando! Acesse em: https://192.168.3.9:${port}`
  );
});

// httpsServer.listen(port, "0.0.0.0", () => {
//   console.log(`Servidor HTTPS rodando! Acesse em: https://192.168.3.9:${port}`);
// });
