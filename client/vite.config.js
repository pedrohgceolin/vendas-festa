import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    // 2. Adicione a configuração do PWA
    VitePWA({
      registerType: "autoUpdate",
      // Inclui os arquivos do PWA no build
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
      // Define o manifesto do aplicativo
      manifest: {
        name: "Vendas Festa App",
        short_name: "VendasFesta",
        description: "Aplicativo de Ponto de Venda para Festas e Eventos",
        theme_color: "#282c34", // A cor de fundo da sua tela de login
        // Define os ícones que criamos na pasta 'public'
        icons: [
          {
            src: "icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
        // Define como o PWA deve ser exibido
        start_url: ".",
        display: "standalone", // Abre como um app, sem a barra do navegador
        background_color: "#282c34",
      },
    }),
  ],
});
