import mongoose from 'mongoose';

// Matches the 'datamanagement' collection in PropcheckB2Cprod (migrated from old 'data-manangement' with typo)
const DataManagementSchema = new mongoose.Schema({
  item: { type: String },                        // old field name (not "question")
  space: { type: String },                       // lowercase: 'bedroom', 'kitchen', etc.
  inspectionFor: { type: String },               // 'quality', 'brand', 'material', 'dimension'
  list: [{ type: String }],                      // old field name (not "options")
  fieldType: { type: String, default: '' },      // 'dropdownInput', 'lengthBreadth', 'singleField'
  status: { type: String, enum: ['Inactive', 'Active', 'Delete'], default: 'Active' },
  issueType: { type: String },                   // 'Major', 'Minor', 'Cosmetic'
  reason: { type: mongoose.Schema.Types.Mixed, default: {} }, // { "Not Satisfactory": [], "Partially Satisfactory": [] }
  criticalItem: { type: String },                // 'yes' or 'no'
  defectCategory: { type: String },
  order: { type: Number },
  createdDate: { type: Date, default: Date.now },
  updatedDate: { type: Date, default: Date.now },
}, { timestamps: true });

// Force re-register in dev so schema changes take effect without full restart
if (process.env.NODE_ENV !== 'production' && mongoose.models.DataManangement) {
  delete (mongoose.models as any).DataManangement;
}

// Third argument overrides collection name — bypasses Mongoose pluralization.
// Migration moved old 'data-manangement' (typo) → 'datamanagement' in PropcheckB2Cprod.
export default mongoose.models.DataManangement ||
  mongoose.model('DataManangement', DataManagementSchema, 'datamanagement');
