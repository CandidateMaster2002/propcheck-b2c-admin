import mongoose from 'mongoose';

const VariablePaySchema = new mongoose.Schema({
  variableSize: { type: Number, required: true },   // sqft threshold for extra charge
  variableAmount: { type: Number, required: true },  // extra price per group
}, { _id: false });

const InspectionPriceSchema = new mongoose.Schema({
  propertyType: { type: String },   // 1BHK | 2BHK | 3BHK | 3BHK+ | Villa
  propertySize: { type: Number },   // default/base size in sqft
  propertyPrice: { type: Number },  // base price (no GST)
  variablePay: { type: [VariablePaySchema], default: [] },
  basePrice: { type: Number },
  areaRange: { min: Number, max: Number },
  additionalCharges: { type: Number, default: 0 },
  city: { type: String },
  status: { type: String, default: 'Active' },
}, { timestamps: true });

export default mongoose.models.inspectionprices || mongoose.model('inspectionprices', InspectionPriceSchema, 'inspectionprices');
