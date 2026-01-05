# 🚀 Guía Rápida - FinanceFlow

## ✅ Estado Actual

- ✅ Servidor Node.js configurado y funcionando
- ✅ Base de datos SQLite integrada
- ✅ API REST implementada
- ✅ Frontend actualizado para usar el servidor

## 📋 Pasos para Ejecutar

### 1. Terminal 1 - Servidor (Ya está corriendo)

El servidor ya está ejecutándose en `http://localhost:3001`

Si necesitas reiniciarlo:
```bash
cd /home/enzo/projects/personal/financeFlow/server
npm run dev
```

### 2. Terminal 2 - Frontend

```bash
cd /home/enzo/projects/personal/financeFlow/frontend
npm run dev
```

Luego abre tu navegador en la URL que muestre Vite (generalmente `http://localhost:5173`)

## 🎯 Características Implementadas

### Backend (Servidor)
- **Puerto**: 3001
- **Base de datos**: SQLite (`server/financeflow.db`)
- **API REST completa** con endpoints para:
  - Transacciones (crear, listar, eliminar, resumen)
  - Cuotas (crear, listar, actualizar, eliminar, toggle)
  - Análisis (gastos por categoría, resumen mensual)

### Frontend
- **Conexión automática** al servidor
- **Manejo de errores** con instrucciones visuales
- **Interfaz sin cambios** - misma experiencia de usuario
- **Datos persistentes** en SQLite del servidor

## 🔧 Cambios Realizados

### Archivos Nuevos

**Servidor:**
- `/server/package.json` - Configuración del servidor
- `/server/src/index.js` - Punto de entrada
- `/server/src/database.js` - Configuración SQLite
- `/server/src/routes/transactions.js` - Rutas de transacciones
- `/server/src/routes/installments.js` - Rutas de cuotas

**Frontend:**
- `/frontend/services/api.ts` - Cliente API
- `/frontend/services/db.ts` - Servicio de base de datos (ahora usa API)
- `/frontend/vite-env.d.ts` - Tipos TypeScript para Vite
- `/frontend/.env.example` - Ejemplo de configuración

### Archivos Modificados

- `/frontend/App.tsx` - Manejo de errores de conexión mejorado
- `/frontend/services/db.client.ts` - Backup de la versión anterior (SQLite en navegador)

## 📊 Base de Datos

La base de datos SQLite se crea automáticamente en:
```
/home/enzo/projects/personal/financeFlow/server/financeflow.db
```

### Tablas:
- **transactions** - Todas las transacciones (ingresos y gastos)
- **installments** - Cuotas de tarjetas de crédito

## 🧪 Probar la API

Puedes probar los endpoints directamente:

```bash
# Health check
curl http://localhost:3001/api/health

# Obtener transacciones del 2024
curl "http://localhost:3001/api/transactions?year=2024"

# Obtener cuotas activas
curl "http://localhost:3001/api/installments?activeOnly=true"
```

## 🔄 Migración de Datos

Si tenías datos en la versión anterior (SQLite en el navegador), están guardados en `localStorage` del navegador. La nueva versión usa una base de datos separada en el servidor.

El archivo `frontend/services/db.client.ts` contiene el código anterior por si necesitas extraer datos manualmente.

## ⚠️ Notas Importantes

1. **El servidor debe estar corriendo** para que el frontend funcione
2. Los datos ahora son **persistentes** en el servidor (no en el navegador)
3. La base de datos se crea automáticamente al iniciar el servidor
4. El frontend muestra un mensaje claro si no puede conectarse al servidor

## 🎉 ¡Listo!

Tu aplicación de finanzas personales ahora tiene:
- ✅ Backend robusto con Node.js
- ✅ Base de datos SQLite rápida y eficiente
- ✅ API REST completa
- ✅ Datos persistentes fuera del navegador
- ✅ Fácil de desplegar y mantener
