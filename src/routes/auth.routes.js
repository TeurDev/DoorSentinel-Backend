const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const authMiddleware = require('../middlewares/authMiddleware');
const User = require('../models/User');
const Device = require('../models/Device');
const Group = require('../models/Group');


// Clave secreta para firmar los tokens (en producción sería más segura)
const SECRET_KEY = process.env.SECRET_KEY;


// 📌 Registro
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Comprobar si el email ya existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crear usuario
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });

    } catch (error) {
    console.error('Registration Error:', error.message);
    res.status(500).json({ error: error.message });
    }
  
});


// 📌 Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar usuario
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Comparar contraseñas
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Crear token
    const token = jwt.sign(
      { userId: user._id },
      SECRET_KEY,
      { expiresIn: '1d' } // el token dura 2 min
    );

    res.status(200).json({ token });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error logging in' });
  }
});



// 📌 Refresh Token
router.post('/refresh', async (req, res) => {
  try {
    const token = req.header('Authorization');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Decodificar el token SIN verificar expiración
    const decoded = jwt.decode(token);

    if (!decoded || !decoded.userId) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    // Buscar el usuario en la base de datos
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Crear un nuevo token
    const newToken = jwt.sign(
      { userId: user._id },
      SECRET_KEY,
      { expiresIn: '15m' } // vuelve a durar 1 día
    );

    res.status(200).json({ token: newToken });

  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({ error: 'Error refreshing token' });
  }
});


// 📌 Guardar Push Token
router.post('/save-push-token', authMiddleware, async (req, res) => {
  try {
    const { pushToken } = req.body;
    const user = await User.findById(req.userId);

    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.pushTokens.includes(pushToken)) {
      user.pushTokens.push(pushToken);
      await user.save();
    }

    res.status(200).json({ message: 'Push token saved' });

  } catch (error) {
    console.error('Error saving push token:', error.message);
    res.status(500).json({ error: error.message });
  }
});


// 📌 Borrar Push Token
router.post('/clear-push-token', authMiddleware, async (req, res) => {
  try {
    const { pushToken } = req.body;
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.pushTokens = user.pushTokens.filter((token) => token !== pushToken);
    await user.save();

    res.status(200).json({ message: 'Push token removed' });

  } catch (error) {
    console.error('Error removing push token:', error.message);
    res.status(500).json({ error: error.message });
  }
});


// 📌 Eliminar un usuario (admin sin token)
router.delete('/admin/delete/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // ✅ 1. Liberar dispositivos asignados al usuario
    await Device.updateMany(
      { user: userId },
      { $set: { user: null, group: null, lockActive: false} }
    );

    // ✅ 2. Buscar todos los grupos creados por el usuario
    const groups = await Group.find({ creator: userId });
    const groupIds = groups.map(group => group._id);


    // ✅ 4. Eliminar los grupos
    const deletedGroups = await Group.deleteMany({ creator: userId });

    // ✅ 5. Eliminar el usuario
    await User.deleteOne({ _id: userId });

    res.status(200).json({
      message: 'User deleted successfully',
      groupsDeleted: deletedGroups.deletedCount,
      groupsAffected: groupIds.length
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error deleting user' });
  }
});







router.patch(
  '/favorite-main',
  authMiddleware,
  async (req, res) => {
    try {
      const userId = req.userId;
      const { kind, itemId } = req.body;
      if (!['Group','Device'].includes(kind)) {
        return res.status(400).json({ error: 'kind inválido' });
      }

      // Validar existencia y pertenencia:
      if (kind === 'Device') {
        const device = await Device.findById(itemId);
        if (!device) {
          return res.status(404).json({ error: 'Device no encontrado' });
        }
        if (device.group) {
          return res.status(400).json({ error: 'El dispositivo debe pertenecer a un grupo' });
        }
      } else {
        const group = await Group.findById(itemId);
        if (!group) {
          return res.status(404).json({ error: 'Group no encontrado' });
        }
        if (group.creator.toString() !== userId) {
          return res.status(403).json({ error: 'No puedes marcar favorito un grupo que no es tuyo' });
        }
      }

      // Actualizar usuario:
      const user = await User.findById(userId);
      // 1) Eliminar de favoriteList si existía ahí
      user.favoriteList = user.favoriteList.filter(f =>
        !(f.kind === kind && f.item.toString() === itemId)
      );
      // 2) Asignar nuevo favoriteMain
      user.favoriteMain = { kind, item: itemId };
      await user.save();

      res.json({ message: 'Favorite main actualizado', favoriteMain: user.favoriteMain });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error actualizando favoriteMain' });
    }
  }
);

