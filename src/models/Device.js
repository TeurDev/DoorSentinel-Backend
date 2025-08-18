const mongoose = require('mongoose'); 

const DeviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  serialNumber: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' }, 
  lockActive: { type: Boolean, default: false },
});



module.exports = mongoose.model('Device', DeviceSchema);
