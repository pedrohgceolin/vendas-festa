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
    `CREATE TABLE IF NOT EXISTS produtos(
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        nome TEXT, 
        preco REAL, 
        is_combo INTEGER DEFAULT 0
     )`
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

  db.run(`
        CREATE TABLE IF NOT EXISTS config (
            chave TEXT PRIMARY KEY,
            valor REAL
        )
    `);

  db.run(
    "INSERT OR IGNORE INTO config (chave, valor) VALUES ('caixaInicial', 0)"
  );

  db.run(
    // Adiciona a coluna 'is_combo'
    "CREATE TABLE IF NOT EXISTS produtos(id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT, preco REAL, is_combo INTEGER DEFAULT 0)"
  );

  // 👇👇 ADICIONE A NOVA TABELA 'combo_items' 👇👇
  db.run(`
    CREATE TABLE IF NOT EXISTS combo_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        combo_product_id INTEGER, -- FK para produtos (onde is_combo = 1)
        base_product_id INTEGER,  -- FK para produtos (onde is_combo = 0)
        quantidade INTEGER NOT NULL,
        FOREIGN KEY (combo_product_id) REFERENCES produtos(id) ON DELETE CASCADE, -- Se deletar o combo, deleta os itens
        FOREIGN KEY (base_product_id) REFERENCES produtos(id)
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
  const sql = "SELECT id, nome, preco, is_combo FROM produtos ORDER BY nome";
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("Erro ao buscar produtos:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Rota para CADASTRAR um novo produto
app.post("/api/produtos", (req, res) => {
  const { nome, preco } = req.body;
  if (!nome || preco == null) {
    return res.status(400).json({ error: "Nome e preço são obrigatórios." });
  }
  const precoNumerico = parseFloat(preco);
  if (isNaN(precoNumerico)) {
    return res
      .status(400)
      .json({ error: "O preço deve ser um número válido." });
  }

  // Query INSERT correta, define is_combo como 0
  const sql = `INSERT INTO produtos (nome, preco, is_combo) VALUES (?, ?, 0)`;
  db.run(sql, [nome, precoNumerico], function (err) {
    if (err) {
      console.error("Erro ao inserir produto:", err);
      return res.status(500).json({ error: err.message });
    }
    // Retorna o produto criado, incluindo is_combo = 0
    res
      .status(201)
      .json({ id: this.lastID, nome, preco: precoNumerico, is_combo: 0 });
  });
});

// Rota para o admin BUSCAR o valor do caixa inicial
app.get("/api/caixa-inicial", (req, res) => {
  db.get(
    "SELECT valor FROM config WHERE chave = 'caixaInicial'",
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ valor: row ? row.valor : 0 });
    }
  );
});

// Rota para o admin ATUALIZAR o valor do caixa inicial
app.put("/api/caixa-inicial", (req, res) => {
  const { valor } = req.body;
  db.run(
    "UPDATE config SET valor = ? WHERE chave = 'caixaInicial'",
    [valor],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Caixa inicial atualizado com sucesso." });
    }
  );
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

app.post("/api/vendas", async (req, res) => {
  // Tornamos a função principal async
  // Recebe os dados, incluindo o array 'itens' que pode conter combos
  const { total, itens, usuarioId, metodoPagamentoId, username } = req.body; // username adicionado para socket

  // Validações básicas
  if (
    !total ||
    !itens ||
    itens.length === 0 ||
    !usuarioId ||
    !metodoPagamentoId
  ) {
    return res.status(400).json({ error: "Dados da venda inválidos." });
  }

  // 1. Insere a venda na tabela 'vendas'
  const sqlVenda = `INSERT INTO vendas (total, usuario_id, metodo_pagamento_id) VALUES (?, ?, ?)`;
  db.run(sqlVenda, [total, usuarioId, metodoPagamentoId], async function (err) {
    // Callback do db.run também precisa ser async
    if (err) {
      console.error("Erro ao inserir na tabela vendas:", err);
      return res.status(500).json({ error: err.message });
    }

    const vendaId = this.lastID; // ID da venda que acabamos de criar

    // 2. Prepara a inserção dos itens na tabela 'itens_venda'
    const sqlItem = `INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)`;
    const stmt = db.prepare(sqlItem);

    try {
      // 3. Processa cada item do carrinho (usando 'for...of' para funcionar com await)
      for (const item of itens) {
        if (item.is_combo) {
          // Se for um combo...
          console.log(`Processando combo: ${item.nome} (ID: ${item.id})`);
          // Busca a definição do combo no banco de dados
          const definition = await getComboDefinition(item.id);

          // Calcula a quantidade total de itens base a serem registrados
          const totalBaseQuantity = item.quantidade * definition.quantidade;

          console.log(
            ` -> Combo contém ${definition.quantidade}x ${definition.base_product_name}`
          );
          console.log(
            ` -> Registrando ${totalBaseQuantity}x ${definition.base_product_name} (ID: ${definition.base_product_id}) com preço unitário ${definition.base_product_price}`
          );

          // Insere os itens BASE no banco, usando o PREÇO ORIGINAL do item base
          stmt.run(
            vendaId,
            definition.base_product_id,
            totalBaseQuantity,
            definition.base_product_price
          );
        } else {
          // Se for um item normal...
          console.log(`Processando item normal: ${item.nome} (ID: ${item.id})`);
          // Insere o item normal como antes
          stmt.run(vendaId, item.id, item.quantidade, item.preco);
        }
      }

      // 4. Finaliza a inserção dos itens
      stmt.finalize(async (finalizeErr) => {
        // Callback do finalize também async
        if (finalizeErr) {
          console.error(
            "Erro ao finalizar inserção na tabela itens_venda:",
            finalizeErr
          );
          // IMPORTANTE: Em um sistema real, aqui deveria haver um 'rollback' para deletar a venda da tabela 'vendas'
          return res.status(500).json({ error: finalizeErr.message });
        }

        console.log(`Itens da venda #${vendaId} inseridos com sucesso.`);

        // 5. Busca estatísticas atualizadas e emite via WebSocket (código existente)
        try {
          const dbGet = (sql, params) =>
            new Promise((resolve, reject) =>
              db.get(sql, params, (err, row) =>
                err ? reject(err) : resolve(row)
              )
            );
          const dbAll = (sql, params) =>
            new Promise((resolve, reject) =>
              db.all(sql, params, (err, rows) =>
                err ? reject(err) : resolve(rows)
              )
            );

          const totalRow = await dbGet(
            "SELECT COUNT(*) as totalVendas, SUM(total) as faturamentoTotal FROM vendas"
          );
          const metodoRows = await dbAll(`
                        SELECT mp.nome, COUNT(v.id) as quantidade_vendas, COALESCE(SUM(v.total), 0) as valor_total
                        FROM metodos_pagamento mp LEFT JOIN vendas v ON mp.id = v.metodo_pagamento_id
                        GROUP BY mp.nome ORDER BY mp.nome;
                    `);
          const caixaInicialRow = await dbGet(
            "SELECT valor FROM config WHERE chave = 'caixaInicial'"
          );
          const faturamentoDinheiroRow = await dbGet(`
                        SELECT COALESCE(SUM(v.total), 0) as faturamentoDinheiro
                        FROM vendas v JOIN metodos_pagamento mp ON v.metodo_pagamento_id = mp.id
                        WHERE mp.nome = 'Dinheiro'
                    `);

          io.emit("nova_venda", {
            totalVendas: totalRow.totalVendas || 0,
            faturamentoTotal: totalRow.faturamentoTotal || 0,
            vendasPorMetodo: metodoRows,
            caixaInicial: caixaInicialRow ? caixaInicialRow.valor : 0,
            faturamentoDinheiro:
              faturamentoDinheiroRow.faturamentoDinheiro || 0,
          });
        } catch (emitErr) {
          console.error("Erro ao emitir evento de nova venda:", emitErr);
        }

        // 6. Responde ao cliente
        res
          .status(201)
          .json({ vendaId: vendaId, message: "Venda registrada com sucesso!" });
      });
    } catch (processError) {
      // Captura erros que podem ocorrer durante a busca da definição do combo
      console.error("Erro GERAL ao processar itens da venda:", processError);
      // Aqui também deveria haver um rollback
      res
        .status(500)
        .json({ error: "Erro ao processar itens: " + processError.message });
    }
  });
});

