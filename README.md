# DoorSentinel Backend 

<a href="README_es.md"> <img src="https://img.shields.io/badge/ES-Versión en Español aquí-blue?style=for-the-badge" alt="ES222"> </a>

## 📝 Description  
Backend server for the **[DoorSentinel](https://github.com/TeurDev/DoorSentinel)** security system. Built with **Node.js**, **Express**, and **MongoDB**, it manages authentication, devices, groups, events, and user notifications.  


## 📖 Detailed Description  
The **[DoorSentinel](https://github.com/TeurDev/DoorSentinel) Backend** is responsible for all the core logic, data handling, and communication between IoT devices (ESP32) and the mobile application.  

It is developed with **Node.js** and **Express**, using **MongoDB** as a non-relational database.  

### 🗂️ Data Models
The system is organized around four main models:

- **Device**  
  - Serial number  
  - Device number  
  - Associated user  
  - Activation status  
  - Assigned group  

- **Event**  
  - Device that triggered the event  
  - Notification status (true if the user has been notified, false if not)  
  - Date of the event  

- **Group**  
  - Group name  
  - Creator (user)  
  - List of devices included  
  - Lock status (locked/unlocked)  

- **User**  
  - Name  
  - Email  
  - Password  
  - Push tokens for push notifications  
  - `favoriteMain`: main favorite (can be a device or group)  
  - `favoriteList`: list of favorite devices/groups  

### 🔄 API Routes  
Each model has its own **CRUD endpoints** (Create, Read, Update, Delete), allowing full interaction with the system.  

Some of the main features include:  
- **User authentication** and push notification token management.  
- **Device management**: add, update, delete, and assign to groups.  
- **Event logging**: register door openings/closings and notify users.  
- **Group management**: create groups, assign/remove devices, block/unblock devices in bulk.  
- **Favorites management**: handle main favorite and favorite list automatically, with clean-up rules when groups/devices are deleted.  

### 🔧 Main Technologies
- **Runtime:** Node.js  
- **Framework:** Express  
- **Database:** MongoDB (NoSQL)  

---
