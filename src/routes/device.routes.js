const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const Group = require('../models/Group');
const Event = require('../models/Event');
const User = require('../models/User');
const authMiddleware = require('../middlewares/authMiddleware'); // Importamos el middleware

// 📌 Ver mis dispositivos asignados
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId; // Gracias al middleware tenemos el ID del usuario

    const devices = await Device.find({ user: userId });

    res.status(200).json(devices);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching devices' });
  }
});



// 📌 Asignarse un dispositivo usando número de serie
router.post('/assign', authMiddleware, async (req, res) => {
  try {
    const { serialNumber } = req.body;
    const userId = req.userId;

    // Buscar el dispositivo por serial
    const device = await Device.findOne({ serialNumber });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Verificar que el dispositivo no esté asignado
    if (device.user) {
      return res.status(400).json({ error: 'Device already assigned to another user' });
    }

    // Asignar el dispositivo al usuario
    device.user = userId;
    await device.save();

    res.status(200).json({ message: 'Device assigned successfully', device });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error assigning device' });
  }
});



// 📌 Desasignar (liberar) un dispositivo
router.post('/unassign', authMiddleware, async (req, res) => {
  try {
    const { deviceId } = req.body;
    const userId = req.userId;

    // Buscar el dispositivo
    const device = await Device.findById(deviceId);

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Verificar que el dispositivo pertenece al usuario que pide desasignar
    if (!device.user || device.user.toString() !== userId) {
      return res.status(403).json({ error: 'You do not have permission to unassign this device' });
    }

    // Desasignar el dispositivo
    device.user = null;
    device.lockActive = false; // Opcional: apagar el bloqueo al desasignar
    await device.save();


   // 🧹 Limpiar este device de favoritos de cualquier usuario
   // 1) Si era favoriteMain
   await User.updateMany(
     { 'favoriteMain.kind': 'Device', 'favoriteMain.item': deviceId },
     { $set: { 'favoriteMain.kind': null, 'favoriteMain.item': null } }
   );
   // 2) Si estaba en favoriteList
   await User.updateMany(
     {},
     { $pull: { favoriteList: { kind: 'Device', item: deviceId } } }
   );




    res.status(200).json({ message: 'Device unassigned successfully', device });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error unassigning device' });
  }
});



// 📌 Cambiar nombre de un dispositivo
router.patch('/rename/:deviceId', authMiddleware, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { name } = req.body;
    const userId = req.userId;

    // Validar entrada
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'El campo "name" es obligatorio y debe ser texto' });
    }

    // Buscar el dispositivo
    const device = await Device.findById(deviceId);
    if (!device) {
      return res.status(404).json({ error: 'Dispositivo no encontrado' });
    }

    // Verificar permisos: solo el propietario puede renombrar
    if (!device.user || device.user.toString() !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para renombrar este dispositivo' });
    }

    // Actualizar el nombre y guardar
    device.name = name.trim();
    await device.save();

    res.status(200).json({ message: 'Nombre de dispositivo actualizado correctamente', device });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el nombre del dispositivo' });
  }
});




// 📌 Cambiar estado de bloqueo (activar/desactivar)
router.patch('/lock/:deviceId', authMiddleware, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { lockActive } = req.body;
    const userId = req.userId;

    // Buscar el dispositivo
    const device = await Device.findById(deviceId);

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Verificar que el dispositivo pertenece al usuario
    if (!device.user || device.user.toString() !== userId) {
      return res.status(403).json({ error: 'You do not have permission to change this device' });
    }

    // Cambiar estado del bloqueo
    device.lockActive = lockActive;
    await device.save();

    res.status(200).json({ message: `Device lock status updated to ${lockActive}`, device });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error updating lock status' });
  }
});






// 📌 Crear un nuevo dispositivo (admin)
router.post('/admin/create', async (req, res) => {
  try {
    const { name, serialNumber } = req.body;

    // Comprobamos que no haya ya un dispositivo con el mismo serial
    const existingDevice = await Device.findOne({ serialNumber });
    if (existingDevice) {
      return res.status(400).json({ error: 'Device with this serial number already exists' });
    }

    const newDevice = new Device({
      name,
      serialNumber,
      user: null, // No asignado
      lockActive: false, // Bloqueo apagado por defecto
    });

    await newDevice.save();

    res.status(201).json({ message: 'Device created successfully', device: newDevice });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating device' });
  }
});


// 📌 Eliminar un dispositivo (admin sin token)
router.delete('/admin/delete/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;

    const device = await Device.findById(deviceId);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // 🧹 1. Eliminar eventos del dispositivo
    await Event.deleteMany({ device: deviceId });

    // 🧹 2. Quitar el dispositivo de cualquier grupo
    await Group.updateMany(
      { devices: deviceId },
      { $pull: { devices: deviceId } }
    );


      // 🧹 3. Limpiar de favoritos en User:
    // 3.1 Si estaba en favoriteMain
    await User.updateMany(
      { 'favoriteMain.kind': 'Device', 'favoriteMain.item': deviceId },
      { $set: { 'favoriteMain.kind': null, 'favoriteMain.item': null } }
    );
    // 3.2 Si estaba en favoriteList
    await User.updateMany(
      {},
      { $pull: { favoriteList: { kind: 'Device', item: deviceId } } }
    );



    // 🧹 4. Eliminar el dispositivo
    await Device.deleteOne({ _id: deviceId });

    res.status(200).json({ message: 'Device deleted successfully' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error deleting device' });
  }
});



module.exports = router;
