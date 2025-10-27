// client/src/components/Relatorios.jsx
import { useState, useEffect, useRef } from 'react'; // <-- Adicionado useRef
import jsPDF from 'jspdf';
import { Chart, registerables } from 'chart.js/auto'; // <-- Importa Chart.js


const API_URL='';

Chart.register(...registerables); // <-- Registra os componentes do Chart.js

export default function Relatorios() {
  const [vendas, setVendas] = useState([]);
  const [produtosSumario, setProdutosSumario] = useState([]);
  const [pagamentosSumario, setPagamentosSumario] = useState([]);
  const [vendasPorHora, setVendasPorHora] = useState([]); // <-- NOVO: Estado para dados do gráfico
  const [loading, setLoading] = useState(true);
  
  const chartRef = useRef(null); // <-- NOVO: Referência para o canvas
  const chartInstanceRef = useRef(null); // <-- NOVO: Referência para a instância do gráfico

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        // Busca todos os dados dos relatórios em paralelo
        const [vendasRes, produtosRes, pagamentosRes] = await Promise.all([
          fetch(`${API_URL}/api/relatorios/vendas-detalhadas`),
          fetch(`${API_URL}/api/relatorios/produtos-vendidos`),
          fetch(`${API_URL}/api/relatorios/vendas-por-pagamento`),
        ]);

        if (!vendasRes.ok || !produtosRes.ok || !pagamentosRes.ok) { // <-- Adiciona verificação
            throw new Error('Falha ao buscar um ou mais dados de relatório.');
        }

        const vendasData = await vendasRes.json();
        const produtosData = await produtosRes.json();
        const pagamentosData = await pagamentosRes.json();

        setVendas(vendasData);
        setProdutosSumario(produtosData);
        setPagamentosSumario(pagamentosData);

        // 👇👇 LÓGICA PARA AGREGAR VENDAS POR HORA 👇👇
        const hourlySales = Array(24).fill(0); // Cria um array com 24 posições (0 a 23), inicializadas com 0
        vendasData.forEach(venda => {
          // Garante que venda.data existe e é uma string válida antes de criar a Data
          if (venda.data) {
              try {
                  const hour = new Date(venda.data).getHours(); // Pega a hora (0-23) da venda
                  if (hour >= 0 && hour <= 23) {
                      hourlySales[hour] += venda.total; // Soma o total da venda na hora correspondente
                  }
              } catch (dateError) {
                  console.error("Erro ao processar data da venda:", venda.data, dateError);
              }
          }
        });
        // Transforma os dados para o formato que o Chart.js espera
        setVendasPorHora(hourlySales.map((total, hour) => ({ hour: `${hour}:00`, total })));

      } catch (error) {
        console.error("Erro ao buscar relatórios:", error);
        alert("Erro ao carregar relatórios. Verifique o console."); // Alerta o usuário
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  // 👇👇 NOVO useEffect PARA DESENHAR O GRÁFICO NA TELA 👇👇
  useEffect(() => {
      if (!chartRef.current || vendasPorHora.length === 0 || loading) return; // Só desenha se tiver canvas, dados e não estiver carregando

      const ctx = chartRef.current.getContext('2d');
      
      // Destroi gráfico anterior se existir (evita sobreposição)
      if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy();
      }

      // Cria a nova instância do gráfico
      chartInstanceRef.current = new Chart(ctx, {
          type: 'bar', // Tipo de gráfico: barras
          data: {
              labels: vendasPorHora.map(d => d.hour), // Rótulos do eixo X (0:00, 1:00, ...)
              datasets: [{
                  label: 'Faturamento por Hora (R$)',
                  data: vendasPorHora.map(d => d.total), // Valores do eixo Y
                  backgroundColor: 'rgba(75, 192, 192, 0.6)',
                  borderColor: 'rgba(75, 192, 192, 1)',
                  borderWidth: 1
              }]
          },
          options: {
              scales: {
                  y: {
                      beginAtZero: true,
                      ticks: {
                          // Formata o eixo Y para mostrar R$
                          callback: function(value) { return 'R$ ' + value.toFixed(2).replace('.', ','); } 
                      }
                  }
              },
              responsive: true, // Garante que o gráfico se ajuste ao container
              maintainAspectRatio: true // Mantém a proporção padrão
          }
      });
      
      // Cleanup function para destruir o gráfico ao desmontar o componente
      return () => {
          if (chartInstanceRef.current) {
              chartInstanceRef.current.destroy();
              chartInstanceRef.current = null;
          }
      };

  }, [vendasPorHora, loading]); // Re-desenha se os dados mudarem ou o loading terminar


  // 👇👇 handleGeneratePdf ATUALIZADO PARA INCLUIR O GRÁFICO 👇👇
  const handleGeneratePdf = () => {
    // Verifica se o gráfico existe antes de tentar gerar PDF
    if (!chartRef.current) {
        alert("Gráfico ainda não renderizado. Tente novamente em alguns segundos.");
        return;
    }

    const doc = new jsPDF('p', 'pt', 'a4');
    let y = 40;
    const margin = 40;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const lineHeight = 15; // Altura aproximada de uma linha de texto

    const checkAddPage = (currentY, elementHeight = lineHeight) => {
        if (currentY + elementHeight > pageHeight - margin) { // Verifica se cabe antes da margem inferior
            doc.addPage();
            return margin; // Retorna a nova posição Y (topo da nova página)
        }
        return currentY; // Continua na mesma posição Y
    };

    // --- TÍTULO ---
    doc.setFontSize(18); doc.text('Relatório Final de Vendas', margin, y); y += 25;
    doc.setFontSize(10); doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, margin, y); y += 30;

    // --- SUMÁRIO POR PRODUTOS ---
    y = checkAddPage(y, 20 + produtosSumario.length * lineHeight + 15); // Estima altura da seção
    doc.setFontSize(14); doc.text('Sumário por Produtos', margin, y); y += 20;
    doc.setFontSize(10);
    produtosSumario.forEach(p => {
        y = checkAddPage(y);
        doc.text(`${p.nome}:`, margin + 10, y);
        doc.text(`${p.quantidade_total} vendidos`, pageWidth - margin, y, { align: 'right' });
        y += lineHeight;
    });
    y += 15; // Espaço após seção

    // --- SUMÁRIO POR MÉTODO DE PAGAMENTO ---
    y = checkAddPage(y, 20 + pagamentosSumario.length * lineHeight + 15);
    doc.setFontSize(14); doc.text('Sumário por Método de Pagamento', margin, y); y += 20;
    doc.setFontSize(10);
    pagamentosSumario.forEach(p => {
        y = checkAddPage(y);
        const linha = `${p.nome} (${p.quantidade_vendas} vendas):`;
        const valor = `R$ ${(p.valor_total || 0).toFixed(2).replace('.', ',')}`; // Garante valor padrão
        doc.text(linha, margin + 10, y);
        doc.text(valor, pageWidth - margin, y, { align: 'right' });
        y += lineHeight;
    });
    y += 30; // Espaço após seção

    // --- GRÁFICO DE VENDAS POR HORA ---
    y = checkAddPage(y, 20); // Verifica espaço para o título do gráfico
    doc.setFontSize(14); doc.text('Faturamento por Hora do Dia', margin, y); y += 20;
    try {
        const chartImage = chartRef.current.toDataURL('image/png', 1.0);
        const imgProps = doc.getImageProperties(chartImage);
        const pdfWidth = pageWidth - 2 * margin; 
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width; 
        
        y = checkAddPage(y, pdfHeight); // Verifica espaço para a imagem do gráfico
        
        doc.addImage(chartImage, 'PNG', margin, y, pdfWidth, pdfHeight);
        y += pdfHeight + 30; // Atualiza Y para depois do gráfico
    } catch(e) {
        console.error("Erro ao adicionar o gráfico ao PDF:", e);
        y = checkAddPage(y);
        doc.setFontSize(10); doc.setTextColor(255, 0, 0); 
        doc.text('Erro ao gerar o gráfico de vendas por hora.', margin, y);
        doc.setTextColor(0, 0, 0); 
        y+= lineHeight;
    }

    // --- VENDAS DETALHADAS ---
    y = checkAddPage(y, 20); // Verifica espaço para título
    doc.setFontSize(14); doc.text('Vendas Detalhadas', margin, y); y += 20;
    
    vendas.forEach(venda => {
        const vendaBlockHeightEstimate = 4 * lineHeight + (venda.itens.length * lineHeight) + 10; // Estima altura
        y = checkAddPage(y, vendaBlockHeightEstimate); // Verifica se a venda inteira cabe

        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        const vendaHeader = `Venda #${venda.id} - Total: R$ ${(venda.total || 0).toFixed(2).replace('.', ',')} - Pagamento: ${venda.metodoPagamento || 'N/A'}`;
        doc.text(vendaHeader, margin, y); y += lineHeight;
        
        y = checkAddPage(y);
        doc.setFont(undefined, 'normal');
        doc.text(`Caixa: ${venda.usuario || 'N/A'} - Data: ${venda.data ? new Date(venda.data).toLocaleString('pt-BR') : 'N/A'}`, margin, y); y += lineHeight;

        venda.itens.forEach(item => { 
            y = checkAddPage(y);
            const itemText = `- ${item.quantidade || '?'}x ${item.nome || 'Produto desconhecido'}`;
            doc.text(itemText, margin + 10, y);
            y += lineHeight; 
        });
        y += 10; // Espaço extra entre as vendas
    });

    doc.save('relatorio-vendas.pdf');
  };

  if (loading) return <p>Carregando relatórios...</p>;

  // JSX para renderizar o painel
  return (
    <div className="reports-panel">
      <div className="reports-header">
        <h2>Relatório de Vendas</h2>
        <button onClick={handleGeneratePdf} className="btn-pdf">Gerar PDF</button>
      </div>
      
      {/* Container que será usado para gerar o PDF (via handleGeneratePdf) */}
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
                  <td>R$ {(p.valor_total || 0).toFixed(2).replace('.', ',')}</td> {/* Garante valor padrão */}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Seção para o gráfico */}
        <section>
            <h2>Faturamento por Hora do Dia</h2>
            <div className="chart-container">
                {/* O gráfico será renderizado aqui pelo useEffect */}
                <canvas ref={chartRef}></canvas> 
            </div>
        </section>

        {/* Seção de vendas detalhadas */}
        <section>
          <h2>Vendas Detalhadas</h2>
          {vendas.map(venda => (
            <div key={venda.id} className="venda-detalhe">
              <h4>Venda #{venda.id} - {venda.data ? new Date(venda.data).toLocaleString('pt-BR') : 'Data Indisponível'}</h4>
              <p>
                <strong>Total:</strong> R$ {(venda.total || 0).toFixed(2).replace('.', ',')} | 
                <strong> Pagamento:</strong> {venda.metodoPagamento || 'N/A'} | 
                <strong> Caixa:</strong> {venda.usuario || 'N/A'}
              </p>
              <ul>
                {venda.itens.map((item, i) => 
                  <li key={i}>{item.quantidade || '?'}x {item.nome || 'Produto desconhecido'}</li>
                )}
              </ul>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}