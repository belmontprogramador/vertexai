// extrairNumeroDeTexto.js

const palavrasParaNumeros = {
  "um": 1,
  "dois": 2,
  "três": 3,
  "tres": 3,
  "quatro": 4,
  "cinco": 5,
  "seis": 6,
  "sete": 7,
  "oito": 8,
  "nove": 9,
  "dez": 10,
  "onze": 11,
  "doze": 12,
  "treze": 13,
  "quatorze": 14,
  "catorze": 14,
  "quinze": 15,
  "dezesseis": 16,
  "dezessete": 17,
  "dezoito": 18,
  "dezenove": 19,
  "vinte": 20,
  "trinta": 30,
  "quarenta": 40,
  "cinquenta": 50,
  "cem": 100,
  "cento": 100,
  "duzentos": 200,
  "trezentos": 300,
  "quatrocentos": 400,
  "quinhentos": 500,
  "seiscentos": 600,
  "setecentos": 700,
  "oitocentos": 800,
  "novecentos": 900,
  "mil": 1000,
  "milhar": 1000,
  "milhão": 1000000,
  "milhoes": 1000000
};

function extrairNumeroDeTexto(texto) {
  if (!texto) return null;

  // 1. Tenta extrair número direto
  const numeros = texto.match(/\d+/g);
  if (numeros && numeros.length > 0) {
    return parseInt(numeros.join(""));
  }

  // 2. Tenta somar valores por extenso
  const palavras = texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .toLowerCase()
    .split(/\s+/);

  let total = 0;
  for (let palavra of palavras) {
    if (palavrasParaNumeros[palavra]) {
      total += palavrasParaNumeros[palavra];
    }
  }

  return total > 0 ? total : null;
}

module.exports = extrairNumeroDeTexto;
