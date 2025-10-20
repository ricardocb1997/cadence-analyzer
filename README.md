# Analizador de Cadencia (GitHub Pages)

Pequeña aplicación web estática para analizar un CSV de entrenamiento y calcular la **desviación estándar de la cadencia** en **ventanas deslizantes** (por defecto 5 s). También muestra un **histograma** antes/después de la limpieza y un gráfico combinado con **STD**, **altitud (m)** y **cadencia**.

## ✅ Funciones
- Carga de CSV local (100% en el navegador).
- Limpieza: elimina filas con `cadence == 0` y con `cadence > 120` (configurable).
- Re-muestreo a **1 Hz** con interpolación lineal para huecos.
- Cálculo de **STD** en ventanas deslizantes.
- Gráficos interactivos (Chart.js):
  - Histograma antes vs. después de limpieza.
  - Gráfico combinado: STD (izq), Altitud (dcha) y Cadencia (tercer eje derecho).
- Descarga de resultados como `desviaciones_estandar_5s.csv`.

## 📦 Estructura
```
.
├── index.html
├── styles.css
├── app.js
├── README.md
└── LICENSE
```

## 🛠️ Uso local
1. Clona el repo y copia los archivos.
2. Abre `index.html` en tu navegador.

## 🌐 Publicar en GitHub Pages
1. Crea un repositorio nuevo en GitHub (por ejemplo, `cadence-analyzer`).
2. Sube estos archivos a la rama `main`.
3. Ve a **Settings → Pages**.
4. En **Build and deployment**, elige **Deploy from a branch**.
5. Source: `main` y carpeta `/root` (o `/docs` si lo pones ahí).
6. Guarda: tu web quedará publicada en `https://<tu-usuario>.github.io/<repo>/`.

## 📥 CSV esperado
- Columnas: `timestamp`, `cadence`, `altitude` (metros). Otras columnas se ignoran.
- `timestamp` en formato ISO (ej. `2025-10-05T06:03:27.000Z`).
- Si tu CSV usa **coma** como separador decimal, selecciónalo en la UI.

## ⚙️ Parámetros (en la UI)
- Tamaño de ventana (s)
- Máx. cadencia aceptada (por defecto 120)
- Eliminar cadencia = 0 (activado por defecto)

## 📝 Notas
- El re-muestreo a 1 Hz ayuda a que las ventanas temporales sean homogéneas.
- La altitud se usa tal cual (en metros). Si tu fuente estuviera ruidosa, puedes suavizarla fuera de la app.
- El cálculo de STD usa una implementación simple y clara.

## 🔒 Privacidad
Los datos no salen de tu navegador. No hay backend.

## 📄 Licencia
MIT — ver `LICENSE`.
