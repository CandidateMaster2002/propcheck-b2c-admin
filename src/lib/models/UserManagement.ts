import mongoose from 'mongoose';

const UserManagementSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String },
  phone: { type: String },
  city: { type: String },
  properties: [{ type: mongoose.Schema.Types.ObjectId, ref: 'properties' }],
  inspections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'properties' }],
  status: { type: String, enum: ['Active', 'Inactive', 'Delete'], default: 'Active' }
}, { timestamps: true });

export default mongoose.models.usermanagement || mongoose.model('usermanagement', UserManagementSchema);