// ────────────────────────────────────────────────────────────
// 📌 POST /favorite-list
//    Añade un ítem (Group o Device) a la lista de favoritos.
router.post(
  '/favorite-list',
  authMiddleware,
  async (req, res) => {
    try {
      const userId = req.userId;
      const { kind, itemId } = req.body;
      if (!['Group','Device'].includes(kind)) {
        return res.status(400).json({ error: 'kind inválido' });
      }

      // Validaciones idénticas a /favorite-main
      if (kind === 'Device') {
        const device = await Device.findById(itemId);
        if (!device) {
          return res.status(404).json({ error: 'Device no encontrado' });
        }
        if (device.group) {
          return res.status(400).json({ error: 'El dispositivo no debe pertenecer a un grupo' });
        }
      } else {
        const group = await Group.findById(itemId);
        if (!group) {
          return res.status(404).json({ error: 'Group no encontrado' });
        }
        if (group.creator.toString() !== userId) {
          return res.status(403).json({ error: 'No puedes marcar favorito un grupo que no es tuyo' });
        }
      }

      const user = await User.findById(userId);

      // No permitir duplicados con favoriteMain
      if (user.favoriteMain.kind === kind && user.favoriteMain.item.toString() === itemId) {
        return res.status(400).json({ error: 'Este ítem ya es tu favorito principal' });
      }

      // No permitir duplicados en favoriteList
      if (user.favoriteList.some(f =>
        f.kind === kind && f.item.toString() === itemId
      )) {
        return res.status(400).json({ error: 'Ya está en tu lista de favoritos' });
      }

      // Validar tamaño máximo
      if (user.favoriteList.length >= 4) {
        return res.status(400).json({ error: 'Máximo 4 favoritos en la lista' });
      }

      // Agregar y guardar
      user.favoriteList.push({ kind, item: itemId });
      await user.save();
      res.json({ message: 'Añadido a favoriteList', favoriteList: user.favoriteList });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error añadiendo a favoriteList' });
    }
  }
);

// ────────────────────────────────────────────────────────────
// 📌 DELETE /favorite-list/:itemId
//    Elimina un ítem de la lista de favoritos.
router.delete(
  '/favorite-list/:itemId',
  authMiddleware,
  async (req, res) => {
    try {
      const userId = req.userId;
      const { itemId } = req.params;
      const user = await User.findById(userId);

      // Filtrar
      const before = user.favoriteList.length;
      user.favoriteList = user.favoriteList.filter(f => f.item.toString() !== itemId);
      if (user.favoriteList.length === before) {
        return res.status(404).json({ error: 'Ítem no estaba en tu lista' });
      }

      await user.save();
      res.json({ message: 'Eliminado de favoriteList', favoriteList: user.favoriteList });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error eliminando de favoriteList' });
    }
  }
);


// 📌 GET /me — Perfil + favoritos + estado de bloqueo
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User
      .findById(req.userId)
      .populate({
        path: 'favoriteMain.item',
        // Traemos name/serialNumber y ambos flags (lockActive para Device, locked para Group)
        select: 'name serialNumber lockActive locked'
      })
      .populate({
        path: 'favoriteList.item',
        select: 'name serialNumber lockActive locked'
      });

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      name:          user.name,
      email:         user.email,
      favoriteMain:  user.favoriteMain,   // { kind, item: { _id, name, serialNumber, lockActive?, locked? } }
      favoriteList:  user.favoriteList    // array de ítems iguales
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching profile' });
  }
});





// Ruta protegida de prueba
router.get('/protected', authMiddleware, (req, res) => {
  res.json({ message: `Acceso concedido, usuario ID: ${req.userId}` });
});

module.exports = router;
