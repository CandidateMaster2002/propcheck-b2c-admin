import mongoose from 'mongoose';

const MetricScoreSchema = new mongoose.Schema({
  major: { type: Number, required: true },
  minor: { type: Number, required: true },
  cosmetic: { type: Number, required: true },
}, { timestamps: true });

export default mongoose.models.metricscore || mongoose.model('metricscore', MetricScoreSchema);
