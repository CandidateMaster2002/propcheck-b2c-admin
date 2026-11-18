import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const PropertySchema = new mongoose.Schema({
  propertyName: { type: String },
  propertyType: { type: String },
  address: { type: String },
  street: { type: String },
  city: { type: String },
  state: { type: String },
  pincode: { type: String },
  ownerName: { type: String },
  ownerPhone: { type: String },
  ownerEmail: { type: String },
  projectName: { type: String },
  unitNo: { type: String },
  size: { type: String },
  bedroom: { type: String },
  amount: { type: String },
  couponCode: { type: String },
  inspectionNumber: { type: String },
  reInspectionCount: { type: String },
  reScheduleDate: { type: Date },
  inspectionType: { type: String },
  inspectionDate: { type: Date },
  inspectionTime: { type: String },
  inspectorId: { type: ObjectId, ref: 'inspectors' },
  validatorId: { type: ObjectId, ref: 'inspectors' },
  userId: { type: ObjectId, ref: 'usermanagement' },
  bookingStatus: { type: String, default: 'Pending' },
  reportUrl: { type: String },
  videoUrl: { type: String },
  validatorRemarks: { type: String },
  isValidated: { type: Boolean, default: false },
  validatedAt: { type: Date },
  isReportSent: { type: Boolean, default: false },
  reportSentAt: { type: Date },
  inspectionData: { type: Object },
  status: { type: String, enum: ['Active', 'Inactive', 'Delete'], default: 'Active' },
  shortId: { type: String },
}, { timestamps: true });

// Auto-populate shortId from _id on first save
PropertySchema.pre('save', function (next) {
  if (!this.shortId && this._id) {
    this.shortId = (this._id as any).toString().slice(-6).toUpperCase();
  }
  next();
});

PropertySchema.index({ shortId: 1, status: 1 });
PropertySchema.index({ inspectionNumber: 1, status: 1 });
PropertySchema.index({ bookingStatus: 1, status: 1 });

// Force re-register in dev so schema changes (new fields) take effect without full restart
if (process.env.NODE_ENV !== 'production' && mongoose.models.properties) {
  delete (mongoose.models as any).properties;
}

export default mongoose.models.properties || mongoose.model('properties', PropertySchema);
