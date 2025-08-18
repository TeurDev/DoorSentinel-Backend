const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true }, // Dispositivo asociado
  date: { type: Date, default: Date.now }, // Fecha del evento
  notified: { type: Boolean, default: false }, // Si se envió o no la notificación
});

module.exports = mongoose.model('Event', EventSchema);
