import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const AdminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String },
  profileImage: { type: String },
  dob: { type: Date },
  role: { type: String, enum: ['SuperAdmin', 'Admin'], default: 'Admin' },
  status: { type: String, enum: ['Enable', 'Disable', 'Delete'], default: 'Enable' },
  resetPassword: {
    otp: { type: String },
    expiresAt: { type: Date }
  },
  passwordLastUpdate: { type: Date },
  projectId: { type: String },
  token: { type: String }
}, { timestamps: true });

AdminSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

AdminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

export default mongoose.models.administrators || mongoose.model('administrators', AdminSchema);
