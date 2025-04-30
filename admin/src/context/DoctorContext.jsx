import { createContext, useState } from "react";
import axios from 'axios'
import { toast } from 'react-toastify'


export const DoctorContext = createContext()

const DoctorContextProvider = (props) => {

    const backendUrl = import.meta.env.VITE_BACKEND_URL

    const [dToken, setDToken] = useState(localStorage.getItem('dToken') ? localStorage.getItem('dToken') : '')
    const [appointments, setAppointments] = useState([])
    const [dashData, setDashData] = useState(false)
    const [profileData, setProfileData] = useState(false)
    const [patients, setPatients] = useState([])
    const [selectedPatient, setSelectedPatient] = useState(null)
    const [patientVitals, setPatientVitals] = useState([])
    const [patientAppointments, setPatientAppointments] = useState([])

    // Getting Doctor appointment data from Database using API
    const getAppointments = async () => {
        console.log('Getting appointments')
        try {
            const { data } = await axios.get(backendUrl + '/api/doctor/appointments', { headers: { dToken } })

            if (data.success) {
                setAppointments(data.appointments.reverse())
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }

    // Getting Doctor profile data from Database using API
    const getProfileData = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/doctor/profile', { headers: { dToken } })
            console.log(data.profileData)
            setProfileData(data.profileData)
        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }

    // Function to cancel doctor appointment using API
    const cancelAppointment = async (appointmentId) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/doctor/cancel-appointment', { appointmentId }, { headers: { dToken } })

            if (data.success) {
                toast.success(data.message)
                getAppointments()
                // after creating dashboard
                getDashData()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
            console.log(error)
        }
    }

    // Function to Mark appointment completed using API
    const completeAppointment = async (appointmentId) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/doctor/complete-appointment', { appointmentId }, { headers: { dToken } })

            if (data.success) {
                toast.success(data.message)
                getAppointments()
                // Later after creating getDashData Function
                getDashData()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
            console.log(error)
        }
    }

    // Getting Doctor dashboard data using API
    const getDashData = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/doctor/dashboard', { headers: { dToken } })

            if (data.success) {
                setDashData(data.dashData)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }

    // Getting doctor's patients data using API
    const getPatients = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/doctor/patients', { headers: { dToken } })

            if (data.success) {
                setPatients(data.patients)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }

    // Getting patient vitals using API
    const getPatientVitals = async (patientId) => {
        try {
            const { data } = await axios.get(`${backendUrl}/api/doctor/patient/${patientId}/vitals`, { headers: { dToken } })

            if (data.success) {
                setPatientVitals(data.vitals)
            } else {
                setPatientVitals([])
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message)
            setPatientVitals([])
        }
    }

    // Getting patient appointments history with doctor using API
    const getPatientAppointments = async (patientId) => {
        try {
            const { data } = await axios.get(`${backendUrl}/api/doctor/patient/${patientId}/appointments`, { headers: { dToken } })

            if (data.success) {
                setPatientAppointments(data.appointments)
            } else {
                setPatientAppointments([])
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message)
            setPatientAppointments([])
        }
    }

    // Load patient details when selected
    const loadPatientDetails = async (patient) => {
        setSelectedPatient(patient)
        await getPatientVitals(patient.userId)
        await getPatientAppointments(patient.userId)
    }

    const value = {
        dToken, setDToken, backendUrl,
        appointments,
        getAppointments,
        cancelAppointment,
        completeAppointment,
        dashData, getDashData,
        profileData, setProfileData,
        getProfileData,
        patients, getPatients,
        selectedPatient, setSelectedPatient,
        patientVitals, patientAppointments,
        loadPatientDetails
    }

    return (
        <DoctorContext.Provider value={value}>
            {props.children}
        </DoctorContext.Provider>
    )
}

export default DoctorContextProvider