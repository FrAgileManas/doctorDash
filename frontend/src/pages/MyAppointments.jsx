import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { assets } from '../assets/assets'

const MyAppointments = () => {

    const { backendUrl, token } = useContext(AppContext)
    const navigate = useNavigate()

    const [appointments, setAppointments] = useState([])
    const [payment, setPayment] = useState('')
    const [downloadingPrescription, setDownloadingPrescription] = useState(null)

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Function to format the date eg. ( 20_01_2000 => 20 Jan 2000 )
    const slotDateFormat = (slotDate) => {
        const dateArray = slotDate.split('_')
        return dateArray[0] + " " + months[Number(dateArray[1])] + " " + dateArray[2]
    }

    // Getting User Appointments Data Using API
    const getUserAppointments = async () => {
        try {

            const { data } = await axios.get(backendUrl + '/api/user/appointments', { headers: { token } })
            setAppointments(data.appointments.reverse())

        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }

    // Function to cancel appointment Using API
    const cancelAppointment = async (appointmentId) => {

        try {

            const { data } = await axios.post(backendUrl + '/api/user/cancel-appointment', { appointmentId }, { headers: { token } })

            if (data.success) {
                // Check if the appointment was Paid
                if (appointments.find(item => item._id === appointmentId).payment) {
                    // If paid, show refund message
                    toast.info("Appointment cancelled. Refund will be processed within 7-10 working days.")
                }
                toast.success(data.message)
                getUserAppointments()
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }

    }

    // Function to download prescription
    const downloadPrescription = async (appointment) => {
        if (!appointment.prescription) {
            toast.info("Prescription not available yet. Wait for 30 mins before contacting support.")
            return
        }

        try {
            setDownloadingPrescription(appointment._id)
            
            // Create an anchor element and set properties for download
            const link = document.createElement('a')
            link.href = appointment.prescription
            link.target = '_blank'
            link.download = `Prescription_${appointment.docData.name}_${slotDateFormat(appointment.slotDate)}.pdf`
            
            // Append to document, click and then remove
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            
            setDownloadingPrescription(null)
        } catch (error) {
            console.log(error)
            toast.error("Failed to download prescription. Please try again.")
            setDownloadingPrescription(null)
        }
    }

    const initPay = (order) => {
        if (!window.Razorpay) {
            toast.error('Razorpay SDK not loaded. Please refresh the page.');
            return;
        }
    
        const options = {
            key: import.meta.env.VITE_RAZORPAY_KEY_ID,
            amount: order.amount,
            currency: order.currency,
            name: 'Appointment Payment',
            description: "Appointment Payment",
            order_id: order.id,
            receipt: order.receipt,
            handler: async (response) => {
                try {
                    const { data } = await axios.post(
                        backendUrl + "/api/user/verifyRazorpay",
                        response,
                        { headers: { token } }
                    );
    
                    if (data.success) {
                        toast.success("Payment successful");
                        navigate('/my-appointments');
                        getUserAppointments();
                    } else {
                        toast.error(data.message || "Payment verification failed");
                    }
                } catch (error) {
                    console.log(error);
                    toast.error(error.response?.data?.message || error.message);
                }
            },
            theme: {
                color: "#3399cc"
            }
        };
    
        const rzp = new window.Razorpay(options);
        rzp.open();
    
        rzp.on('payment.failed', function (response) {
            console.error('Payment failed:', response.error);
            toast.error('Payment failed. Please try again.');
        });
    };
    
    const appointmentRazorpay = async (appointmentId) => {
        try {
            const { data } = await axios.post(
                backendUrl + '/api/user/payment-razorpay',
                { appointmentId },
                { headers: { token } }
            );
    
            if (data.success) {
                initPay(data.order);
            } else {
                toast.error(data.message || "Failed to initiate payment");
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || error.message);
        }
    };
    
    // Function to make payment using stripe
    const appointmentStripe = async (appointmentId) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/user/payment-stripe', { appointmentId }, { headers: { token } })
            if (data.success) {
                const { session_url } = data
                window.location.replace(session_url)
            }else{
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }

    useEffect(() => {
        if (token) {
            getUserAppointments()
        }
    }, [token])

    return (
        <div>
            <p className='pb-3 mt-12 text-lg font-medium text-gray-600 border-b'>My appointments</p>
            <div className=''>
                {appointments.map((item, index) => (
                    <div key={index} className='grid grid-cols-[1fr_2fr] gap-4 sm:flex sm:gap-6 py-4 border-b'>
                        <div>
                            <img className='w-36 bg-[#EAEFFF]' src={item.docData.image} alt="" />
                        </div>
                        <div className='flex-1 text-sm text-[#5E5E5E]'>
                            <p className='text-[#262626] text-base font-semibold'>{item.docData.name}</p>
                            <p>{item.docData.speciality}</p>
                            <p className='text-[#464646] font-medium mt-1'>Address:</p>
                            <p className=''>{item.docData.address.line1}</p>
                            <p className=''>{item.docData.address.line2}</p>
                            <p className=' mt-1'><span className='text-sm text-[#3C3C3C] font-medium'>Date & Time:</span> {slotDateFormat(item.slotDate)} |  {item.slotTime}</p>
                        </div>
                        <div></div>
                        <div className='flex flex-col gap-2 justify-end text-sm text-center'>
                            {/* Download Prescription Button for completed appointments */}
                            {item.isCompleted && (
                                <button 
                                    onClick={() => downloadPrescription(item)} 
                                    className='sm:min-w-48 py-2 border border-primary rounded text-primary hover:bg-primary hover:text-white transition-all duration-300 flex items-center justify-center'
                                    disabled={downloadingPrescription === item._id}
                                >
                                    {downloadingPrescription === item._id ? (
                                        'Downloading...'
                                    ) : (
                                        <span className='flex items-center gap-1'>
                                            Download Prescription
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                        </span>
                                    )}
                                </button>
                            )}
                            
                            {!item.cancelled && !item.payment && !item.isCompleted && payment !== item._id && <button onClick={() => setPayment(item._id)} className='text-[#696969] sm:min-w-48 py-2 border rounded hover:bg-primary hover:text-white transition-all duration-300'>Pay Online</button>}
                            {/* {!item.cancelled && !item.payment && !item.isCompleted && payment === item._id && <button onClick={() => appointmentStripe(item._id)} className='text-[#696969] sm:min-w-48 py-2 border rounded hover:bg-gray-100 hover:text-white transition-all duration-300 flex items-center justify-center'><img className='max-w-20 max-h-5' src={assets.stripe_logo} alt="" /></button>} */}
                            {!item.cancelled && !item.payment && !item.isCompleted && payment === item._id && <button onClick={() => appointmentRazorpay(item._id)} className='text-[#696969] sm:min-w-48 py-2 border rounded hover:bg-gray-100 hover:text-white transition-all duration-300 flex items-center justify-center'><img className='max-w-20 max-h-5' src={assets.razorpay_logo} alt="" /></button>}
                            {!item.cancelled && item.payment && !item.isCompleted && <button className='sm:min-w-48 py-2 border rounded text-[#696969]  bg-[#EAEFFF]'>Paid</button>}

                            {item.isCompleted && <button className='sm:min-w-48 py-2 border border-green-500 rounded text-green-500'>Completed</button>}

                            {!item.cancelled && !item.isCompleted && <button onClick={() => cancelAppointment(item._id)} className='text-[#696969] sm:min-w-48 py-2 border rounded hover:bg-red-600 hover:text-white transition-all duration-300'>Cancel appointment</button>}
                            {item.cancelled && !item.isCompleted && <button className='sm:min-w-48 py-2 border border-red-500 rounded text-red-500'>Appointment cancelled</button>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default MyAppointments