# Bonos CAI – Desktop Automation (Electron)

Aplicación de escritorio desarrollada con **Electron + React + Playwright** para ejecutar
automatizaciones locales de canje y compra de entradas, utilizando la **IP y el entorno del usuario**.

Este proyecto forma parte del ecosistema Bonos CAI y está diseñado para:
- Reducir bloqueos y detecciones anti-bot
- Escalar sin consumir recursos de servidor
- Brindar una experiencia de usuario dedicada (desktop)

---

## 🧠 Arquitectura

La aplicación se divide en tres capas principales:

- **Renderer (UI)**  
  React + Vite. Interfaz gráfica donde el usuario:
  - Configura la automatización
  - Inicia / detiene el proceso
  - Visualiza logs en tiempo real

- **Main (Electron / Node.js)**  
  Proceso principal de Electron que:
  - Orquesta la automatización
  - Ejecuta Playwright
  - Maneja filesystem y screenshots
  - Comunica eventos vía IPC

- **Backend Cloud (externo)**  
  Servicio remoto (Node + Supabase) utilizado para:
  - Autenticación
  - Whitelist / control de acceso
  - Persistencia de configuraciones (en fases posteriores)

> ⚠️ La automatización **NO se ejecuta en el servidor**, sino en la PC del usuario.

---

## 🚀 Tecnologías

- Electron
- React + Vite
- Playwright
- Node.js 20+
- IPC (contextBridge)

---

## 📦 Requisitos

- Node.js >= 20
- npm
- Windows (por ahora)

---

## 🛠️ Instalación

```bash
npm install
```

---

## ▶️ Modo desarrollo
```bash
npm run dev
```
Esto levanta:
- Vite en http://localhost:5173
- Electron cargando la UI desde Vite
  
---

## 🧪 Estado actual del proyecto
- ✅ FASE 0: Base Electron + IPC funcionando
- ⏳ FASE 1: Runner Playwright local (en progreso)
- ⏳ FASE 2: Autenticación y conexión con backend cloud
- ⏳ FASE 3: Build .exe y distribución

---
## 🔐 Seguridad
- El proceso renderer no tiene acceso directo a Node.js
- Toda interacción con Playwright y el sistema se realiza vía IPC
- En modo desarrollo pueden aparecer warnings de CSP (esperable en Electron + Vite)

---
## 📄 Licencia
Proyecto privado. Uso interno y distribución controlada.

---