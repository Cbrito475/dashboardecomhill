// Formateadores DETERMINISTAS: producen exactamente el mismo string en el
// servidor (Node/ICU) y en el navegador, evitando errores de hidratación de
// React que ocurren cuando Intl.NumberFormat difiere entre ambos entornos.

// 1234567 -> "1.234.567"
export function agrupar(n: number): string {
  const s = Math.round(Math.abs(n)).toString()
  const conPuntos = s.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return n < 0 ? `-${conPuntos}` : conPuntos
}

// 1234567 -> "$1.234.567" (CLP es moneda sin decimales)
export function fmtCLP(n: number): string {
  return `$${agrupar(n)}`
}

// 2.91 -> "2,9" (decimal con coma, determinista)
export function fmtDec(n: number, d = 1): string {
  return n.toFixed(d).replace('.', ',')
}
