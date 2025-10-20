# Analizador de Tecnicidad del recorrido (GitHub Pages)
App web estática para calcular el **Índice de Tecnicidad** (desviación estándar de la cadencia en ventanas deslizantes, por defecto 5 s) a partir de un CSV.

- Se elimina el histograma.
- Panel destacado con el **Índice de Tecnicidad promedio** y su **categoría** (verde/amarillo/naranja/rojo).
- **Gráfico 1**: Altitud (m) y Cadencia vs tiempo.
- **Gráfico 2**: Índice de tecnicidad vs tiempo.

CSV: columnas `timestamp`, `cadence`, `altitude` (metros). Si usa **coma** decimal, selecciónalo en la UI.
