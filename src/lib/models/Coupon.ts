import mongoose from 'mongoose';

const CouponSchema = new mongoose.Schema({
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'agents', required: true },
  couponCode: { type: String, required: true, unique: true },
  couponPercentage: { type: Number, required: true, default: 0 },
  incentivePercentage: { type: Number, required: true, default: 0 },
  assignedStatus: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  couponType: { type: String, default: 'regular' },
  creatives: [{ type: String }],
}, { timestamps: true });

export default mongoose.models.coupons || mongoose.model('coupons', CouponSchema);
