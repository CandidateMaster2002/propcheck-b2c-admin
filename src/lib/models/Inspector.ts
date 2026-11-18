import mongoose from 'mongoose';

const InspectorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  profileImage: { type: String },
  city: { type: String },
  state: { type: String },
  pincode: { type: String },
  status: { type: String, enum: ['Enable', 'Disable', 'Delete'], default: 'Enable' },
  role: { type: String, default: 'Inspector' },
  leaves: [{
    startDate: Date,
    endDate: Date,
    reason: String
  }]
}, { timestamps: true, strict: false });

export default mongoose.models.inspectors || mongoose.model('inspectors', InspectorSchema);
