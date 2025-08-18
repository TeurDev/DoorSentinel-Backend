// routes/groups.routes.js

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const Group = require('../models/Group');
const Device = require('../models/Device');
const Event = require('../models/Event');
const User = require('../models/User');

// 📌 Crear un grupo nuevo
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    const newGroup = new Group({
      name,
      creator: req.userId,
      devices: [],
    });

    await newGroup.save();
    res.status(201).json(newGroup);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating group' });
  }
});

// 📌 Ver todos los grupos del usuario
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const groups = await Group.find({ creator: req.userId });
    res.status(200).json(groups);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching groups' });
  }
});

// 📌 Ver historial combinado de eventos de un grupo
// 📌 Ver historial combinado de eventos de un grupo

router.get('/:groupId/events', authMiddleware, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.userId;

    // Verificar que el grupo existe y pertenece al usuario
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (group.creator.toString() !== userId) {
      return res.status(403).json({ error: 'You do not have permission to view this group' });
    }

    // Verificar que hay dispositivos en el grupo
    if (!group.devices || group.devices.length === 0) {
      return res.status(200).json([]); // retornar lista vacía si no hay dispositivos
    }

    // Buscar eventos de esos dispositivos
    const events = await Event.find({
      device: { $in: group.devices },
    })
      .sort({ date: -1 })
      .populate('device', 'name serialNumber');

    res.status(200).json(events);
  } catch (error) {
    console.error('❌ Error en GET /:groupId/events:', error.message);
    res.status(500).json({ error: 'Error fetching group events' });
  }
});

// 📌 Obtener info de un grupo por ID
router.get('/:groupId', authMiddleware, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Verificamos que el usuario sea el creador
    if (group.creator.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.status(200).json(group);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching group' });
  }
});


// 📌 Ver los dispositivos de un grupo
router.get('/:groupId/devices', authMiddleware, async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId).populate('devices');

    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.creator.toString() !== req.userId) return res.status(403).json({ error: 'Unauthorized' });

    res.status(200).json(group.devices);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching group devices' });
  }
});

// 📌 Agregar un dispositivo al grupo
router.post('/:groupId/add-device', authMiddleware, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { deviceId } = req.body;

    const group = await Group.findById(groupId);
    const device = await Device.findById(deviceId);

    if (!group || !device) return res.status(404).json({ error: 'Group or device not found' });
    if (group.creator.toString() !== req.userId) return res.status(403).json({ error: 'Unauthorized' });

    // (Opcional pero recomendado) Validar que el dispositivo no pertenezca ya a otro grupo
    if (device.group && device.group.toString() !== groupId) {
      return res.status(400).json({ error: 'Device already belongs to another group' });
    }

    // Agregar el dispositivo al grupo
    if (!group.devices.includes(deviceId)) {
      group.devices.push(deviceId);
    }

    //// Obtener estado del grupo
    if (group.locked) {
      device.lockActive = true;
    } else {
      device.lockActive = false;
    }


    // Asignar el grupo al dispositivo
    device.group = group._id;

    await group.save();
    await device.save();

        // 🧹 Si el device estaba en favoritos, limpiarlo:
        await User.updateMany(
         { 'favoriteMain.kind': 'Device', 'favoriteMain.item': device._id },
          { $set: { 'favoriteMain.kind': null, 'favoriteMain.item': null } }
        );
        await User.updateMany(
          {},
          { $pull: { favoriteList: { kind: 'Device', item: device._id } } }
        );


    res.status(200).json({ message: 'Device added to group successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error adding device to group' });
  }
});

// 📌 Bloquear todos los dispositivos de un grupo
router.post('/:groupId/lock', authMiddleware, async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId).populate('devices');

    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.creator.toString() !== req.userId) return res.status(403).json({ error: 'Unauthorized' });

    await Device.updateMany(
      { _id: { $in: group.devices } },
      { lockActive: true }
    );

        // 📌 Actualizar estado de grupo
        group.locked = true;
        await group.save();

    res.status(200).json({ message: 'Group locked (devices activated)', devicesUpdated: group.devices.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error locking group' });
  }
});

