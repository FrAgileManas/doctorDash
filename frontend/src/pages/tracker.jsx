import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import VitalsChart from '../components/vitalsChart';
const Tracker = () => {
  const { backendUrl, token, userData } = useContext(AppContext);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [vitals, setVitals] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [vitalData, setVitalData] = useState({
    type: 'blood-pressure',
    value: '',
    additionalValue: '',
    time: new Date().toTimeString().slice(0, 5),
    note: ''
  });
  
  // Check for user login
  useEffect(() => {
    if (!token) {
      toast.error("Please login to use the health tracker");
    }
  }, [token]);

  // Format date for API calls: YYYY-MM-DD
  const formatDateForAPI = (date) => {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
  };

  // Get vitals for selected date
  const fetchVitals = async () => {
    if (!token) return;

    try {
      const { data } = await axios.get(
        `${backendUrl}/api/user/vitals?date=${formatDateForAPI(selectedDate)}`, 
        { headers: { token } }
      );
      
      if (data.success) {
        setVitals(data.vitals || []);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch vitals data");
    }
  };

  useEffect(() => {
    fetchVitals();
  }, [selectedDate, token]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setVitalData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  // Get vital type options
  const vitalTypeOptions = [
    { id: 'blood-pressure', label: 'Blood Pressure', unit: 'mmHg', hasSecondaryValue: true, secondaryLabel: 'Diastolic' },
    { id: 'heart-rate', label: 'Heart Rate', unit: 'BPM', hasSecondaryValue: false },
    { id: 'blood-sugar', label: 'Blood Sugar', unit: 'mg/dL', hasSecondaryValue: false },
    { id: 'body-temperature', label: 'Body Temperature', unit: '°F', hasSecondaryValue: false },
    { id: 'weight', label: 'Weight', unit: 'kg', hasSecondaryValue: false },
    { id: 'oxygen-level', label: 'Oxygen Level', unit: '%', hasSecondaryValue: false },
  ];

  // Get the current vital type info
  const currentVitalType = vitalTypeOptions.find(option => option.id === vitalData.type) || vitalTypeOptions[0];

  // Save or update vital entry
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!token) {
      toast.error("Please login to add vitals");
      return;
    }

    try {
      const payload = {
        type: vitalData.type,
        primaryValue: vitalData.value,
        secondaryValue: vitalData.additionalValue,
        date: formatDateForAPI(selectedDate),
        time: vitalData.time,
        note: vitalData.note
      };

      let response;
      
      if (editingId) {
        response = await axios.put(
          `${backendUrl}/api/user/vitals/${editingId}`,
          payload,
          { headers: { token } }
        );
      } else {
        response = await axios.post(
          `${backendUrl}/api/user/vitals`,
          payload,
          { headers: { token } }
        );
      }

      const { data } = response;
      
      if (data.success) {
        toast.success(editingId ? "Vital updated successfully" : "Vital added successfully");
        fetchVitals();
        resetForm();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to save vital data");
    }
  };

  // Delete a vital entry
  const handleDelete = async (id) => {
    try {
      const { data } = await axios.delete(
        `${backendUrl}/api/user/vitals/${id}`,
        { headers: { token } }
      );
      
      if (data.success) {
        toast.success("Vital entry deleted");
        fetchVitals();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete vital entry");
    }
  };

  // Edit a vital entry
  const handleEdit = (vital) => {
    setEditingId(vital._id);
    setVitalData({
      type: vital.type,
      value: vital.primaryValue,
      additionalValue: vital.secondaryValue || '',
      time: vital.time,
      note: vital.note || ''
    });
    setShowAddForm(true);
    window.scrollTo(0, 0);
  };

  // Reset form
  const resetForm = () => {
    setVitalData({
      type: 'blood-pressure',
      value: '',
      additionalValue: '',
      time: new Date().toTimeString().slice(0, 5),
      note: ''
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  // Format time for display
  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${period}`;
  };

  // Get label for vital type
  const getVitalTypeLabel = (typeId) => {
    const option = vitalTypeOptions.find(option => option.id === typeId);
    return option ? option.label : typeId;
  };

  if (!token) {
    return (
      <div className="my-8 text-center py-10">
        <h1 className="text-2xl font-semibold mb-4">Health Tracker</h1>
        <p className="text-gray-600">Please login to use the health tracker feature</p>
        <button 
          onClick={() => window.location.href = '/login'}
          className="mt-4 py-2 px-4 bg-primary text-white rounded font-medium hover:bg-blue-700 transition-colors"
        >
          Login
        </button>
      </div>
    );
  }

  return (
    <div className="my-8">
      <h1 className="text-2xl font-semibold mb-6">Health Tracker</h1>
      <VitalsChart vitalType="blood-pressure"></VitalsChart>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Calendar Section */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h2 className="font-medium mb-3">Select Date</h2>
            <Calendar 
              onChange={setSelectedDate} 
              value={selectedDate} 
              maxDate={new Date()} 
              className="w-full border-none"
            />
          </div>
          
          <button 
            onClick={() => {
              resetForm();
              setShowAddForm(!showAddForm);
            }}
            className="w-full py-2 bg-primary text-white rounded font-medium hover:bg-blue-700 transition-colors"
          >
            {showAddForm ? 'Cancel' : '+ Add New Vital'}
          </button>
        </div>
        
        {/* Add/Edit Form & Data Section */}
        <div className="md:col-span-2">
          {showAddForm && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="font-medium text-lg mb-4">
                {editingId ? 'Edit Vital' : 'Add New Vital'}
              </h2>
              
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">Vital Type</label>
                  <select
                    name="type"
                    value={vitalData.type}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                  >
                    {vitalTypeOptions.map(option => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">
                    {currentVitalType.hasSecondaryValue ? 'Systolic' : 'Value'} ({currentVitalType.unit})
                  </label>
                  <input
                    type="number"
                    name="value"
                    value={vitalData.value}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                
                {currentVitalType.hasSecondaryValue && (
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2">
                      {currentVitalType.secondaryLabel} ({currentVitalType.unit})
                    </label>
                    <input
                      type="number"
                      name="additionalValue"
                      value={vitalData.additionalValue}
                      onChange={handleChange}
                      className="w-full p-2 border rounded"
                      required={currentVitalType.hasSecondaryValue}
                    />
                  </div>
                )}
                
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">Time</label>
                  <input
                    type="time"
                    name="time"
                    value={vitalData.time}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">Notes (Optional)</label>
                  <textarea
                    name="note"
                    value={vitalData.note}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                    rows="3"
                  ></textarea>
                </div>
                
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="py-2 px-4 bg-primary text-white rounded font-medium hover:bg-blue-700 transition-colors"
                  >
                    {editingId ? 'Update' : 'Save'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={resetForm}
                    className="py-2 px-4 bg-gray-200 text-gray-700 rounded font-medium hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
          
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <h2 className="font-medium text-lg p-4 border-b">
              Vitals for {selectedDate.toLocaleDateString()}
            </h2>
            
            {vitals.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No vitals recorded for this date
              </div>
            ) : (
              <div className="divide-y">
                {vitals.map((vital, index) => {
                  const vitalTypeInfo = vitalTypeOptions.find(option => option.id === vital.type) || {
                    unit: '',
                    hasSecondaryValue: false
                  };
                  
                  return (
                    <div key={index} className="p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-primary">
                            {getVitalTypeLabel(vital.type)}
                          </h3>
                          <p className="text-gray-600 text-sm">
                            {formatTime(vital.time)}
                          </p>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(vital)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(vital._id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <p className="font-medium">
                          {vitalTypeInfo.hasSecondaryValue ? (
                            <>
                              {vital.primaryValue}/{vital.secondaryValue} {vitalTypeInfo.unit}
                            </>
                          ) : (
                            <>
                              {vital.primaryValue} {vitalTypeInfo.unit}
                            </>
                          )}
                        </p>
                        
                        {vital.note && (
                          <p className="text-gray-600 text-sm mt-1">
                            {vital.note}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tracker;