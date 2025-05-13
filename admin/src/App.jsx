import React, { useContext, useEffect, useState } from 'react'
import { DoctorContext } from './context/DoctorContext';
import { AdminContext } from './context/AdminContext';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Admin/Dashboard';
import AllAppointments from './pages/Admin/AllAppointments';
import AddDoctor from './pages/Admin/AddDoctor';
import DoctorsList from './pages/Admin/DoctorsList';
import Login from './pages/Login';
import DoctorAppointments from './pages/Doctor/DoctorAppointments';
import DoctorDashboard from './pages/Doctor/DoctorDashboard';
import DoctorProfile from './pages/Doctor/DoctorProfile';
import DoctorPatients from './pages/Doctor/DoctorPatients';
import Room from './pages/Doctor/Room';
const App = () => {
  const [userType,setUserType]=useState('')
  const { dToken } = useContext(DoctorContext)
  const { aToken } = useContext(AdminContext)
  useEffect(()=>{console.log("userType changed:: ", userType)},[userType]  )
  return dToken || aToken ? (
    <div className='bg-[#F8F9FD]'>
      <ToastContainer />
      <Navbar />
      <div className='flex items-start'>
        <Sidebar />
        <Routes>
          {userType=='Admin'?
          <Route path='/' element={<Dashboard />} />:<Route path='/' element={<DoctorDashboard />} />
          }
          <Route path='/admin-dashboard' element={<Dashboard />} />
          <Route path='/all-appointments' element={<AllAppointments />} />
          <Route path='/add-doctor' element={<AddDoctor />} />
          <Route path='/doctor-list' element={<DoctorsList />} />
          <Route path='/doctor-dashboard' element={<DoctorDashboard />} />
          <Route path='/doctor-appointments' element={<DoctorAppointments />} />
          <Route path="/doctor-patients" element={<DoctorPatients />} />
          <Route path='/doctor-profile' element={<DoctorProfile />} />
          <Route path='/room/:appointmentId' element={<Room />} />
        </Routes>
      </div>
    </div>
  ) : (
    <>
      <ToastContainer />
      <Login tellState={setUserType} />
    </>
  )
}

export default App