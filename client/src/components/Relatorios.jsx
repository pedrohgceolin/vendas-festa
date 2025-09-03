// client/src/components/Relatorios.jsx
import { useState, useEffect } from 'react';
const API_URL='';
import jsPDF from 'jspdf';

export default function Relatorios() {
  const [vendas, setVendas] = useState([]);
  const [produtosSumario, setProdutosSumario] = useState([]);
  const [pagamentosSumario, setPagamentosSumario] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        // Busca todos os dados dos relatórios em paralelo
        const [vendasRes, produtosRes, pagamentosRes] = await Promise.all([
          fetch(`${API_URL}/api/relatorios/vendas-detalhadas`),
          fetch(`${API_URL}/api/relatorios/produtos-vendidos`),
          fetch(`${API_URL}/api/relatorios/vendas-por-pagamento`),
        ]);

        const vendasData = await vendasRes.json();
        const produtosData = await produtosRes.json();
        const pagamentosData = await pagamentosRes.json();

        setVendas(vendasData);
        setProdutosSumario(produtosData);
        setPagamentosSumario(pagamentosData);
      } catch (error) {
        console.error("Erro ao buscar relatórios:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const handleGeneratePdf = () => {
    const doc = new jsPDF('p', 'pt', 'a4');
    let y = 40; // Coordenada Y inicial, nossa "caneta" começa aqui
    const margin = 40;
    const pageWidth = doc.internal.pageSize.getWidth();

    // --- TÍTULO ---
    doc.setFontSize(18);
    doc.text('Relatório Final de Vendas', margin, y);
    y += 25;
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, margin, y);
    y += 30;

    // --- SUMÁRIO POR PRODUTOS ---
    doc.setFontSize(14);
    doc.text('Sumário por Produtos', margin, y);
    y += 20;
    doc.setFontSize(10);
    produtosSumario.forEach(p => {
        doc.text(`${p.nome}:`, margin + 10, y);
        doc.text(`${p.quantidade_total} vendidos`, pageWidth - margin, y, { align: 'right' });
        y += 15;
    });
    y += 15;

    // --- SUMÁRIO POR MÉTODO DE PAGAMENTO ---
    doc.setFontSize(14);
    doc.text('Sumário por Método de Pagamento', margin, y);
    y += 20;
    doc.setFontSize(10);
    pagamentosSumario.forEach(p => {
        const linha = `${p.nome} (${p.quantidade_vendas} vendas):`;
        const valor = `R$ ${p.valor_total.toFixed(2).replace('.', ',')}`;
        doc.text(linha, margin + 10, y);
        doc.text(valor, pageWidth - margin, y, { align: 'right' });
        y += 15;
    });
    y += 30;

    // --- VENDAS DETALHADAS ---
    doc.setFontSize(14);
    doc.text('Vendas Detalhadas', margin, y);
    y += 20;

    vendas.forEach(venda => {
        // Verifica se precisa de uma nova página ANTES de começar uma nova venda
        if (y > 780) { // 780 é um valor seguro perto do fim da página A4 (841pt)
            doc.addPage();
            y = 40; // Reseta a posição Y para o topo
        }

        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        const vendaHeader = `Venda #${venda.id} - Total: R$ ${venda.total.toFixed(2).replace('.', ',')} - Pagamento: ${venda.metodoPagamento}`;
        doc.text(vendaHeader, margin, y);
        y += 15;
        doc.setFont(undefined, 'normal');
        doc.text(`Caixa: ${venda.usuario} - Data: ${new Date(venda.data).toLocaleString('pt-BR')}`, margin, y);
        y += 15;

        venda.itens.forEach(item => {
            const itemText = `- ${item.quantidade}x ${item.nome}`;
            doc.text(itemText, margin + 10, y);
            y += 15;
        });
        y += 10; // Espaço extra entre as vendas
    });

    // --- SALVA O ARQUIVO ---
    doc.save('relatorio-vendas.pdf');
};

  if (loading) return <p>Carregando relatórios...</p>;

  return (
    <div className="reports-panel">
      <div className="reports-header">
        <h2>Relatório de Vendas</h2>
        <button onClick={handleGeneratePdf} className="btn-pdf">Gerar PDF</button>
      </div>

      {/* Este div será o conteúdo do nosso PDF */}
      <div id="report-content">
        <h1>Relatório Final de Vendas</h1>
        <p>Gerado em: {new Date().toLocaleString('pt-BR')}</p>

        <section>
          <h2>Sumário por Produtos</h2>
          <table>
            <thead>
              <tr><th>Produto</th><th>Quantidade Vendida</th></tr>
            </thead>
            <tbody>
              {produtosSumario.map((p, i) => <tr key={i}><td>{p.nome}</td><td>{p.quantidade_total}</td></tr>)}
            </tbody>
          </table>
        </section>

        <section>
          <h2>Sumário por Método de Pagamento</h2>
          <table>
            <thead>
              <tr><th>Método</th><th>Nº de Vendas</th><th>Valor Total</th></tr>
            </thead>
            <tbody>
              {pagamentosSumario.map((p, i) => (
                <tr key={i}>
                  <td>{p.nome}</td>
                  <td>{p.quantidade_vendas}</td>
                  <td>R$ {p.valor_total.toFixed(2).replace('.', ',')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2>Vendas Detalhadas</h2>
          {vendas.map(venda => (
            <div key={venda.id} className="venda-detalhe">
              <h4>Venda #{venda.id} - {new Date(venda.data).toLocaleString('pt-BR')}</h4>
              <p><strong>Total:</strong> R$ {venda.total.toFixed(2).replace('.', ',')} | <strong>Pagamento:</strong> {venda.metodoPagamento} | <strong>Caixa:</strong> {venda.usuario}</p>
              <ul>
                {venda.itens.map((item, i) => <li key={i}>{item.quantidade}x {item.nome}</li>)}
              </ul>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}