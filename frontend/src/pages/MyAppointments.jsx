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
    const [downloadingPrescription, setDownloadingPrescription] = useState(null)
    const [reviewModalOpen, setReviewModalOpen] = useState(false)
    const [selectedAppointment, setSelectedAppointment] = useState(null)
    const [reviewData, setReviewData] = useState({
        rating: 5,
        comment: ''
    })

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Function to format the date eg. ( 20_01_2000 => 20 Jan 2000 )
    const slotDateFormat = (slotDate) => {
        if (!slotDate) return "N/A";
        try {
            const dateArray = slotDate.split('_')
            return dateArray[0] + " " + months[Number(dateArray[1])] + " " + dateArray[2]
        } catch (error) {
            console.log("Error formatting date:", error);
            return slotDate; // Return the original string if there's an error
        }
    }

    // Getting User Appointments Data Using API
    const getUserAppointments = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/user/appointments', { headers: { token } })
            // console.log("Fetched appointments:", data.appointments)
            // Deep copy the appointments data to avoid reference issues
            const appointmentsData = JSON.parse(JSON.stringify(data.appointments.reverse()));
            
            // Validate the appointments data
            const validatedAppointments = appointmentsData.map(appointment => {
                // Ensure docData exists
                if (!appointment.docData) {
                    appointment.docData = {
                        name: "Doctor information unavailable",
                        speciality: "",
                        address: { line1: "", line2: "" },
                        image: ""
                    };
                }
                
                // Ensure address exists
                if (!appointment.docData.address) {
                    appointment.docData.address = { line1: "", line2: "" };
                }
                
                return appointment;
            });
            
            setAppointments(validatedAppointments);
        } catch (error) {
            console.log(error)
            toast.error(error.message || "Failed to fetch appointments")
        }
    }

    // Function to cancel appointment Using API
    const cancelAppointment = async (appointmentId) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/user/cancel-appointment', { appointmentId }, { headers: { token } })

            if (data.success) {
                // Check if the appointment was Paid
                const appointment = appointments.find(item => item._id === appointmentId);
                if (appointment && appointment.payment) {
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
            toast.error(error.message || "Failed to cancel appointment")
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
            
            // Ensure docData exists before using it
            const docName = appointment.docData ? appointment.docData.name : "Doctor";
            link.download = `Prescription_${docName}_${slotDateFormat(appointment.slotDate)}.pdf`
            
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

    // Function to open review modal and set appointment
    const openReviewModal = (appointment) => {
        setSelectedAppointment(appointment)
        
        // If there's an existing review, populate the form with it
        if (appointment.patientReview) {
            setReviewData({
                rating: appointment.patientReview.rating,
                comment: appointment.patientReview.comment
            })
        } else {
            // Reset form for new review
            setReviewData({
                rating: 5,
                comment: ''
            })
        }
        
        setReviewModalOpen(true)
    }

    // Function to handle rating change
    const handleRatingChange = (newRating) => {
        setReviewData(prev => ({
            ...prev,
            rating: newRating
        }))
    }

    // Function to handle comment change
    const handleCommentChange = (e) => {
        setReviewData(prev => ({
            ...prev,
            comment: e.target.value
        }))
    }

    // Function to submit review
    const submitReview = async (e) => {
        e.preventDefault()
        
        try {
            const { data } = await axios.post(
                backendUrl + '/api/user/add-review',
                {
                    appointmentId: selectedAppointment._id,
                    rating: reviewData.rating,
                    comment: reviewData.comment
                },
                { headers: { token } }
            )

            if (data.success) {
                toast.success(data.message)
                setReviewModalOpen(false)
                getUserAppointments()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message || "Failed to submit review")
        }
    }

    // Function to delete review
    const deleteReview = async (appointmentId) => {
        try {
            const { data } = await axios.post(
                backendUrl + '/api/user/delete-review',
                { appointmentId },
                { headers: { token } }
            )

            if (data.success) {
                toast.success(data.message)
                getUserAppointments()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message || "Failed to delete review")
        }
    }

    // Star Rating Component
    const StarRating = ({ rating, editable = false, onRatingChange }) => {
        return (
            <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                        key={star}
                        onClick={editable ? () => onRatingChange(star) : undefined}
                        className={`w-6 h-6 ${editable ? 'cursor-pointer' : ''} ${
                            star <= rating ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                    >
                        <path
                            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                        />
                    </svg>
                ))}
            </div>
        )
    }

    useEffect(() => {
        if (token) {
            getUserAppointments()
        }
    }, [token])

    // console.log("Rendering appointments:", appointments)


    const resendConfirmation = async (selectedAppointment) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/user/resend-confirmation', { appointmentId: selectedAppointment._id }, { headers: { token } })
            if (data.success) {
                toast.success(data.message)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message || "Failed to resend confirmation")
        }
    }
    const handleJoinRoom = (item) => {
        // Parse the slot date and time
        const [day, month, year] = item.slotDate.split('_').map(num => parseInt(num));
        const timeStr = item.slotTime;
        
        // Convert the time string (e.g., "06:00 PM") to 24-hour format
        let [hourMin, ampm] = timeStr.split(' ');
        let [hours, minutes] = hourMin.split(':').map(num => parseInt(num));
        
        // Convert to 24-hour format
        if (ampm === 'PM' && hours < 12) {
          hours += 12;
        } else if (ampm === 'AM' && hours === 12) {
          hours = 0;
        }
        
        // Create appointment DateTime object with the full date
        const appointmentTime = new Date(year, month , day, hours, minutes);
        
        // Calculate 5 minutes before and 1 hour after
        const fiveMinBefore = new Date(appointmentTime.getTime() - 5 * 60 * 1000);
        const oneHourAfter = new Date(appointmentTime.getTime() + 60 * 60 * 1000);
      
        
        // Get current time
        const currentTime = new Date();
       
        // Check if current time is within the allowed window
        if (currentTime < fiveMinBefore) {
            console.log("Appointment not available yet");
          toast.info(`This appointment will be available 5 minutes before the scheduled time (${item.slotTime})`);
          return;
        } else if (currentTime > oneHourAfter) {
          toast.error('This appointment has expired');
          return;
        }
        
        // If we're within the valid time window, navigate to the room
        navigate(`/room/${item._id}`);
      };

      const cancelHandler = (item) => {
        // Parse the slot date and time
        const [day, month, year] = item.slotDate.split('_').map(num => parseInt(num));
        const timeStr = item.slotTime;
        
        // Convert the time string (e.g., "06:00 PM") to 24-hour format
        let [hourMin, ampm] = timeStr.split(' ');
        let [hours, minutes] = hourMin.split(':').map(num => parseInt(num));
        
        // Convert to 24-hour format
        if (ampm === 'PM' && hours < 12) {
          hours += 12;
        } else if (ampm === 'AM' && hours === 12) {
          hours = 0;
        }
        
        // Create appointment DateTime object
        const appointmentTime = new Date(year, month, day, hours, minutes);
        
        // Calculate 6 hours before and 1 hour after
        const sixHoursBefore = new Date(appointmentTime.getTime() - 6 * 60 * 60 * 1000);
        const oneHourAfter = new Date(appointmentTime.getTime() + 60 * 60 * 1000);
        
        // Get current time
        const currentTime = new Date();
        
        // Check if appointment is missed (more than 1 hour has passed)
        if (currentTime > oneHourAfter) {
          // Navigate to reschedule page
          navigate(`/appointment/${item.docId}`);
          return;
        }
        
        // Check if less than 6 hours are left before appointment
        if (currentTime > sixHoursBefore) {
          toast.error('Cannot cancel appointments less than 6 hours before the scheduled time');
          return;
        }
        
        // If we're more than 6 hours before, proceed with cancellation
        cancelAppointment(item._id);
      };
    return (
        <div className="relative">
            <p className='pb-3 mt-12 text-lg font-medium text-gray-600 border-b'>My appointments</p>
            <div className=''>
                {appointments && appointments.length > 0 ? (
                    appointments.map((item, index) => (
                        <div key={index} className='grid grid-cols-[1fr_2fr] gap-4 sm:flex sm:gap-6 py-4 border-b'>
                            <div>
                                <img className='w-36 bg-[#EAEFFF]' src={item.docData?.image || assets.user_placeholder} alt="" />
                            </div>
                            <div className='flex-1 text-sm text-[#5E5E5E]'>
                                <p className='text-[#262626] text-base font-semibold'>{item.docData?.name || "Doctor information unavailable"}</p>
                                <p>{item.docData?.speciality || ""}</p>
                                <p className='text-[#464646] font-medium mt-1'>Address:</p>
                                <p className=''>{item.docData?.address?.line1 || ""}</p>
                                <p className=''>{item.docData?.address?.line2 || ""}</p>
                                <p className=' mt-1'>
                                    <span className='text-sm text-[#3C3C3C] font-medium'>Date & Time:</span> 
                                    {item.slotDate ? slotDateFormat(item.slotDate) : "N/A"} | {item.slotTime || "N/A"}
                                </p>
                                
                                {/* Review Section */}
                                {item.isCompleted && item.patientReview && (
                                    <div className="mt-3 p-2 bg-gray-50 rounded">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-gray-700">Your Review</p>
                                            <div className="flex space-x-2">
                                                <button 
                                                    onClick={() => openReviewModal(item)}
                                                    className="text-xs text-blue-600 hover:text-blue-800"
                                                >
                                                    Edit
                                                </button>
                                                <button 
                                                    onClick={() => deleteReview(item._id)}
                                                    className="text-xs text-red-600 hover:text-red-800"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                        <div className="mt-1">
                                            <StarRating rating={item.patientReview.rating} />
                                            <p className="mt-1 text-sm">{item.patientReview.comment}</p>
                                        </div>
                                    </div>
                                )}
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
                                
                                {/* Review Button for completed appointments */}
                                {item.isCompleted && !item.patientReview && (
                                    <button 
                                        onClick={() => openReviewModal(item)}
                                        className='sm:min-w-48 py-2 border border-yellow-500 rounded text-yellow-500 hover:bg-yellow-500 hover:text-white transition-all duration-300'
                                    >
                                        Add Review
                                    </button>
                                )}
                                
                                {!item.cancelled && item.payment && !item.isCompleted && (
                                    <button onClick={()=>resendConfirmation(item)} className='sm:min-w-48 py-2 border rounded text-[#696969] bg-[#EAEFFF]'>
                                        Resend confirmation
                                    </button>
                                )}

                                {item.isCompleted && (
                                    <button className='sm:min-w-48 py-2 border border-green-500 rounded text-green-500'>
                                        Completed
                                    </button>
                                )}

                                {!item.cancelled && !item.isCompleted && (<>
                                    <button 
  onClick={() => cancelHandler(item)} 
  className='text-[#696969] sm:min-w-48 py-2 border rounded hover:bg-red-600 hover:text-white transition-all duration-300'
>
  {new Date() > new Date(
    ...item.slotDate.split('_').map(num => parseInt(num)).reverse(),  // Convert DD_MM_YYYY to [YYYY, MM-1, DD]
    ...(() => {
      let [hourMin, ampm] = item.slotTime.split(' ');
      let [hours, minutes] = hourMin.split(':').map(num => parseInt(num));
      if (ampm === 'PM' && hours < 12) hours += 12;
      else if (ampm === 'AM' && hours === 12) hours = 0;
      return [hours, minutes];
    })()
  ).getTime() + 60 * 60 * 1000 ? 'Reschedule' : 'Cancel appointment'}
</button>
                                    <button 
  onClick={() => handleJoinRoom(item)} 
  className='text-[#696969] sm:min-w-48 py-2 border rounded hover:bg-green-600 hover:text-white transition-all duration-300'
>
  Join now
</button></>
                                )}
                                
                                {item.cancelled && !item.isCompleted && (
                                    <button className='sm:min-w-48 py-2 border border-red-500 rounded text-red-500'>
                                        Appointment cancelled
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="py-10 text-center">
                        <p className="text-gray-500">No appointments found. Book your first appointment now!</p>
                    </div>
                )}
            </div>

            {/* Review Modal */}
            {reviewModalOpen && selectedAppointment && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium">
                                {selectedAppointment.patientReview ? 'Edit Review' : 'Add Review'}
                            </h3>
                            <button 
                                onClick={() => setReviewModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                        
                        <form onSubmit={submitReview}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Doctor: {selectedAppointment.docData?.name || "Doctor"}
                                </label>
                                <div className="mb-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Rating
                                    </label>
                                    <StarRating 
                                        rating={reviewData.rating} 
                                        editable={true} 
                                        onRatingChange={handleRatingChange}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Your Review
                                    </label>
                                    <textarea
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        rows="4"
                                        value={reviewData.comment}
                                        onChange={handleCommentChange}
                                        placeholder="Share your experience with the doctor..."
                                        required
                                    ></textarea>
                                </div>
                            </div>
                            
                            <div className="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    onClick={() => setReviewModalOpen(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-primary border border-transparent rounded-md text-white hover:bg-primary-dark"
                                >
                                    {selectedAppointment.patientReview ? 'Update Review' : 'Submit Review'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default MyAppointments