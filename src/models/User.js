const mongoose = require('mongoose');

const FavoriteItemSchema = new mongoose.Schema({
  kind: {
    type: String,
    enum: ['Group', 'Device'],
    required: true
  },
  item: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    // refPath apunta dinámicamente según kind
    refPath: 'favoriteList.kind'
  }
}, { _id: false });

const UserSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  email:      { type: String, required: true, unique: true },
  password:   { type: String, required: true },
  pushTokens: [{ type: String }],

  // Favorito principal: un solo ítem (Group o Device)
  favoriteMain: {
    kind: {
      type: String,
      enum: ['Group', 'Device'],
      default: null
    },
    item: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'favoriteMain.kind',
      default: null
    }
  },

  // Lista de favoritos (máximo 4 ítems)
  favoriteList: {
    type: [FavoriteItemSchema],
    validate: {
      validator: arr => arr.length <= 4,
      message: 'Solo puedes tener hasta 4 favoritos en la lista'
    }
  }
});

module.exports = mongoose.model('User', UserSchema);
