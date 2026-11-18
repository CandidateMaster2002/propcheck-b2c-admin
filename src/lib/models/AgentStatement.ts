import mongoose from 'mongoose';

const AgentStatementSchema = new mongoose.Schema({
  inspectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'properties' },
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'agents', required: true },
  bookingDate: { type: Date, default: Date.now },
  customerName: { type: String },
  agentName: { type: String },
  couponCode: { type: String },
  amount: { type: Number, default: 0 },          // total booking amount
  discount: { type: Number, default: 0 },        // discount applied
  incentiveAmount: { type: Number, default: 0 }, // agent incentive amount
  netAmount: { type: Number, default: 0 },       // amount - discount
  customerAmount: { type: Number, default: 0 },  // what customer paid
  isPaid: { type: Boolean, default: false },             // commission paid
  isIncentivePaid: { type: Boolean, default: false },    // incentive paid
  utrNumber: { type: String },                           // bank transfer reference
  incentivePaidDate: { type: Date },
}, { timestamps: true });

export default mongoose.models.agentstatements || mongoose.model('agentstatements', AgentStatementSchema, 'agentstatements');
