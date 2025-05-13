import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String, required: true }, // Prescription, Test Report, Scan, etc.
  hospital: { type: String },
  doctor: { type: String },
  date: { type: Date },
  uploadedAt: { type: Date, default: Date.now }
});

const caseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  files: [fileSchema],
  createdAt: { type: Date, default: Date.now }
});

const memberSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'user', 
    required: true 
  },
  name: { type: String, required: true },
  relation: { type: String, required: true }, // Self, Father, Mother, etc.
  cases: [caseSchema],
  createdAt: { type: Date, default: Date.now }
});

// Create compound index for userId + name to ensure no duplicate family members
memberSchema.index({ userId: 1, name: 1, relation: 1 }, { unique: true });

const memberModel = mongoose.models.member || mongoose.model("member", memberSchema);
export default memberModel;