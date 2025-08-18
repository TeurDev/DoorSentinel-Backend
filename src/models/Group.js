const mongoose = require('mongoose');


const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Usuario que creó el grupo
  devices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Device' }], // Dispositivos asociados al grupo
  locked: { type: Boolean, default: false },
});


module.exports = mongoose.model('Group', GroupSchema);
