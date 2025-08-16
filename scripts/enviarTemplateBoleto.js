const axios = require("axios");

// 🔐 Substitua aqui pelo seu token e ID da conta
const WHATSAPP_TOKEN = "EAAaekKJsOsUBPL9uZCPXwce8O0UveDEkJu0YZCb3uaRAF0d7e6Gm02vkfm6saNFZCRba30bs0isuUZAVvKO13vZATFzMq129ZBoEGJuZAhVNSPh5IMIl6ZCoISlZA3Wxc1Pw9RfgEQFoojZAeyZBMdPczarCxEUvSPlat1EoZAx2FtZAYGAZBZCwq5s4CoYbIok9R5GFgZDZD";
const PHONE_NUMBER_ID = "768208863033397";

// 📦 Array de números
const numeros = [
  5522998305417,	
  5522999587585	,
  5521972855897	,
  5521996019477,	
  5522981785550,	
  5522988076037,	
  5522998490864,	
  5522992000144	
]

// 📤 Corpo da mensagem
function montarBody(numero) {
  return {
    messaging_product: "whatsapp",
    to: numero,
    type: "template",
    template: {
      name: "campanha_boleto",
      language: {
        code: "pt_BR"
      },
      components: [
        {
          type: "header",
          parameters: [
            {
              type: "image",
              image: {
                link: "https://scontent.whatsapp.net/v/t61.29466-34/516408224_10095808337286746_357916517523953587_n.png"
              }
            }
          ]
        }
      ]
    }
  };
}

// 🚀 Envia a mensagem
async function enviarMensagens() {
  for (const numero of numeros) {
    try {
      const resposta = await axios.post(
        `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
        montarBody(numero),
        {
          headers: {
            Authorization: `Bearer ${WHATSAPP_TOKEN}`,
            "Content-Type": "application/json"
          }
        }
      );

      const messageId = resposta.data?.messages?.[0]?.id;
      if (messageId) {
        console.log(`✅ Mensagem enviada para ${numero} | ID: ${messageId}`);
      } else {
        console.log(`⚠️ Resposta sem ID para ${numero}:`, resposta.data);
      }
    } catch (erro) {
      console.error(`❌ Erro ao enviar para ${numero}:`, erro.response?.data || erro.message);
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}


enviarMensagens();
