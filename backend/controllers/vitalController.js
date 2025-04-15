import vitalModel from "../models/vitalModel.js";

// API to add new vital
const addVital = async (req, res) => {
    try {
        const { userId, type, primaryValue, secondaryValue, date, time, note } = req.body;

        // Validate required fields
        if (!type || !primaryValue || !date || !time) {
            return res.json({ success: false, message: 'Missing required fields' });
        }

        
        const vitalData = {
            userId,
            type,
            primaryValue,
            secondaryValue: secondaryValue || 0,
            date,
            time,
            note: note || ""
        };

        const newVital = new vitalModel(vitalData);
        await newVital.save();

        res.json({ success: true, message: 'Vital added successfully', vital: newVital });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API to get vitals by date
const getVitalsByDate = async (req, res) => {
    try {
        const { userId } = req.body;
        const { date } = req.query;

        if (!date) {
            return res.json({ success: false, message: 'Date is required' });
        }

        const vitals = await vitalModel.find({ 
            userId, 
            date 
        }).sort({ time: 1 });

        res.json({ success: true, vitals });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API to update vital
const updateVital = async (req, res) => {
    try {
        const { userId } = req.body;
        const vitalId = req.params.id;
        const { type, primaryValue, secondaryValue, date, time, note } = req.body;

        // Check if vital exists and belongs to user
        const vital = await vitalModel.findById(vitalId);
        
        if (!vital) {
            return res.json({ success: false, message: 'Vital not found' });
        }

        if (vital.userId !== userId) {
            return res.json({ success: false, message: 'Unauthorized access' });
        }

        // Update vital
        const updatedVital = await vitalModel.findByIdAndUpdate(
            vitalId,
            {
                type,
                primaryValue,
                secondaryValue: secondaryValue || 0,
                date,
                time,
                note: note || ""
            },
            { new: true }
        );

        res.json({ success: true, message: 'Vital updated successfully', vital: updatedVital });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API to delete vital
const deleteVital = async (req, res) => {
    try {
        const { userId } = req.body;
        const vitalId = req.params.id;

        // Check if vital exists and belongs to user
        const vital = await vitalModel.findById(vitalId);
        
        if (!vital) {
            return res.json({ success: false, message: 'Vital not found' });
        }

        if (vital.userId !== userId) {
            return res.json({ success: false, message: 'Unauthorized access' });
        }

        // Delete vital
        await vitalModel.findByIdAndDelete(vitalId);

        res.json({ success: true, message: 'Vital deleted successfully' });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// API to get all vitals for a user
const getAllVitals = async (req, res) => {
    try {
      const userId = req.user.id;
        console.log(userId);
      const vitals = await vitalModel.find({ userId }).sort({ date: -1, time: -1 });
  
      res.json({ success: true, vitals });
    } catch (error) {
      console.log(error);
      res.json({ success: false, message: error.message });
    }
  };
  

export {
    addVital,
    getVitalsByDate,
    updateVital,
    deleteVital,
    getAllVitals
};