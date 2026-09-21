import mongoose from "mongoose";

const allocationAuditSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  candidateIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  completenessOverrides: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  minCompleteness: { type: Number, required: true },
  minMatchScore: { type: Number, required: true },
  capacities: { type: mongoose.Schema.Types.Mixed, default: {} },
  weights: { type: mongoose.Schema.Types.Mixed, default: {} },
  algorithmVersion: { type: String, required: true },
}, { timestamps: true });

const AllocationAudit = mongoose.model("AllocationAudit", allocationAuditSchema);
export default AllocationAudit;
