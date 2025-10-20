# Analizador de Tecnicidad del recorrido (GitHub Pages)

Aplicación web estática para analizar un CSV de entrenamiento y calcular el **Índice de Tecnicidad** (desviación estándar de la cadencia en ventanas deslizantes, por defecto 5 s).

## ✅ Funciones
- Carga de CSV local (100% en el navegador).
- Limpieza: elimina filas con `cadence == 0` y con `cadence > 120` (configurable).
- Re-muestreo a **1 Hz** con interpolación lineal para huecos.
- Cálculo del **Índice de Tecnicidad** (antes llamado “Prom. STD”).

## 🎯 Visualización
- **Panel destacado** con el **Índice de Tecnicidad promedio** y su **categoría**:
  - 0 – 0.30: *Nada técnico* (verde)
  - 0.31 – 0.60: *Poco técnico* (amarillo)
  - 0.61 – 0.90: *Moderadamente técnico* (naranja)
  - > 0.91: *Muy técnico* (rojo)
- **Gráfico 1**: Altitud (m) y Cadencia vs tiempo (dos ejes Y).
- **Gráfico 2**: Índice de tecnicidad vs tiempo.

## 📦 Estructura
```
.
├── index.html
├── styles.css
├── app.js
├── README.md
└── LICENSE
```

## 🌐 Publicar en GitHub Pages
1. Crea un repositorio nuevo en GitHub.
2. Sube estos archivos a la rama `main`.
3. Ve a **Settings → Pages**.
4. En **Build and deployment**, elige **Deploy from a branch** (branch `main`, folder `/` o `/docs`).
5. Abre la URL de GitHub Pages que se genere.

## 📥 CSV esperado
- Columnas: `timestamp`, `cadence`, `altitude` (metros).
- `timestamp` en formato ISO (ej. `2025-10-05T06:03:27.000Z`).
- Si tu CSV usa **coma** como separador decimal, selecciónalo en la UI.

## 🔒 Privacidad
Los datos no salen de tu navegador. No hay backend.

## 📄 Licencia
MIT — ver `LICENSE`.
