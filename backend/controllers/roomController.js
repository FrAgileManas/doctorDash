import userModel from "../models/userModel.js";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/appointmentModel.js";

const DAILY_API_KEY = process.env.DAILY_API_KEY;
const getRoom = async (req, res) => { 
    const participantId = req.body.userId || req.body.docId;
    const appointmentId = req.params.appointmentId;

    const appointment = await appointmentModel.findById(appointmentId);
    if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
    }

    if (appointment.userId.toString() !== participantId && appointment.docId.toString() !== participantId) {
        return res.status(403).json({ message: "You are not authorized to access this room" });
    }

    console.log("getting room for appointment id", appointmentId);

    try {
        const response = await fetch(`https://api.daily.co/v1/rooms/${appointmentId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${DAILY_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.error) {
            console.log("Room not found, creating...");
            const newRoomData = await createRoom(appointmentId);
            return res.status(200).json({ message: "Created new room", room: newRoomData });
        } else {
            return res.status(200).json({ message: "Fetched existing room", room: data });
        }
    } catch (error) {
        console.error("Error fetching room details:", error);
        return res.status(500).json({ error: "Failed to fetch room details" });
    }
};



const createRoom = async (appointmentId) => {
    try {
        const response = await fetch(`https://api.daily.co/v1/rooms`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${DAILY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: appointmentId,
                properties: {
                    start_video_off: true,
                    start_audio_off: true,
                    exp: Math.floor(Date.now() / 1000) + 60 * 60 // Room expires in 1 hour
                }
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error("Room not created:", data.error);
            return null;
        }

        console.log("Room created successfully:", data);
        return data;
    } catch (error) {
        console.error("Error creating room:", error);
        return null;
    }
};


export { getRoom };