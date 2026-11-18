import mongoose from 'mongoose';

const ScoringMetricSchema = new mongoose.Schema({
  category: { type: String, required: true },
  weight: { type: Number, default: 1 },
  severity: { type: String, enum: ['Minor', 'Major', 'Critical'] },
  description: { type: String },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

export default mongoose.models.scoringmetrics || mongoose.model('scoringmetrics', ScoringMetricSchema);
