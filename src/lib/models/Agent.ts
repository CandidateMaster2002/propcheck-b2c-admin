import mongoose from 'mongoose';

const AgentSchema = new mongoose.Schema({
  name: { type: String },
  userName: { type: String },       // compat with old data if present
  email: { type: String },
  phone: { type: String },
  password: { type: String },
  address: { type: String },
  state: { type: String },
  city: { type: String },
  pincode: { type: String },
  profileImage: { type: String },
  commissionRate: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  status: { type: String, enum: ['Enable', 'Disable', 'Delete'], default: 'Enable' },
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    bankName: String,
    branchName: String
  },
  panNo: { type: String },
  panNoFile: { type: String },
  gstNo: { type: String },
  gstNoFile: { type: String },
  aadharCard: { type: String },
  aadharCardFile: { type: String },
}, { timestamps: true });

export default mongoose.models.agents || mongoose.model('agents', AgentSchema, 'agents');
