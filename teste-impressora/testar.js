// testar.js
const escpos = require("escpos");
const USB = require("escpos-usb");

console.log("Iniciando script de teste da impressora...");

let device;
try {
  // Conecta-se diretamente à impressora com os IDs informados
  console.log(
    "Procurando por dispositivo USB com VID: 0x1FC9 e PID: 0x2016..."
  );
  device = new USB(0x1fc9, 0x2016);
} catch (e) {
  console.error(
    "Não foi possível encontrar o dispositivo USB especificado. Verifique se ela está conectada e ligada.",
    e
  );
  process.exit();
}

const options = { encoding: "CP860" }; // Codificação 'Portuguese'
const printer = new escpos.Printer(device, options);

console.log("Dispositivo de impressão encontrado. Abrindo conexão...");

device.open((error) => {
  if (error) {
    console.error("Erro ao conectar na impressora:", error);
    console.log(
      "Possíveis causas: \n1. Permissões (tente rodar o terminal como Administrador).\n2. O driver do Windows está bloqueando o acesso (problema LIBUSB_ERROR_ACCESS)."
    );
    return;
  }

  console.log("Conexão bem-sucedida! Enviando comandos de impressão...");

  printer
    .font("a")
    .align("ct")
    .style("bu")
    .size(2, 2)
    .text("TESTE DE IMPRESSAO")
    .size(1, 1)
    .style("normal")
    .text("Tomate MDK-080")
    .text(new Date().toLocaleString("pt-BR"))
    .newLine()
    .align("lt")
    .text("Teste de texto normal com acentuacao.")
    .bold(true)
    .text("Este texto esta em negrito.")
    .bold(false)
    .text("------------------------------------------")
    .barcode("123456789012", "EAN13", 3, 60)
    .qrimage("https://google.com", function (err) {
      this.newLine()
        .text("Teste de QR Code acima.")
        .text("Se tudo foi impresso corretamente,")
        .text("a comunicacao esta funcionando!")
        .feed(4)
        .cut()
        .close(function () {
          console.log("Impressão enviada! Fechando conexão.");
        });
    });
});
