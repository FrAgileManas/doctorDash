import mongoose from "mongoose"

const reviewSchema = new mongoose.Schema({
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
    date: { type: Date, default: Date.now }
}, { _id: false }) // _id: false prevents Mongoose from creating an _id for this subdocument

const appointmentSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    docId: { type: String, required: true },
    slotDate: { type: String, required: true },
    slotTime: { type: String, required: true },
    userData: { type: Object, required: true },
    docData: { type: Object, required: true },
    amount: { type: Number, required: true },
    date: { type: Number, required: true },
    cancelled: { type: Boolean, default: false },
    payment: { type: Boolean, default: false },
    isCompleted: { type: Boolean, default: false },
    prescription: { type: String, default: "" },
    storageKey: { type: String, default: "" },
    transactionId: { type: String, default: "" },
    patientReview: { type: reviewSchema, default: undefined } // Optional field, no default object
})

const appointmentModel = mongoose.models.appointment || mongoose.model("appointment", appointmentSchema)
export default appointmentModel
