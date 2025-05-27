import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  profile: {
    fullName: String,
    age: Number,
    gender: String
  },
  testsAssigned: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test'
  }]
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

export default User;