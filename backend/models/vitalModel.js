import mongoose from "mongoose";

const vitalSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['blood-pressure', 'heart-rate', 'blood-sugar', 'body-temperature', 'weight', 'oxygen-level']
    },
    primaryValue: {
        type: Number,
        required: true
    },
    secondaryValue: {
        type: Number,
        default: 0
    },
    date: {
        type: String,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    note: {
        type: String,
        default: ""
    }
}, { timestamps: true });
const vitalModel = mongoose.model("Vital", vitalSchema);
export { vitalModel };

export default mongoose.model("Vital", vitalSchema);
