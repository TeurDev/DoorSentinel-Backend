# DoorSentinel Backend 

<a href="README_en.md"> <img src="https://img.shields.io/badge/EN-English Version here-red?style=for-the-badge" alt="EN"> </a>

## 📝 Descripción  
Servidor backend para el sistema de seguridad **DoorSentinel**. Construido con **Node.js**, **Express** y **MongoDB**, gestiona autenticación, dispositivos, grupos, eventos y notificaciones para los usuarios.  

## 📖 Descripción Detallada  
El **Backend de DoorSentinel** es responsable de toda la lógica central, el manejo de datos y la comunicación entre los dispositivos IoT (ESP32) y la aplicación móvil.  

Está desarrollado con **Node.js** y **Express**, utilizando **MongoDB** como base de datos no relacional.  

### 🗂️ Modelos de Datos
El sistema se organiza en cuatro modelos principales:

- **Device (Dispositivo)**  
  - Número de serie  
  - Número del dispositivo  
  - Usuario asociado  
  - Estado de activación  
  - Grupo asignado  

- **Event (Evento)**  
  - Dispositivo que generó el evento  
  - Estado de notificación (true si el usuario ha sido notificado, false si no)  
  - Fecha del evento  

- **Group (Grupo)**  
  - Nombre del grupo  
  - Creador (usuario)  
  - Lista de dispositivos incluidos  
  - Estado de bloqueo (bloqueado/desbloqueado)  

- **User (Usuario)**  
  - Nombre  
  - Correo electrónico  
  - Contraseña  
  - Tokens de push para notificaciones  
  - `favoriteMain`: favorito principal (puede ser un dispositivo o grupo)  
  - `favoriteList`: lista de favoritos (dispositivos o grupos)  

### 🔄 Rutas de la API  
Cada modelo tiene sus propios **endpoints CRUD** (Crear, Leer, Actualizar, Eliminar), permitiendo la interacción completa con el sistema.  

Algunas de las funcionalidades principales incluyen:  
- **Autenticación de usuarios** y gestión de tokens para notificaciones push.  
- **Gestión de dispositivos**: agregar, actualizar, eliminar y asignar a grupos.  
- **Registro de eventos**: registrar aperturas/cierres de puertas y notificar a los usuarios.  
- **Gestión de grupos**: crear grupos, asignar/quitar dispositivos, bloquear/desbloquear dispositivos en bloque.  
- **Gestión de favoritos**: manejar el favorito principal y la lista de favoritos automáticamente, con limpieza cuando se eliminan grupos o dispositivos.  

### 🔧 Tecnologías principales
- **Runtime:** Node.js  
- **Framework:** Express  
- **Base de datos:** MongoDB (NoSQL)  

---

