import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'properties' },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'usermanagements' },
  amount: { type: Number, required: true },
  gst: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, default: 'Razorpay' },
  paymentStatus: { type: String, enum: ['Paid', 'Pending', 'Failed', 'Refunded'], default: 'Pending' },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },
  customerName: { type: String },
  customerEmail: { type: String },
  customerPhone: { type: String },
  notes: { type: String },
  paidAt: { type: Date },
}, { timestamps: true });

export default mongoose.models.payments || mongoose.model('payments', PaymentSchema);
