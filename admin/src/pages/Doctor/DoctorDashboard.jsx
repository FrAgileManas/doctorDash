import React from 'react'
import { useContext } from 'react'
import { useEffect, useState } from 'react'
import { DoctorContext } from '../../context/DoctorContext'
import { assets } from '../../assets/assets'
import { AppContext } from '../../context/AppContext'
import axios from 'axios'

const DoctorDashboard = () => {
  const { dToken, dashData, getDashData, cancelAppointment, completeAppointment } = useContext(DoctorContext)
  const { slotDateFormat, currency, backendUrl } = useContext(AppContext)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (dToken) {
      getDashData()
      fetchDoctorReviews()
    }
  }, [dToken])

  const fetchDoctorReviews = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`${backendUrl}/api/doctor/my-reviews`, {
        headers: { dtoken: dToken }
      })
      if (data.success) {
        setReviews(data.reviews)
      }
    } catch (error) {
      console.log(error)
    } finally {
      setLoading(false)
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

  // Calculate average rating
  const calculateAverageRating = () => {
    if (!reviews || reviews.length === 0) return 0
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0)
    return sum / reviews.length
  }

  // Format date for review display
  const formatReviewDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return dashData && (
    <div className='m-5'>
      <div className='flex flex-wrap gap-3'>
        <div className='flex items-center gap-2 bg-white p-4 min-w-52 rounded border-2 border-gray-100 cursor-pointer hover:scale-105 transition-all'>
          <img className='w-14' src={assets.earning_icon} alt="" />
          <div>
            <p className='text-xl font-semibold text-gray-600'>{currency} {dashData.earnings}</p>
            <p className='text-gray-400'>Earnings</p>
          </div>
        </div>
        <div className='flex items-center gap-2 bg-white p-4 min-w-52 rounded border-2 border-gray-100 cursor-pointer hover:scale-105 transition-all'>
          <img className='w-14' src={assets.appointments_icon} alt="" />
          <div>
            <p className='text-xl font-semibold text-gray-600'>{dashData.appointments}</p>
            <p className='text-gray-400'>Appointments</p>
          </div>
        </div>
        <div className='flex items-center gap-2 bg-white p-4 min-w-52 rounded border-2 border-gray-100 cursor-pointer hover:scale-105 transition-all'>
          <img className='w-14' src={assets.patients_icon} alt="" />
          <div>
            <p className='text-xl font-semibold text-gray-600'>{dashData.patients}</p>
            <p className='text-gray-400'>Patients</p>
          </div>
        </div>
        <div className='flex items-center gap-2 bg-white p-4 min-w-52 rounded border-2 border-gray-100 cursor-pointer hover:scale-105 transition-all'>
          <div className='w-14 h-14 flex items-center justify-center bg-yellow-100 rounded-full'>
            <span className='text-2xl text-yellow-500'>★</span>
          </div>
          <div>
            <p className='text-xl font-semibold text-gray-600'>{calculateAverageRating().toFixed(1)}</p>
            <p className='text-gray-400'>Avg Rating ({reviews.length})</p>
          </div>
        </div>
      </div>

      <div className='bg-white'>
        <div className='flex items-center gap-2.5 px-4 py-4 mt-10 rounded-t border'>
          <img src={assets.list_icon} alt="" />
          <p className='font-semibold'>Latest Bookings</p>
        </div>

        <div className='pt-4 border border-t-0'>
          {dashData.latestAppointments.slice(0, 5).map((item, index) => (
            <div className='flex items-center px-6 py-3 gap-3 hover:bg-gray-100' key={index}>
              <img className='rounded-full w-10' src={item.userData.image} alt="" />
              <div className='flex-1 text-sm'>
                <p className='text-gray-800 font-medium'>{item.userData.name}</p>
                <p className='text-gray-600 '>Booking on {slotDateFormat(item.slotDate)}</p>
              </div>
              {item.cancelled
                ? <p className='text-red-400 text-xs font-medium'>Cancelled</p>
                : item.isCompleted
                  ? <p className='text-green-500 text-xs font-medium'>Completed</p>
                  : <div className='flex'>
                    <img onClick={() => cancelAppointment(item._id)} className='w-10 cursor-pointer' src={assets.cancel_icon} alt="" />
                    <img onClick={() => completeAppointment(item._id)} className='w-10 cursor-pointer' src={assets.tick_icon} alt="" />
                  </div>
              }
            </div>
          ))}
        </div>
      </div>

      {/* Patient Reviews Section */}
      <div className='bg-white mt-10'>
        <div className='flex items-center gap-2.5 px-4 py-4 rounded-t border'>
          <span className='text-xl text-yellow-500'>★</span>
          <p className='font-semibold'>Patient Reviews</p>
          <span className='ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full'>
            {calculateAverageRating().toFixed(1)}/5
          </span>
        </div>

        <div className='pt-4 border border-t-0'>
          {loading ? (
            <div className='px-6 py-4 text-center text-gray-500'>Loading reviews...</div>
          ) : reviews.length > 0 ? (
            reviews.map((review, index) => (
              <div className='px-6 py-4 border-b' key={index}>
                <div className='flex items-start'>
                  <img 
                    src={review.userData.image || assets.user_placeholder} 
                    alt={review.userData.name} 
                    className='w-10 h-10 rounded-full mr-3'
                  />
                  <div className='flex-1'>
                    <div className='flex items-center justify-between'>
                      <p className='font-medium text-gray-800'>{review.userData.name}</p>
                      <p className='text-xs text-gray-500'>{formatReviewDate(review.date)}</p>
                    </div>
                    <div className='flex mt-1 text-sm'>
                      {renderStars(review.rating)}
                    </div>
                    <p className='mt-1 text-gray-600 text-sm'>{review.comment}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className='px-6 py-4 text-center text-gray-500'>No reviews yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DoctorDashboard