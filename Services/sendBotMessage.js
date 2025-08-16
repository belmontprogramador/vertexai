// const axios = require("axios");
// const crypto = require("crypto");
// require("dotenv").config();

// const KOMMO_SCOPE_ID = process.env.KOMMO_SCOPE_ID;
// const KOMMO_CHANNEL_SECRET = process.env.KOMMO_CHANNEL_SECRET;
// const KOMMO_SENDER_REF_ID = process.env.KOMMO_SENDER_REF_ID;

// const KOMMO_BASE_URL = `https://amojo.kommo.com/v2/origin/custom/${KOMMO_SCOPE_ID}`;

// /**
//  * Envia mensagem para a Kommo API (texto, imagem, vídeo)
//  * @param {string} receiverRefId - ref_id do cliente no Kommo
//  * @param {object|string} payload - string de texto ou objeto com { imageUrl, videoUrl, caption }
//  */
// const sendBotMessage = async (receiverRefId, payload) => {
//   try {
//     const message = construirMensagem(payload);
//     if (!message) return console.warn("❌ Payload inválido para Kommo:", payload);

//     const body = {
//       payload: {
//         sender: {
//           type: "bot",
//           ref_id: KOMMO_SENDER_REF_ID,
//         },
//         receiver: {
//           type: "contact",
//           ref_id: receiverRefId,
//         },
//         message,
//       },
//       silent: false,
//     };

//     const jsonBody = JSON.stringify(body);
//     const contentMd5 = crypto.createHash("md5").update(jsonBody).digest("hex");
//     const date = new Date().toUTCString();

//     const stringToSign = `POST\n${contentMd5}\napplication/json\n${date}\n/v2/origin/custom/${KOMMO_SCOPE_ID}`;
//     const signature = crypto
//       .createHmac("sha1", KOMMO_CHANNEL_SECRET)
//       .update(stringToSign)
//       .digest("hex");

//     const headers = {
//       Date: date,
//       "Content-Type": "application/json",
//       "Content-MD5": contentMd5,
//       "X-Signature": signature,
//     };

//     const response = await axios.post(KOMMO_BASE_URL, jsonBody, { headers });
//     console.log(`✅ Mensagem enviada via Kommo:`, response.data);
//   } catch (error) {
//     console.error("❌ Erro ao enviar mensagem Kommo:", error.response?.data || error.message);
//   }
// };

// /**
//  * Constrói o objeto message com base no payload
//  */
// function construirMensagem(payload) {
//   if (typeof payload === "string") {
//     return { type: "text", text: payload };
//   }

//   if (typeof payload === "object") {
//     if (payload.imageUrl) {
//       return {
//         type: "image",
//         url: payload.imageUrl,
//         caption: payload.caption || "",
//       };
//     }
//     if (payload.videoUrl) {
//       return {
//         type: "video",
//         url: payload.videoUrl,
//         caption: payload.caption || "",
//       };
//     }
//     if (payload.message) {
//       return { type: "text", text: payload.message };
//     }
//   }

//   return null;
// }

// module.exports = { sendBotMessage };

