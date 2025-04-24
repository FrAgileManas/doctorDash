import React, { useContext, useEffect, useState } from 'react'
import { DoctorContext } from '../../context/DoctorContext'
import { AppContext } from '../../context/AppContext'
import PatientVitalsChart from '../../components/PatientVitalsChart'
const DoctorPatients = () => {
  const { 
    dToken, 
    patients, 
    getPatients, 
    selectedPatient, 
    loadPatientDetails,
    patientVitals,
    patientAppointments
  } = useContext(DoctorContext)
  
  const { slotDateFormat, calculateAge, currency } = useContext(AppContext)
  const [activeView, setActiveView] = useState('pending') // 'pending' or 'completed'
  const [vitalTypeFilter, setVitalTypeFilter] = useState('all') // 'all' or specific vital type
  
  useEffect(() => {
    if (dToken) {
      getPatients()
    }
  }, [dToken])

  // Filter patients by appointment status
  const pendingPatients = patients.filter(patient => 
    patient.appointments.some(apt => !apt.isCompleted && !apt.cancelled)
  )
  
  const completedPatients = patients.filter(patient => 
    patient.appointments.some(apt => apt.isCompleted)
  )

  const displayPatients = activeView === 'pending' ? pendingPatients : completedPatients

  // Format vital reading for display
  const formatVitalReading = (vital) => {
    switch(vital.type) {
      case 'blood-pressure': 
        return `${vital.primaryValue}/${vital.secondaryValue} mmHg`
      case 'heart-rate':
        return `${vital.primaryValue} bpm`
      case 'blood-sugar':
        return `${vital.primaryValue} mg/dL`
      case 'body-temperature':
        return `${vital.primaryValue}°F`
      case 'weight':
        return `${vital.primaryValue} kg`
      case 'oxygen-level':
        return `${vital.primaryValue}%`
      default:
        return vital.primaryValue.toString()
    }
  }

  // Format vital type for display
  const formatVitalType = (type) => {
    return type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  // Get unique vital types from patientVitals
  const getUniqueVitalTypes = () => {
    const types = patientVitals.map(vital => vital.type)
    return ['all', ...new Set(types)]
  }

  // Filter vitals based on selected type
  const filteredVitals = vitalTypeFilter === 'all' 
    ? patientVitals 
    : patientVitals.filter(vital => vital.type === vitalTypeFilter)

    return (
      <div className='w-full max-w-6xl m-5'>
        {!selectedPatient ? (
          // Patient list view
          <>
            <div className='flex justify-between items-center mb-5'>
              <p className='text-lg font-medium'>My Patients</p>
              <div className='flex gap-2'>
                <button 
                  className={`px-4 py-2 rounded-md ${activeView === 'pending' ? 'bg-primary text-white' : 'bg-gray-100'}`}
                  onClick={() => setActiveView('pending')}
                >
                  Pending Appointments
                </button>
                <button 
                  className={`px-4 py-2 rounded-md ${activeView === 'completed' ? 'bg-primary text-white' : 'bg-gray-100'}`}
                  onClick={() => setActiveView('completed')}
                >
                  Completed Appointments
                </button>
              </div>
            </div>
    
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {displayPatients.length > 0 ? displayPatients.map((patient, index) => (
                <div 
                  key={index} 
                  className='bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow'
                  onClick={() => loadPatientDetails(patient)}
                >
                  <div className='flex items-start gap-3'>
                    <img src={patient.image} alt={patient.name} className='w-12 h-12 rounded-full object-cover' />
                    <div>
                      <h3 className='font-medium text-lg'>{patient.name}</h3>
                      <p className='text-sm text-gray-600'>Age: {calculateAge(patient.dob)}</p>
                      <p className='text-sm text-gray-600 mt-1'>
                        {activeView === 'pending' ? (
                          <span className='text-orange-500 font-medium'>
                            {patient.appointments.filter(apt => !apt.isCompleted && !apt.cancelled).length} pending appointment(s)
                          </span>
                        ) : (
                          <span className='text-green-500 font-medium'>
                            {patient.appointments.filter(apt => apt.isCompleted).length} completed appointment(s)
                          </span>
                        )}
                      </p>
                      <p className='text-xs text-gray-500 mt-2'>
                        Next appointment: {
                          patient.appointments.find(apt => !apt.isCompleted && !apt.cancelled) ? 
                          slotDateFormat(patient.appointments.find(apt => !apt.isCompleted && !apt.cancelled).slotDate) : 
                          'None scheduled'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className='col-span-full text-center py-10'>
                  <p className='text-gray-500'>No patients found</p>
                </div>
              )}
            </div>
          </>
        ) : (
          // Patient details view
          <div className='bg-white rounded-lg shadow-md p-5'>
            <div className='flex items-center justify-between mb-5'>
              <div className='flex items-center gap-3'>
                <button 
                  onClick={() => loadPatientDetails(null)} 
                  className='bg-gray-100 p-2 rounded-full'
                >
                  &larr;
                </button>
                <div className='flex items-center gap-4'>
                  <img 
                    src={selectedPatient.image} 
                    alt={selectedPatient.name} 
                    className='w-16 h-16 rounded-full object-cover'
                  />
                  <div>
                    <h2 className='text-xl font-medium'>{selectedPatient.name}</h2>
                    <p className='text-gray-500'>Age: {calculateAge(selectedPatient.dob)}</p>
                  </div>
                </div>
              </div>
            </div>
    
            {/* Add PatientVitalsChart component above the grid */}
            <PatientVitalsChart patientVitals={patientVitals} />
    
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
              {/* Vitals Section */}
              <div className='border rounded-lg p-4'>
                <div className='flex justify-between items-center mb-4'>
                  <h3 className='text-lg font-medium'>Patient Vitals</h3>
                  
                  {/* Vitals filter dropdown */}
                  <div className='relative'>
                    <select 
                      className='border rounded-md px-3 py-1.5 bg-white text-sm'
                      value={vitalTypeFilter}
                      onChange={(e) => setVitalTypeFilter(e.target.value)}
                    >
                      {getUniqueVitalTypes().map((type, index) => (
                        <option key={index} value={type}>
                          {type === 'all' ? 'All Vitals' : formatVitalType(type)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {filteredVitals.length > 0 ? (
                  <div className='space-y-4'>
                    {filteredVitals.map((vital, index) => (
                      <div key={index} className='bg-gray-50 p-3 rounded-md'>
                        <div className='flex justify-between'>
                          <p className='font-medium'>{formatVitalType(vital.type)}</p>
                          <p className='text-sm text-gray-500'>{vital.date} {vital.time}</p>
                        </div>
                        <p className='text-lg font-semibold mt-1'>{formatVitalReading(vital)}</p>
                        {vital.note && <p className='text-sm text-gray-600 mt-1'>{vital.note}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className='text-gray-500 text-center py-8'>
                    {patientVitals.length > 0 
                      ? 'No vitals match the selected filter' 
                      : 'No vitals recorded'}
                  </p>
                )}
              </div>
    
              {/* Appointment History Section */}
              <div className='border rounded-lg p-4'>
                <h3 className='text-lg font-medium mb-4'>Appointment History</h3>
                
                {patientAppointments.length > 0 ? (
                  <div className='space-y-3'>
                    {patientAppointments.map((appointment, index) => (
                      <div key={index} className='border rounded-md p-3'>
                        <div className='flex justify-between items-start'>
                          <div>
                            <p className='font-medium'>{slotDateFormat(appointment.slotDate)}</p>
                            <p className='text-sm text-gray-600'>Time: {appointment.slotTime}</p>
                          </div>
                          <div className='text-right'>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              appointment.cancelled ? 'bg-red-100 text-red-600' : 
                              appointment.isCompleted ? 'bg-green-100 text-green-600' : 
                              'bg-yellow-100 text-yellow-600'
                            }`}>
                              {appointment.cancelled ? 'Cancelled' : 
                               appointment.isCompleted ? 'Completed' : 'Pending'}
                            </span>
                            <p className='text-sm mt-1'>{currency}{appointment.amount}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className='text-gray-500 text-center py-8'>No appointment history</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
}

export default DoctorPatients