import mongoose from 'mongoose';

const WaterQualitySchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'properties' },
  inspectorId: { type: mongoose.Schema.Types.ObjectId, ref: 'inspectors' },
  // APK stores phLevel / tdsLevel (not ph / tds)
  phLevel: { type: Number },
  tdsLevel: { type: Number },
  ph: { type: Number },
  tds: { type: Number },
  turbidity: { type: String },
  color: { type: String },
  taste: { type: String },
  odor: { type: String },
  hardness: { type: String },
  chlorine: { type: Number },
  images: [{ type: String }],
  testDate: { type: Date },
  result: { type: String, enum: ['Pass', 'Fail', 'Marginal', 'Retest'] },
  remarks: { type: String },
}, { timestamps: true, collection: 'waterquality' });

export default mongoose.models.waterquality || mongoose.model('waterquality', WaterQualitySchema);
