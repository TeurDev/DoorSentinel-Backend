const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');

// Configurar dotenv
dotenv.config();

// Crear app
const app = express();

 
const authRoutes = require('./src/routes/auth.routes');


// Middlewares
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());


app.use('/api/users', require('./src/routes/user.routes'));
app.use('/api/devices', require('./src/routes/device.routes'));
app.use('/api/events', require('./src/routes/event.routes'));
app.use('/api/groups', require('./src/routes/group.routes'));
    
// Luego de otras rutas:
app.use('/api/auth', authRoutes);

// Rutas de prueba
app.get('/', (req, res) => {
    res.send('¡Servidor funcionando!');
});

// Puerto de escucha
const PORT = process.env.PORT || 5000;

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log('Conectado a MongoDB');
    app.listen(PORT, () => console.log(`Servidor escuchando en el puerto ${PORT}`));
})
.catch(err => console.error(err));
