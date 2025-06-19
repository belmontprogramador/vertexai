// utils/bloqueioTemporario.js
const bloqueios = new Map(); // sender => timestamp

function setBloqueio(sender, tempoMs = 1) {
  const expiracao = Date.now() + tempoMs;
  bloqueios.set(sender, expiracao);
  setTimeout(() => bloqueios.delete(sender), tempoMs + 5000); // limpeza automática
}

function estaBloqueado(sender) {
  const agora = Date.now();
  const expiracao = bloqueios.get(sender);
  return expiracao && agora < expiracao;
}

module.exports = {
  setBloqueio,
  estaBloqueado
};
