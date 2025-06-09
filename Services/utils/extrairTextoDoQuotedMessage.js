const extrairTextoDoQuotedMessage = (msgContent) => {
    const quoted = msgContent?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return null;
  
    return (
      quoted?.conversation ||
      quoted?.extendedTextMessage?.text ||
      quoted?.videoMessage?.caption ||
      quoted?.imageMessage?.caption ||
      null
    );
  };
  
  module.exports = { extrairTextoDoQuotedMessage };
  