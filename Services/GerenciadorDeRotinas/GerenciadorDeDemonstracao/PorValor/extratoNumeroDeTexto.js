const palavrasParaNumeros = {
  "zero": 0,
  "um": 1, "uma": 1,
  "dois": 2, "duas": 2,
  "três": 3, "tres": 3,
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
  "quatorze": 14, "catorze": 14,
  "quinze": 15,
  "dezesseis": 16,
  "dezessete": 17,
  "dezoito": 18,
  "dezenove": 19,
  "vinte": 20,
  "trinta": 30,
  "quarenta": 40,
  "cinquenta": 50,
  "sessenta": 60,
  "setenta": 70,
  "oitenta": 80,
  "noventa": 90,
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
  "milhao": 1000000,
  "milhões": 1000000,
};

function extrairNumeroDeTexto(textoOriginal) {
  if (!textoOriginal) return null;

  const texto = textoOriginal
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove acento
    .toLowerCase()
    .replace(/r?\$ ?/g, "") // remove R$, se houver
    .replace(/\s+/g, " ")
    .trim();

  // 1. Caso especial: "1,5 mil", "2.3 mil", etc
  const matchMilhar = texto.match(/(\d+(?:[.,]\d+)?)\s*mil\b/);
  if (matchMilhar) {
    const numero = parseFloat(matchMilhar[1].replace(",", "."));
    if (!isNaN(numero)) return Math.round(numero * 1000);
  }

  // 2. Extrai número direto: "1.500,00", "2500", "3.299"
  const matchNumerico = texto.match(/[\d.,]+/g);
  if (matchNumerico) {
    const limpo = matchNumerico[0]
      .replace(/\.(?=\d{3})/g, "") // remove pontos de milhar
      .replace(",", "."); // trata vírgula como decimal
    const numero = parseFloat(limpo);
    if (!isNaN(numero)) return Math.round(numero);
  }

  // 3. Tenta ler por extenso: "mil e quinhentos"
  const palavras = texto.split(/\s+/);
  let total = 0;
  let atual = 0;

  for (let palavra of palavras) {
    const valor = palavrasParaNumeros[palavra];
    if (valor != null) {
      if (valor === 1000 || valor === 1000000) {
        if (atual === 0) atual = 1;
        total += atual * valor;
        atual = 0;
      } else {
        atual += valor;
      }
    }
  }

  total += atual;
  return total > 0 ? total : null;
}

module.exports = extrairNumeroDeTexto;