// 📌 Desbloquear todos los dispositivos de un grupo
router.post('/:groupId/unlock', authMiddleware, async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId).populate('devices');

    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.creator.toString() !== req.userId) return res.status(403).json({ error: 'Unauthorized' });

    await Device.updateMany(
      { _id: { $in: group.devices } },
      { lockActive: false }
    );

        // 📌 Actualizar estado de grupo
        group.locked = false;
        await group.save();

    res.status(200).json({ message: 'Group unlocked (devices deactivated)', devicesUpdated: group.devices.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error unlocking group' });
  }
});

// 📌 Renombrar un grupo
router.patch('/:groupId/rename', authMiddleware, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name } = req.body;
    const group = await Group.findById(groupId);

    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.creator.toString() !== req.userId) return res.status(403).json({ error: 'Unauthorized' });

    group.name = name;
    await group.save();

    res.status(200).json({ message: 'Group renamed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error renaming group' });
  }
});

// 📌 Quitar un dispositivo de un grupo
// 📌 Quitar un dispositivo de un grupo
router.post('/:groupId/remove-device/:deviceId', authMiddleware, async (req, res) => {
  try {
    const { groupId, deviceId } = req.params;
    const group = await Group.findById(groupId);
    const device = await Device.findById(deviceId);

    if (!group || !device) return res.status(404).json({ error: 'Group or device not found' });
    if (group.creator.toString() !== req.userId) return res.status(403).json({ error: 'Unauthorized' });

    // Quitar el dispositivo del array
    group.devices = group.devices.filter(id => id.toString() !== deviceId);
    await group.save();

    // Quitar el grupo del dispositivo y desactivar su bloqueo
    device.group = null;
    device.lockActive = false;
    await device.save();


    // 🧹 Tras quedar fuera de grupo, ya no puede ser favorito:
    await User.updateMany(
        { 'favoriteMain.kind': 'Device', 'favoriteMain.item': device._id },
        { $set: { 'favoriteMain.kind': null, 'favoriteMain.item': null } }
      );
      await User.updateMany(
       {},
        { $pull: { favoriteList: { kind: 'Device', item: device._id } } }
      );


    res.status(200).json({ message: 'Device removed from group and lock disabled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error removing device from group' });
  }
});


// 📌 Eliminar un grupo completo
router.delete('/:groupId', authMiddleware, async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);

    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.creator.toString() !== req.userId) return res.status(403).json({ error: 'Unauthorized' });

    // Desasociar los dispositivos antes de eliminar el grupo
    await Device.updateMany({ group: groupId }, { $unset: { group: "" } });


    // 1) Capturamos qué dispositivos tenía
    const deviceIds = group.devices.slice();

    // 2) Desasociar los dispositivos
    await Device.updateMany(
      { group: groupId },
      { $unset: { group: "" }, $set: { lockActive: false } }
    );

    // 3) Limpiar de favoritos a nivel usuario:
    // 3.1 El grupo eliminado
    await User.updateMany(
      { 'favoriteMain.kind': 'Group', 'favoriteMain.item': groupId },
      { $set: { 'favoriteMain.kind': null, 'favoriteMain.item': null } }
    );
    await User.updateMany(
      {},
      { $pull: { favoriteList: { kind: 'Group', item: groupId } } }
    );
    // 3.2 Los dispositivos que pierden grupo ya no pueden ser favoritos
    await User.updateMany(
      { 'favoriteMain.kind': 'Device', 'favoriteMain.item': { $in: deviceIds } },
      { $set: { 'favoriteMain.kind': null, 'favoriteMain.item': null } }
    );
    await User.updateMany(
      {},
      { $pull: { favoriteList: { kind: 'Device', item: { $in: deviceIds } } } }
    );



    await group.deleteOne();

    res.status(200).json({ message: 'Group deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error deleting group' });
  }
});

module.exports = router;
