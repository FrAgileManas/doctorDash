import React, { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import { assets } from '../assets/assets'
import RelatedDoctors from '../components/RelatedDoctors'
import axios from 'axios'
import { toast } from 'react-toastify'

const Appointment = () => {
    const { docId } = useParams()
    const { doctors, currencySymbol, backendUrl, token, getDoctosData } = useContext(AppContext)
    const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

    const [docInfo, setDocInfo] = useState(false)
    const [docSlots, setDocSlots] = useState([])
    const [slotIndex, setSlotIndex] = useState(0)
    const [slotTime, setSlotTime] = useState('')
    const [holdId, setHoldId] = useState(null)
    const [paymentStep, setPaymentStep] = useState(false)
    const [reviews, setReviews] = useState([])
    const [loading, setLoading] = useState(false)
    const [processingPayment, setProcessingPayment] = useState(false)

    const navigate = useNavigate()

    const fetchDocInfo = async () => {
        const docInfo = doctors.find((doc) => doc._id === docId)
        setDocInfo(docInfo)
    }

    const fetchDoctorReviews = async () => {
        setLoading(true)
        try {
            const { data } = await axios.get(`${backendUrl}/api/doctor/reviews/${docId}`)
            if (data.success) {
                setReviews(data.reviews)
            }
        } catch (error) {
            console.log(error)
        } finally {
            setLoading(false)
        }
    }

    const getAvailableSolts = async () => {
        setDocSlots([])

        // getting current date
        let today = new Date()

        for (let i = 0; i < 7; i++) {

            // getting date with index 
            let currentDate = new Date(today)
            currentDate.setDate(today.getDate() + i)

            // setting end time of the date with index
            let endTime = new Date()
            endTime.setDate(today.getDate() + i)
            endTime.setHours(21, 0, 0, 0)

            // setting hours 
            if (today.getDate() === currentDate.getDate()) {
                currentDate.setHours(currentDate.getHours() > 10 ? currentDate.getHours() + 1 : 10)
                currentDate.setMinutes(currentDate.getMinutes() > 30 ? 30 : 0)
            } else {
                currentDate.setHours(10)
                currentDate.setMinutes(0)
            }

            let timeSlots = [];

            while (currentDate < endTime) {
                let formattedTime = currentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                let day = currentDate.getDate()
                let month = currentDate.getMonth() 
                let year = currentDate.getFullYear()

                const slotDate = day + "_" + month + "_" + year
                const slotTime = formattedTime

                const isSlotAvailable = docInfo.slots_booked[slotDate] && docInfo.slots_booked[slotDate].includes(slotTime) ? false : true

                // Also check if slot is on hold
                const slotsOnHold = docInfo.slots_on_hold || {}
                const isSlotOnHold = slotsOnHold[slotDate] && slotsOnHold[slotDate][slotTime]

                if (isSlotAvailable && !isSlotOnHold) {
                    // Add slot to array
                    timeSlots.push({
                        datetime: new Date(currentDate),
                        time: formattedTime
                    })
                }

                // Increment current time by 30 minutes
                currentDate.setMinutes(currentDate.getMinutes() + 30);
            }

            setDocSlots(prev => ([...prev, timeSlots]))
        }
    }

    const holdSlot = async () => {
        if (!token) {
            toast.warning('Login to book appointment')
            return navigate('/login')
        }

        if (!slotTime) {
            toast.warning('Please select a time slot')
            return
        }

        const date = docSlots[slotIndex][0].datetime

        let day = date.getDate()
        let month = date.getMonth()
        let year = date.getFullYear()

        const slotDate = day + "_" + month + "_" + year

        try {
            const { data } = await axios.post(
                backendUrl + '/api/user/hold-slot', 
                { docId, slotDate, slotTime }, 
                { headers: { token } }
            )
            
            if (data.success) {
                setHoldId(data.holdId)
                setPaymentStep(true)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }

    const releaseHeldSlot = async () => {
        if (!holdId) return
        
        try {
            await axios.post(
                backendUrl + '/api/user/release-slot',
                { holdId },
                { headers: { token } }
            )
        } catch (error) {
            console.log(error)
        }
        
        setHoldId(null)
        setPaymentStep(false)
    }

    const finalizeBooking = async () => {
        try {
            const { data } = await axios.post(
                backendUrl + '/api/user/finalize-booking',
                { holdId },
                { headers: { token } }
            )
            
            if (data.success) {
                toast.success(data.message)
                getDoctosData()
                navigate('/my-appointments')
            } else {
                toast.error(data.message)
                // Refresh slots if booking failed
                getAvailableSolts()
                setPaymentStep(false)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message)
            setPaymentStep(false)
        }
    }

    const handlePaymentRazorpay = async () => {
        if (!holdId) {
            toast.error('Selected slot is no longer available')
            return
        }
        
        setProcessingPayment(true)
        
        try {
            const { data } = await axios.post(
                backendUrl + '/api/user/payment-razorpay',
                { holdId, docId },
                { headers: { token } }
            )
            
            if (data.success) {
                initRazorpayPayment(data.order)
            } else {
                toast.error(data.message || "Failed to initiate payment")
                releaseHeldSlot()
            }
        } catch (error) {
            console.error(error)
            toast.error(error.response?.data?.message || error.message)
            releaseHeldSlot()
        } finally {
            setProcessingPayment(false)
        }
    }

    const initRazorpayPayment = (order) => {
        if (!window.Razorpay) {
            toast.error('Razorpay SDK not loaded. Please refresh the page.')
            return
        }
     
        const options = {
            key: import.meta.env.VITE_RAZORPAY_KEY_ID,
            amount: order.amount,
            currency: order.currency,
            name: 'Appointment Payment',
            description: "Appointment Payment",
            order_id: order.id,
            handler: async (response) => {
                try {
                    const { data } = await axios.post(
                        backendUrl + "/api/user/verify-razorpay",
                        { ...response, holdId },
                        { headers: { token } }
                    )
     
                    if (data.success) {
                        finalizeBooking()
                    } else {
                        toast.error(data.message || "Payment verification failed")
                        releaseHeldSlot()
                    }
                } catch (error) {
                    console.log(error)
                    toast.error(error.response?.data?.message || error.message)
                    releaseHeldSlot()
                }
            },
            modal: {
                ondismiss: function() {
                    releaseHeldSlot()
                }
            },
            theme: {
                color: "#3399cc"
            }
        }
     
        const rzp = new window.Razorpay(options)
        rzp.open()
     
        rzp.on('payment.failed', function (response) {
            console.error('Payment failed:', response.error)
            toast.error('Payment failed. Please try again.')
            releaseHeldSlot()
        })
    }

    const handlePaymentStripe = async () => {
        if (!holdId) {
            toast.error('Selected slot is no longer available')
            return
        }
        
        setProcessingPayment(true)
        
        try {
            const { data } = await axios.post(
                backendUrl + '/api/user/payment-stripe',
                { holdId, docId },
                { headers: { token } }
            )
            
            if (data.success && data.session_url) {
                window.location.href = data.session_url
            } else {
                toast.error(data.message || "Failed to initiate payment")
                releaseHeldSlot()
            }
        } catch (error) {
            console.error(error)
            toast.error(error.response?.data?.message || error.message)
            releaseHeldSlot()
        } finally {
            setProcessingPayment(false)
        }
    }

    // Helper function to render star rating
    const renderStars = (rating) => {
        const stars = []
        for (let i = 1; i <= 5; i++) {
            if (i <= Math.floor(rating)) {
                // Full star
                stars.push(<span key={i} className="text-yellow-400">★</span>)
            } else if (i === Math.ceil(rating) && !Number.isInteger(rating)) {
                // Half star
                stars.push(<span key={i} className="text-yellow-400">★</span>)
            } else {
                // Empty star
                stars.push(<span key={i} className="text-gray-300">★</span>)
            }
        }
        return stars
    }

    // Format date for review display
    const formatReviewDate = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    }

    // Calculate average rating
    const calculateAverageRating = () => {
        if (!reviews || reviews.length === 0) return 0
        const sum = reviews.reduce((acc, review) => acc + review.rating, 0)
        return sum / reviews.length
    }

    useEffect(() => {
        if (doctors.length > 0) {
            fetchDocInfo()
        }
        
        // Cleanup function to release held slot if component unmounts
        return () => {
            if (holdId) {
                releaseHeldSlot()
            }
        }
    }, [doctors, docId])

    useEffect(() => {
        if (docInfo) {
            getAvailableSolts()
            fetchDoctorReviews()
        }
    }, [docInfo])

    return docInfo ? (
        <div>
            {/* ---------- Doctor Details ----------- */}
            <div className='flex flex-col sm:flex-row gap-4'>
                <div>
                    <img className='bg-primary w-full sm:max-w-72 rounded-lg' src={docInfo.image} alt="" />
                </div>

                <div className='flex-1 border border-[#ADADAD] rounded-lg p-8 py-7 bg-white mx-2 sm:mx-0 mt-[-80px] sm:mt-0'>
                    {/* ----- Doc Info : name, degree, experience ----- */}
                    <p className='flex items-center gap-2 text-3xl font-medium text-gray-700'>{docInfo.name} <img className='w-5' src={assets.verified_icon} alt="" /></p>
                    <div className='flex items-center gap-2 mt-1 text-gray-600'>
                        <p>{docInfo.degree} - {docInfo.speciality}</p>
                        <button className='py-0.5 px-2 border text-xs rounded-full'>{docInfo.experience}</button>
                    </div>

                    {/* Rating summary */}
                    <div className='flex items-center mt-3'>
                        <div className='flex text-xl mr-2'>
                            {renderStars(calculateAverageRating())}
                        </div>
                        <span className='text-gray-700 font-medium'>
                            {calculateAverageRating().toFixed(1)}
                        </span>
                        <span className='text-gray-500 ml-1'>
                            ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
                        </span>
                    </div>

                    {/* ----- Doc About ----- */}
                    <div>
                        <p className='flex items-center gap-1 text-sm font-medium text-[#262626] mt-3'>About <img className='w-3' src={assets.info_icon} alt="" /></p>
                        <p className='text-sm text-gray-600 max-w-[700px] mt-1'>{docInfo.about}</p>
                    </div>

                    <p className='text-gray-600 font-medium mt-4'>Appointment fee: <span className='text-gray-800'>{currencySymbol}{docInfo.fees}</span> </p>
                </div>
            </div>

            {!paymentStep ? (
                /* Booking slots */
                <div className='sm:ml-72 sm:pl-4 mt-8 font-medium text-[#565656]'>
                    <p>Select appointment date and time</p>
                    <div className='flex gap-3 items-center w-full overflow-x-scroll mt-4'>
                        {docSlots.length && docSlots.map((item, index) => (
                            <div onClick={() => {
                                setSlotIndex(index)
                                setSlotTime('')
                            }} key={index} className={`text-center py-6 min-w-16 rounded-full cursor-pointer ${slotIndex === index ? 'bg-primary text-white' : 'border border-[#DDDDDD]'}`}>
                                <p>{item[0] && daysOfWeek[item[0].datetime.getDay()]}</p>
                                <p>{item[0] && item[0].datetime.getDate()}</p>
                            </div>
                        ))}
                    </div>

                    <div className='flex items-center gap-3 w-full overflow-x-scroll mt-4'>
                        {docSlots.length && docSlots[slotIndex].map((item, index) => (
                            <p onClick={() => setSlotTime(item.time)} key={index} className={`text-sm font-light flex-shrink-0 px-5 py-2 rounded-full cursor-pointer ${item.time === slotTime ? 'bg-primary text-white' : 'text-[#949494] border border-[#B4B4B4]'}`}>{item.time.toLowerCase()}</p>
                        ))}
                    </div>

                    <button 
                        onClick={holdSlot} 
                        disabled={!slotTime}
                        className={`text-white text-sm font-light px-20 py-3 rounded-full mt-6 ${!slotTime ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-dark'}`}
                    >
                        Proceed to Payment
                    </button>
                </div>
            ) : (
                /* Payment options */
                <div className='sm:ml-72 sm:pl-4 mt-8 font-medium text-[#565656]'>
                    <div className='bg-white p-6 border border-gray-200 rounded-lg'>
                        <h3 className='text-xl font-medium text-gray-700 mb-4'>Appointment Summary</h3>
                        
                        <div className='space-y-2 mb-6'>
                            <div className='flex justify-between'>
                                <span className='text-gray-600'>Doctor:</span>
                                <span className='font-medium'>{docInfo.name}</span>
                            </div>
                            <div className='flex justify-between'>
                                <span className='text-gray-600'>Date:</span>
                                <span className='font-medium'>
                                    {docSlots[slotIndex][0] && new Date(docSlots[slotIndex][0].datetime)
                                        .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                            </div>
                            <div className='flex justify-between'>
                                <span className='text-gray-600'>Time:</span>
                                <span className='font-medium'>{slotTime}</span>
                            </div>
                            <div className='flex justify-between border-t pt-2 mt-2'>
                                <span className='text-gray-600'>Amount:</span>
                                <span className='font-medium'>{currencySymbol}{docInfo.fees}</span>
                            </div>
                        </div>
                        
                        <p className='text-gray-700 mb-4'>Select Payment Method:</p>
                        
                        <div className='space-y-3'>
                            <button 
                                onClick={handlePaymentRazorpay}
                                disabled={processingPayment}
                                className='w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 flex justify-center items-center'
                            >
                                {processingPayment ? 'Processing...' : 'Pay with Razorpay'}
                            </button>
                            
                            {/* <button 
                                onClick={handlePaymentStripe}
                                disabled={processingPayment}
                                className='w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 flex justify-center items-center'
                            >
                                {processingPayment ? 'Processing...' : 'Pay with Stripe'}
                            </button> */}
                        </div>
                        
                        <button 
                            onClick={releaseHeldSlot}
                            className='w-full text-gray-600 mt-4 hover:underline'
                        >
                            Cancel and select different time
                        </button>
                    </div>
                </div>
            )}

            {/* Patient Reviews Section */}
            <div className='mt-10 mb-12'>
                <h3 className='text-xl font-medium text-gray-700 mb-4'>Patient Reviews</h3>
                
                {loading ? (
                    <p className='text-gray-500'>Loading reviews...</p>
                ) : reviews.length > 0 ? (
                    <div className='space-y-6'>
                        {reviews.map((review, index) => (
                            <div key={index} className='border border-gray-200 rounded-lg p-4 bg-white'>
                                <div className='flex items-start'>
                                    <img 
                                        src={review.userData.image || assets.user_placeholder} 
                                        alt={review.userData.name} 
                                        className='w-12 h-12 rounded-full mr-4'
                                    />
                                    <div className='flex-1'>
                                        <div className='flex items-center justify-between'>
                                            <p className='font-medium text-gray-800'>{review.userData.name}</p>
                                            <p className='text-sm text-gray-500'>{formatReviewDate(review.date)}</p>
                                        </div>
                                        <div className='flex mt-1'>
                                            {renderStars(review.rating)}
                                        </div>
                                        <p className='mt-2 text-gray-600'>{review.comment}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className='text-gray-500'>No reviews yet.</p>
                )}
            </div>

            {/* Listing Related Doctors */}
            <RelatedDoctors speciality={docInfo.speciality} docId={docId} />
        </div>
    ) : null
}

export default Appointment