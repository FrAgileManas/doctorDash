import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import VitalsChart from '../components/vitalsChart';
import * as XLSX from 'xlsx';

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
  
  // Add selected vital type for chart
  const [selectedVitalType, setSelectedVitalType] = useState('blood-pressure');
  
  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDateRange, setExportDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)), // Default to last 30 days
    endDate: new Date()
  });
  const [selectedVitalTypes, setSelectedVitalTypes] = useState([]);
  const [exportInProgress, setExportInProgress] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  
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

  // Fetch vitals for a specific date
  const fetchVitalsForDate = async (date) => {
    if (!token) return [];

    try {
      const { data } = await axios.get(
        `${backendUrl}/api/user/vitals?date=${formatDateForAPI(date)}`, 
        { headers: { token } }
      );
      
      if (data.success) {
        return data.vitals || [];
      } else {
        console.error(data.message);
        return [];
      }
    } catch (error) {
      console.error("Error fetching vitals for date:", formatDateForAPI(date), error);
      return [];
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

  // Handle export date range changes
  const handleExportDateChange = (e) => {
    const { name, value } = e.target;
    setExportDateRange(prev => ({
      ...prev,
      [name]: new Date(value)
    }));
  };

  // Toggle vital type selection for export
  const toggleVitalTypeSelection = (typeId) => {
    setSelectedVitalTypes(prev => {
      if (prev.includes(typeId)) {
        return prev.filter(id => id !== typeId);
      } else {
        return [...prev, typeId];
      }
    });
  };

  // Select/deselect all vital types
  const toggleAllVitalTypes = () => {
    if (selectedVitalTypes.length === vitalTypeOptions.length) {
      setSelectedVitalTypes([]);
    } else {
      setSelectedVitalTypes(vitalTypeOptions.map(option => option.id));
    }
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

  // Handle chart vital type change
  const handleVitalTypeChange = (e) => {
    setSelectedVitalType(e.target.value);
  };

  // Get all dates between start and end dates
  const getDatesBetween = (startDate, endDate) => {
    const dates = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  };

  // Export vitals to Excel
  const exportToExcel = async () => {
    if (selectedVitalTypes.length === 0) {
      toast.warning("Please select at least one vital type to export");
      return;
    }

    try {
      toast.info("Preparing export...");
      setExportInProgress(true);
      setExportProgress(0);
      
      // Get all dates between start and end date
      const dateRange = getDatesBetween(exportDateRange.startDate, exportDateRange.endDate);
      
      // Fetch vitals for each date in the range
      let allVitals = [];
      
      for (let i = 0; i < dateRange.length; i++) {
        const date = dateRange[i];
        const dayVitals = await fetchVitalsForDate(date);
        
        // Filter by selected vital types
        const filteredVitals = dayVitals.filter(vital => 
          selectedVitalTypes.includes(vital.type)
        );
        
        allVitals = [...allVitals, ...filteredVitals];
        
        // Update progress
        const progress = Math.round(((i + 1) / dateRange.length) * 100);
        setExportProgress(progress);
      }
      
      if (allVitals.length === 0) {
        toast.info("No vitals data found for the selected date range and vital types");
        setExportInProgress(false);
        setShowExportModal(false);
        return;
      }
      
      // Process data for Excel
      const excelData = allVitals.map(vital => {
        const vitalTypeInfo = vitalTypeOptions.find(option => option.id === vital.type) || {
          label: vital.type,
          unit: '',
          hasSecondaryValue: false
        };
        
        return {
          'Date': new Date(vital.date).toLocaleDateString(),
          'Time': formatTime(vital.time),
          'Type': vitalTypeInfo.label,
          'Primary Value': vital.primaryValue + (vitalTypeInfo.unit ? ` ${vitalTypeInfo.unit}` : ''),
          'Secondary Value': vitalTypeInfo.hasSecondaryValue && vital.secondaryValue ? 
            vital.secondaryValue + (vitalTypeInfo.unit ? ` ${vitalTypeInfo.unit}` : '') : 
            'N/A',
          'Notes': vital.note || ''
        };
      });
      
      // Create worksheet and workbook
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Vitals");
      
      // Generate filename with date range
      const startDateStr = formatDateForAPI(exportDateRange.startDate);
      const endDateStr = formatDateForAPI(exportDateRange.endDate);
      const fileName = `health_vitals_${startDateStr}_to_${endDateStr}.xlsx`;
      
      // Export to file
      XLSX.writeFile(workbook, fileName);
      
      toast.success("Excel file exported successfully");
      setExportInProgress(false);
      setShowExportModal(false);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
      setExportInProgress(false);
    }
  };

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

  // Reset export modal
  const resetExportModal = () => {
    setExportDateRange({
      startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
      endDate: new Date()
    });
    setSelectedVitalTypes([]);
    setShowExportModal(false);
    setExportProgress(0);
  };

  // Initialize vital type selection when modal opens
  useEffect(() => {
    if (showExportModal && selectedVitalTypes.length === 0) {
      setSelectedVitalTypes(vitalTypeOptions.map(option => option.id));
    }
  }, [showExportModal]);

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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Health Tracker</h1>
        <button 
          onClick={() => setShowExportModal(true)}
          className="py-2 px-4 bg-green-600 text-white rounded font-medium hover:bg-green-700 transition-colors flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export to Excel
        </button>
      </div>
      
      {/* Vital Chart Section with Type Selector */}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-medium text-lg">Vital History</h2>
          <div className="w-48">
            <select
              value={selectedVitalType}
              onChange={handleVitalTypeChange}
              className="w-full p-2 border rounded"
            >
              {vitalTypeOptions.map(option => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <VitalsChart vitalType={selectedVitalType} />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
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
      
      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Export Vitals Data</h2>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Start Date</label>
              <input 
                type="date" 
                name="startDate"
                value={formatDateForAPI(exportDateRange.startDate)}
                onChange={handleExportDateChange}
                className="w-full p-2 border rounded"
                max={formatDateForAPI(exportDateRange.endDate)}
                disabled={exportInProgress}
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 mb-2">End Date</label>
              <input 
                type="date" 
                name="endDate"
                value={formatDateForAPI(exportDateRange.endDate)}
                onChange={handleExportDateChange}
                className="w-full p-2 border rounded"
                min={formatDateForAPI(exportDateRange.startDate)}
                max={formatDateForAPI(new Date())}
                disabled={exportInProgress}
              />
            </div>
            
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <label className="block text-gray-700">Select Vital Types</label>
                <button 
                  type="button" 
                  onClick={toggleAllVitalTypes}
                  className="text-sm text-primary hover:text-blue-700"
                  disabled={exportInProgress}
                >
                  {selectedVitalTypes.length === vitalTypeOptions.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              
              <div className="bg-gray-50 p-3 rounded border max-h-40 overflow-y-auto">
                {vitalTypeOptions.map(option => (
                  <div key={option.id} className="flex items-center mb-2 last:mb-0">
                    <input
                      type="checkbox"
                      id={`export-${option.id}`}
                      checked={selectedVitalTypes.includes(option.id)}
                      onChange={() => toggleVitalTypeSelection(option.id)}
                      className="mr-2 h-4 w-4"
                      disabled={exportInProgress}
                    />
                    <label htmlFor={`export-${option.id}`} className="text-gray-700">
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            {exportInProgress && (
              <div className="mb-4">
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600">Exporting data...</span>
                  <span className="text-sm text-gray-600">{exportProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${exportProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-3">
              <button
                onClick={resetExportModal}
                className="py-2 px-4 bg-gray-200 text-gray-700 rounded font-medium hover:bg-gray-300 transition-colors"
                disabled={exportInProgress}
              >
                Cancel
              </button>
              
              <button
                onClick={exportToExcel}
                className="py-2 px-4 bg-green-600 text-white rounded font-medium hover:bg-green-700 transition-colors"
                disabled={exportInProgress || selectedVitalTypes.length === 0}
              >
                {exportInProgress ? 'Exporting...' : 'Export'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tracker;