app.get("/api/combos/definitions", (req, res) => {
  const sql = `
        SELECT 
            ci.combo_product_id, 
            ci.base_product_id, 
            p.nome as base_product_name, 
            ci.quantidade 
        FROM combo_items ci
        JOIN produtos p ON ci.base_product_id = p.id;
    `;
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("Erro ao buscar definições de combo:", err);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Função helper (assíncrona) para buscar a definição de um combo específico
const getComboDefinition = (comboId) =>
  new Promise((resolve, reject) => {
    // Busca o ID do produto base, a quantidade no combo, o nome e o preço do produto base
    const sql = `
        SELECT 
            ci.base_product_id, 
            ci.quantidade, 
            p.nome as base_product_name, 
            p.preco as base_product_price 
        FROM combo_items ci 
        JOIN produtos p ON ci.base_product_id = p.id 
        WHERE ci.combo_product_id = ?`;

    db.get(sql, [comboId], (err, row) => {
      if (err) {
        return reject(err);
      }
      if (!row) {
        // Se não encontrar, rejeita a promise com um erro claro
        return reject(
          new Error(`Definição não encontrada para o combo ID ${comboId}`)
        );
      }
      resolve(row); // Se encontrar, resolve com os dados da definição
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

// Rota para listar APENAS produtos base (para o admin criar combos)
app.get("/api/produtos/base", (req, res) => {
  db.all("SELECT * FROM produtos WHERE is_combo = 0", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Rota para CRIAR um combo
app.post("/api/combos", (req, res) => {
  const { nome, preco, base_product_id, quantidade } = req.body;
  if (!nome || !preco || !base_product_id || !quantidade) {
    return res
      .status(400)
      .json({ error: "Dados incompletos para criar o combo." });
  }

  // 1. Insere o combo como um produto
  const sqlProduto = `INSERT INTO produtos (nome, preco, is_combo) VALUES (?, ?, 1)`;
  db.run(sqlProduto, [nome, preco], function (err) {
    if (err)
      return res
        .status(500)
        .json({ error: "Erro ao criar produto combo: " + err.message });

    const comboId = this.lastID;

    // 2. Insere a definição do combo
    const sqlItem = `INSERT INTO combo_items (combo_product_id, base_product_id, quantidade) VALUES (?, ?, ?)`;
    db.run(sqlItem, [comboId, base_product_id, quantidade], (errItem) => {
      if (errItem)
        return res.status(500).json({
          error: "Erro ao definir itens do combo: " + errItem.message,
        });
      res.status(201).json({ id: comboId, nome, preco, is_combo: 1 });
    });
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

app.delete("/api/pagamentos/:id", (req, res) => {
  const { id } = req.params;
  const sql = `DELETE FROM metodos_pagamento WHERE id = ?`;
  db.run(sql, [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0)
      return res
        .status(404)
        .json({ error: "Método de pagamento não encontrado." });
    res.json({ message: "Método de pagamento excluído com sucesso." });
  });
});

app.get("/api/vendas/stats", async (req, res) => {
  try {
    const dbGet = (sql, params) =>
      new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
      });
    const dbAll = (sql, params) =>
      new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
      });

    const totalRow = await dbGet(
      "SELECT COUNT(*) as totalVendas, SUM(total) as faturamentoTotal FROM vendas"
    );
    const metodoRows = await dbAll(`
            SELECT mp.nome, COUNT(v.id) as quantidade_vendas, COALESCE(SUM(v.total), 0) as valor_total
            FROM metodos_pagamento mp LEFT JOIN vendas v ON mp.id = v.metodo_pagamento_id
            GROUP BY mp.nome ORDER BY mp.nome;
        `);
    const caixaInicialRow = await dbGet(
      "SELECT valor FROM config WHERE chave = 'caixaInicial'"
    );
    const faturamentoDinheiroRow = await dbGet(`
            SELECT COALESCE(SUM(v.total), 0) as faturamentoDinheiro
            FROM vendas v JOIN metodos_pagamento mp ON v.metodo_pagamento_id = mp.id
            WHERE mp.nome = 'Dinheiro'
        `);

    res.json({
      totalVendas: totalRow.totalVendas || 0,
      faturamentoTotal: totalRow.faturamentoTotal || 0,
      vendasPorMetodo: metodoRows,
      caixaInicial: caixaInicialRow ? caixaInicialRow.valor : 0,
      faturamentoDinheiro: faturamentoDinheiroRow.faturamentoDinheiro || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
