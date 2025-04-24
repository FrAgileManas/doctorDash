import React, { useContext, useEffect, useState, useRef } from 'react'
import { DoctorContext } from '../../context/DoctorContext'
import { AppContext } from '../../context/AppContext'
import { assets } from '../../assets/assets'
import axios from 'axios'
import { toast } from 'react-toastify'

const DoctorAppointments = () => {
  const { dToken, appointments, getAppointments, cancelAppointment, completeAppointment } = useContext(DoctorContext)
  const { slotDateFormat, calculateAge, currency, backendUrl } = useContext(AppContext)
  const [uploadingPrescription, setUploadingPrescription] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (dToken) {
      getAppointments()
    }
  }, [dToken])

  // Function to handle file selection and upload
  const handleFileChange = async (e, appointmentId) => {
    const file = e.target.files[0]
    if (!file) return

    // Check file type (PDF, JPG, PNG only)
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
    // console.log('File type:', file.type, 'File size:', file.size, typeof(file.type))
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a PDF, JPG, or PNG file only')
      return
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size should be less than 5MB')
      return
    }

    await uploadPrescriptionToR2(file, appointmentId)
  }

  // Function to get a presigned URL and upload file to R2
  const uploadPrescriptionToR2 = async (file, appointmentId) => {
    try {
      setUploadingPrescription(appointmentId)
      
      // Generate a unique filename with timestamp and original extension
      const fileExtension = file.name.split('.').pop()
      const timestamp = new Date().getTime()
      const uniqueFilename = `prescriptions/${appointmentId}-${timestamp}.${fileExtension}`
      
      // Step 1: Get a presigned URL from your backend
      const response = await axios.post(
        `${backendUrl}/api/doctor/get-upload-url`,
        { 
          filename: uniqueFilename,
          contentType: file.type,
          // Add the docId from the token (it should be extracted in the authDoctor middleware)
        },
        { headers: { dToken } }
      )
      
      const presignedData = response.data;
      console.log('Presigned URL response:', presignedData)
      if (!presignedData || !presignedData.success || !presignedData.uploadUrl) {
        console.error('Failed to get upload URL:', presignedData);
        throw new Error('Failed to get upload URL')
      }
      
      // Step 2: Upload the file directly to R2 using the presigned URL
      // await axios.put(
      //   presignedData.uploadUrl,
      //   file,
      //   { 
      //     headers: { 
      //       'Content-Type': file.type,
      //     },
      //   }
      // )
      await fetch(presignedData.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });
      
      // Step 3: Save the reference in your database
      await savePrescriptionReference(appointmentId, presignedData.fileUrl, presignedData.key)
      
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error.response?.data?.message || 'Failed to upload prescription')
    } finally {
      setUploadingPrescription(null)
    }
  }

  // Function to save the R2 file reference to your backend
  const savePrescriptionReference = async (appointmentId, fileUrl, storageKey) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/doctor/save-prescription`, 
        { 
          appointmentId,
          prescriptionUrl: fileUrl,
          storageKey
        },
        { headers: { dToken } }
      )
      
      if (data.success) {
        toast.success('Prescription uploaded successfully')
        getAppointments() // Refresh appointments list
      } else {
        toast.error(data.message || 'Failed to save prescription')
      }
    } catch (error) {
      console.error('Save reference error:', error)
      toast.error(error.response?.data?.message || 'Failed to save prescription reference')
    }
  }

  // Function to handle upload button click
  const handleUploadClick = (appointmentId) => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('data-appointment-id', appointmentId)
      fileInputRef.current.click()
    }
  }

  return (
    <div className='w-full max-w-6xl m-5'>
      <p className='mb-3 text-lg font-medium'>All Appointments</p>

      <div className='bg-white border rounded text-sm max-h-[80vh] overflow-y-scroll'>
        <div className='max-sm:hidden grid grid-cols-[0.5fr_2fr_1fr_1fr_2fr_1fr_1fr_1.5fr] gap-1 py-3 px-6 border-b'>
          <p>#</p>
          <p>Patient</p>
          <p>Payment</p>
          <p>Age</p>
          <p>Date & Time</p>
          <p>Fees</p>
          <p>Action</p>
          <p>Prescription</p>
        </div>
        {appointments && appointments.length > 0 ? (
          appointments.map((item, index) => (
            <div className='flex flex-wrap justify-between max-sm:gap-5 max-sm:text-base sm:grid grid-cols-[0.5fr_2fr_1fr_1fr_2fr_1fr_1fr_1.5fr] gap-1 items-center text-gray-500 py-3 px-6 border-b hover:bg-gray-50' key={item._id || index}>
              <p className='max-sm:hidden'>{index + 1}</p>
              <div className='flex items-center gap-2'>
                <img src={item.userData?.image || assets.default_avatar} className='w-8 rounded-full' alt="User" /> 
                <p>{item.userData?.name || 'Unknown'}</p>
              </div>
              <div>
                <p className='text-xs inline border border-primary px-2 rounded-full'>
                  {item.payment ? 'Online' : 'CASH'}
                </p>
              </div>
              <p className='max-sm:hidden'>{item.userData?.dob ? String(calculateAge(item.userData.dob)) : 'N/A'}</p>
              <p>{item.slotDate ? slotDateFormat(item.slotDate) : 'N/A'}, {item.slotTime || 'N/A'}</p>
              <p>{currency}{item.amount || 0}</p>
              {item.cancelled
                ? <p className='text-red-400 text-xs font-medium'>Cancelled</p>
                : item.isCompleted
                  ? <p className='text-green-500 text-xs font-medium'>Completed</p>
                  : <div className='flex'>
                    <img onClick={() => cancelAppointment(item._id)} className='w-10 cursor-pointer' src={assets.cancel_icon} alt="Cancel" />
                    <img onClick={() => completeAppointment(item._id)} className='w-10 cursor-pointer' src={assets.tick_icon} alt="Complete" />
                  </div>
              }
              <div>
                {item.cancelled ? (
                  <p className='text-gray-400'>-</p>
                ) : !item.isCompleted ? (
                  <p className='text-gray-400'>NA</p>
                ) : (
                  <div>
                    {uploadingPrescription === item._id ? (
                      <div className='flex items-center'>
                        <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-primary'></div>
                        <span className='ml-2'>Uploading...</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleUploadClick(item._id)}
                        className={`px-3 py-1 text-xs rounded ${item.prescription ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
                      >
                        {item.prescription ? 'Update Prescription' : 'Upload Prescription'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-8 p-6 text-center text-gray-500">No appointments found</div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="application/pdf,image/jpeg,image/jpg,image/png"
        onChange={(e) => {
          const appointmentId = e.target.getAttribute('data-appointment-id')
          if (appointmentId) {
            handleFileChange(e, appointmentId)
          }
          e.target.value = null // Reset input
        }}
      />
    </div>
  )
}

export default DoctorAppointments