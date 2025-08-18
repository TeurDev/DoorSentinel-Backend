const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Device = require('../models/Device');
const authMiddleware = require('../middlewares/authMiddleware'); // Usaremos protección de rutas
const { sendPushNotification } = require('../utils/sendPushNotification');

// 📌 Recibir apertura de puerta
// 📌 Recibir apertura de puerta
// 📌 Recibir apertura de puerta
router.post('/create', async (req, res) => {
  try {
    const { serialNumber } = req.body;

    if (!serialNumber) {
      return res.status(400).json({ error: 'Serial number is required' });
    }

    const device = await Device.findOne({ serialNumber })
      .populate('user')
      .populate('group');

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const isFromGroup = !!device.group;

    // Crear evento
    const newEvent = new Event({
      device: device._id,
      notified: device.lockActive,
      fromGroup: isFromGroup, // 👈 si decides guardarlo, lo añades en el modelo también
    });

    await newEvent.save();

    // Notificar solo si lockActive está activo
    if (device.lockActive && device.user?.pushTokens?.length > 0) {
      const message = isFromGroup
        ? {
            title: '🚨 Alerta de zona',
            body: `Zona "${device.group.name}" ha registrado una apertura`,
          }
        : {
            title: '🚪 Puerta abierta',
            body: `Tu dispositivo "${device.name}" ha sido activado`,
          };

      for (const token of device.user.pushTokens) {
        await sendPushNotification(token, message.title, message.body);
      }
    }

    res.status(201).json({ message: 'Event created successfully', event: newEvent });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating event' });
  }
});



// 📌 Obtener historial de eventos de un dispositivo
router.get('/device/:deviceId', authMiddleware, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.userId;

    // Buscar el dispositivo
    const device = await Device.findById(deviceId);

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Verificar que el dispositivo pertenezca al usuario
    if (!device.user || device.user.toString() !== userId) {
      return res.status(403).json({ error: 'You do not have permission to view this device events' });
    }

    // Buscar todos los eventos asociados al dispositivo
    const events = await Event.find({ device: deviceId }).sort({ date: -1 }); // Más recientes primero

    res.status(200).json(events);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching device events' });
  }
});

module.exports = router;
