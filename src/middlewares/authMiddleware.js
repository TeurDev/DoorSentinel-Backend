const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.SECRET_KEY;
 // Misma clave que usamos en auth.routes.js

function authMiddleware(req, res, next) {
  // 1. Leer el token que mandan en los headers
  const token = req.header('Authorization');

  // 2. Verificar que el token exista
  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }

  try {
    // 3. Verificar que el token sea válido
    const decoded = jwt.verify(token, SECRET_KEY);

    // 4. Guardamos el ID del usuario en la request
    req.userId = decoded.userId;

    // 5. Sigue al siguiente paso
    next();
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: 'Token is not valid' });
  }
}

module.exports = authMiddleware;
