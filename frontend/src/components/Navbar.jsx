import React, { useContext, useState } from 'react'
import { assets } from '../assets/assets'
import { NavLink, useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'

const Navbar = () => {

  const navigate = useNavigate()

  const [showMenu, setShowMenu] = useState(false)
  const { token, setToken, userData } = useContext(AppContext)

  const logout = () => {
    localStorage.removeItem('token')
    setToken(false)
    navigate('/login')
  }

  // Combines logout and closing the mobile menu
  const handleMobileLogout = () => {
    logout();
    setShowMenu(false);
  }

  return (
    <div className='flex items-center justify-between text-sm py-4 mb-5 border-b border-b-[#ADADAD]'>
      <img onClick={() => navigate('/')} className='w-44 cursor-pointer' src={assets.logo} alt="" />
      <ul className='md:flex items-start gap-5 font-medium hidden'>
        <NavLink to='/' >
          <li className='py-1'>HOME</li>
          <hr className='border-none outline-none h-0.5 bg-primary w-3/5 m-auto hidden' />
        </NavLink>
        <NavLink to='/doctors' >
          <li className='py-1'>ALL DOCTORS</li>
          <hr className='border-none outline-none h-0.5 bg-primary w-3/5 m-auto hidden' />
        </NavLink>
        <NavLink to='/tracker' >
          <li className='py-1'>TRACKER</li>
          <hr className='border-none outline-none h-0.5 bg-primary w-3/5 m-auto hidden' />
        </NavLink>
        <NavLink to='/about' >
          <li className='py-1'>ABOUT</li>
          <hr className='border-none outline-none h-0.5 bg-primary w-3/5 m-auto hidden' />
        </NavLink>
        <NavLink to='/contact' >
          <li className='py-1'>CONTACT</li>
          <hr className='border-none outline-none h-0.5 bg-primary w-3/5 m-auto hidden' />
        </NavLink>
      </ul>

      <div className='flex items-center gap-4'>
        {/* --- Desktop Auth Buttons (with fixed width container to prevent layout shift) --- */}
        <div className='hidden md:flex justify-end items-center min-w-[190px]'>
          {
            token && userData
              ? <div className='flex items-center gap-2 cursor-pointer group relative'>
                <img className='w-8 rounded-full' src={userData.image} alt="user" />
                <img className='w-2.5' src={assets.dropdown_icon} alt="dropdown" />
                <div className='absolute top-0 right-0 pt-14 text-base font-medium text-gray-600 z-20 hidden group-hover:block'>
                  <div className='min-w-48 bg-gray-50 rounded flex flex-col gap-4 p-4'>
                    <p onClick={() => navigate('/my-profile')} className='hover:text-black cursor-pointer'>My Profile</p>
                    <p onClick={() => navigate('/my-appointments')} className='hover:text-black cursor-pointer'>My Appointments</p>
                    <p onClick={() => navigate('/records')} className='hover:text-black cursor-pointer'>HealthRecords Manager</p>
                    <p onClick={logout} className='hover:text-black cursor-pointer'>Logout</p>
                  </div>
                </div>
              </div>
              : <button onClick={() => navigate('/login')} className='bg-primary text-white px-8 py-3 rounded-full font-light'>Create account</button>
          }
        </div>

        {/* --- Mobile Menu Icon --- */}
        <img onClick={() => setShowMenu(true)} className='w-6 md:hidden cursor-pointer' src={assets.menu_icon} alt="menu" />

        {/* ---- Mobile Menu ---- */}
        <div className={`md:hidden ${showMenu ? 'fixed w-full' : 'h-0 w-0'} right-0 top-0 bottom-0 z-20 overflow-hidden bg-white transition-all`}>
          <div className='flex items-center justify-between px-5 py-6'>
            <img onClick={() => { navigate('/'); setShowMenu(false); }} src={assets.logo} className='w-36 cursor-pointer' alt="logo" />
            <img onClick={() => setShowMenu(false)} src={assets.cross_icon} className='w-7 cursor-pointer' alt="close" />
          </div>
          <ul className='flex flex-col items-center gap-2 mt-5 px-5 text-lg font-medium'>
            <NavLink onClick={() => setShowMenu(false)} to='/'><p className='px-4 py-2'>HOME</p></NavLink>
            <NavLink onClick={() => setShowMenu(false)} to='/doctors'><p className='px-4 py-2'>ALL DOCTORS</p></NavLink>
            <NavLink onClick={() => setShowMenu(false)} to='/about'><p className='px-4 py-2'>ABOUT</p></NavLink>
            <NavLink onClick={() => setShowMenu(false)} to='/contact'><p className='px-4 py-2'>CONTACT</p></NavLink>
            <NavLink onClick={() => setShowMenu(false)} to='/tracker'><p className='px-4 py-2'>TRACKER</p></NavLink>

            {/* --- Mobile Auth Buttons --- */}
            {
              !token ? (
                <button onClick={() => { navigate('/login'); setShowMenu(false); }} className='bg-primary text-white px-8 py-3 rounded-full font-light mt-4'>Create account</button>
              ) : (
                <div className='w-full flex flex-col items-center text-center mt-4'>
                    <hr className='w-4/5 my-2 border-gray-300'/>
                    <NavLink onClick={() => setShowMenu(false)} to='/my-profile' className='py-2'>My Profile</NavLink>
                    <NavLink onClick={() => setShowMenu(false)} to='/my-appointments' className='py-2'>My Appointments</NavLink>
                    <NavLink onClick={() => setShowMenu(false)} to='/records' className='py-2'>HealthRecords Manager</NavLink>
                    <p onClick={handleMobileLogout} className='py-2 cursor-pointer text-primary'>Logout</p>
                </div>
              )
            }
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Navbar