// webhookController.js

exports.receberWebhook = (req, res) => {
    console.log('📥 Webhook recebido:');
    console.log(JSON.stringify(req.body, null, 2));
    res.status(200).send('✅ Webhook recebido com sucesso');
  };
  