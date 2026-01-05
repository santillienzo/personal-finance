# FinanceFlow

Aplicación de gestión de finanzas personales con frontend React y backend Node.js + SQLite.

## 📁 Estructura del Proyecto

```
financeFlow/
├── frontend/          # Aplicación React con Vite
│   ├── components/    # Componentes de UI
│   ├── services/      # Servicios (API, DB)
│   └── types.ts       # Definiciones TypeScript
└── server/            # Servidor Node.js + Express + SQLite
    ├── src/
    │   ├── routes/    # Rutas de API
    │   ├── database.js
    │   └── index.js
    └── financeflow.db # Base de datos SQLite (generada automáticamente)
```

## 🚀 Instalación y Configuración

### 1. Instalar Dependencias del Servidor

```bash
cd server
npm install
```

### 2. Instalar Dependencias del Frontend

```bash
cd frontend
npm install
```

### 3. Configurar Variables de Entorno (Opcional)

Crea un archivo `.env.local` en la carpeta `frontend`:

```bash
VITE_API_URL=http://localhost:3001/api
```

## 🏃 Ejecutar la Aplicación

### Iniciar el Servidor (Terminal 1)

```bash
cd server
npm run dev
```

El servidor se ejecutará en `http://localhost:3001`

### Iniciar el Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

El frontend se ejecutará en `http://localhost:5173` (o el puerto que Vite asigne)

## 📊 Características

### Transacciones
- ✅ Registrar ingresos y gastos
- ✅ Categorización de gastos
- ✅ Soporte para múltiples monedas (ARS, USD)
- ✅ Filtrado por año, mes y categoría
- ✅ Análisis de gastos por categoría

### Cuotas/Installments
- ✅ Gestión de pagos en cuotas
- ✅ Seguimiento de cuotas pagadas
- ✅ Estado activo/inactivo
- ✅ Múltiples tarjetas

### Dashboard
- ✅ Resumen mensual de ingresos y gastos
- ✅ Visualización de cuotas activas
- ✅ Análisis de gastos por categoría

## 🔧 API Endpoints

### Transacciones
- `POST /api/transactions` - Crear transacción
- `GET /api/transactions?year=2024&month=01` - Obtener transacciones
- `DELETE /api/transactions/:id` - Eliminar transacción
- `GET /api/transactions/summary` - Resumen mensual
- `GET /api/transactions/expenses-by-category` - Gastos por categoría

### Cuotas
- `POST /api/installments` - Crear cuota
- `GET /api/installments?activeOnly=true` - Obtener cuotas
- `PATCH /api/installments/:id/paid` - Actualizar cuotas pagadas
- `PATCH /api/installments/:id/toggle` - Cambiar estado
- `DELETE /api/installments/:id` - Eliminar cuota

## 💾 Base de Datos

La aplicación utiliza **SQLite** para almacenamiento persistente:
- **Ubicación**: `server/financeflow.db`
- **Modo**: WAL (Write-Ahead Logging) para mejor rendimiento
- **Creación automática**: El esquema se crea automáticamente al iniciar el servidor

### Tablas

**transactions**
- id, type, amount, currency, exchange_rate, category, description, date, created_at

**installments**
- id, description, card_name, amount_per_installment, total_installments, installments_paid, start_date, is_active

## 🔄 Migración desde SQLite Cliente

Si tenías datos en la versión anterior (SQLite en el navegador), los datos antiguos permanecen en `localStorage`. La nueva versión utiliza el servidor Node.js con SQLite persistente.

El archivo `frontend/services/db.client.ts` contiene la implementación anterior por si necesitas migrar datos manualmente.

## 🛠️ Tecnologías

### Frontend
- React 19
- TypeScript
- Vite
- Lucide React (iconos)
- TailwindCSS

### Backend
- Node.js
- Express
- better-sqlite3
- CORS

## 📝 Notas

- El servidor debe estar ejecutándose para que el frontend funcione
- Los datos se guardan automáticamente en SQLite
- La base de datos se crea automáticamente en el primer inicio
- El frontend muestra un mensaje de error si no puede conectarse al servidor
# personal-finance
