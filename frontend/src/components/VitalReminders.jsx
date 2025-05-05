import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';

const VitalReminders = () => {
  const { backendUrl, token } = useContext(AppContext);
  const [reminders, setReminders] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [reminderData, setReminderData] = useState({
    vitalType: 'blood-pressure',
    frequency: 'daily',
    time: '08:00',
    daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    active: true
  });

  // Vital type options (same as in the Tracker component)
  const vitalTypeOptions = [
    { id: 'blood-pressure', label: 'Blood Pressure' },
    { id: 'heart-rate', label: 'Heart Rate' },
    { id: 'blood-sugar', label: 'Blood Sugar' },
    { id: 'body-temperature', label: 'Body Temperature' },
    { id: 'weight', label: 'Weight' },
    { id: 'oxygen-level', label: 'Oxygen Level' },
  ];

  const daysOfWeek = [
    { id: 'monday', label: 'Monday' },
    { id: 'tuesday', label: 'Tuesday' },
    { id: 'wednesday', label: 'Wednesday' },
    { id: 'thursday', label: 'Thursday' },
    { id: 'friday', label: 'Friday' },
    { id: 'saturday', label: 'Saturday' },
    { id: 'sunday', label: 'Sunday' },
  ];

  // Fetch reminders
  const fetchReminders = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const { data } = await axios.get(
        `${backendUrl}/api/user/reminders`,
        { headers: { token } }
      );
      
      if (data.success) {
        setReminders(data.reminders || []);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Error fetching reminders:", error);
      toast.error("Failed to fetch reminders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, [token]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setReminderData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  // Handle day selection
  const handleDayToggle = (day) => {
    setReminderData(prevData => {
      const currentDays = [...prevData.daysOfWeek];
      
      if (currentDays.includes(day)) {
        return {
          ...prevData,
          daysOfWeek: currentDays.filter(d => d !== day)
        };
      } else {
        return {
          ...prevData,
          daysOfWeek: [...currentDays, day]
        };
      }
    });
  };

  // Handle frequency change
  const handleFrequencyChange = (e) => {
    const { value } = e.target;
    
    if (value === 'daily') {
      setReminderData(prevData => ({
        ...prevData,
        frequency: value,
        daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      }));
    } else {
      setReminderData(prevData => ({
        ...prevData,
        frequency: value,
        daysOfWeek: prevData.daysOfWeek
      }));
    }
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!token) {
      toast.error("Please login to set reminders");
      return;
    }

    // Validate days selection for weekly frequency
    if (reminderData.frequency === 'weekly' && reminderData.daysOfWeek.length === 0) {
      toast.warning("Please select at least one day of the week");
      return;
    }

    try {
      const payload = {
        vitalType: reminderData.vitalType,
        frequency: reminderData.frequency,
        time: reminderData.time,
        daysOfWeek: reminderData.frequency === 'weekly' ? reminderData.daysOfWeek : [],
        active: reminderData.active
      };

      let response;
      
      if (editingId) {
        response = await axios.put(
          `${backendUrl}/api/user/reminders/${editingId}`,
          payload,
          { headers: { token } }
        );
      } else {
        response = await axios.post(
          `${backendUrl}/api/user/reminders`,
          payload,
          { headers: { token } }
        );
      }

      const { data } = response;
      
      if (data.success) {
        toast.success(editingId ? "Reminder updated successfully" : "Reminder added successfully");
        fetchReminders();
        resetForm();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Error saving reminder:", error);
      toast.error("Failed to save reminder");
    }
  };

  // Delete reminder
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this reminder?")) {
      return;
    }
    
    try {
      const { data } = await axios.delete(
        `${backendUrl}/api/user/reminders/${id}`,
        { headers: { token } }
      );
      
      if (data.success) {
        toast.success("Reminder deleted successfully");
        fetchReminders();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Error deleting reminder:", error);
      toast.error("Failed to delete reminder");
    }
  };

  // Edit reminder
  const handleEdit = (reminder) => {
    setEditingId(reminder._id);
    setReminderData({
      vitalType: reminder.vitalType,
      frequency: reminder.frequency,
      time: reminder.time,
      daysOfWeek: reminder.daysOfWeek || [],
      active: reminder.active
    });
    setShowAddForm(true);
    window.scrollTo(0, 0);
  };

  // Toggle reminder active status
  const toggleActive = async (reminder) => {
    try {
      const updatedReminder = {
        ...reminder,
        active: !reminder.active
      };
      
      const { data } = await axios.put(
        `${backendUrl}/api/user/reminders/${reminder._id}`,
        updatedReminder,
        { headers: { token } }
      );
      
      if (data.success) {
        toast.success(`Reminder ${updatedReminder.active ? 'activated' : 'deactivated'}`);
        fetchReminders();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Error toggling reminder status:", error);
      toast.error("Failed to update reminder status");
    }
  };

  // Reset form
  const resetForm = () => {
    setReminderData({
      vitalType: 'blood-pressure',
      frequency: 'daily',
      time: '08:00',
      daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      active: true
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

  // Format days of week for display
  const formatDaysOfWeek = (days) => {
    if (!days || days.length === 0) return 'None';
    
    if (days.length === 7) return 'Every day';
    
    return days.map(day => {
      const dayObj = daysOfWeek.find(d => d.id === day);
      return dayObj ? dayObj.label.substring(0, 3) : day;
    }).join(', ');
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mt-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Vital Reminders</h2>
        <button 
          onClick={() => {
            resetForm();
            setShowAddForm(!showAddForm);
          }}
          className="py-2 px-4 bg-primary text-white rounded font-medium hover:bg-blue-700 transition-colors"
        >
          {showAddForm ? 'Cancel' : '+ Add Reminder'}
        </button>
      </div>
      
      {showAddForm && (
        <div className="bg-gray-50 rounded-lg p-6 mb-6 border">
          <h3 className="font-medium text-lg mb-4">
            {editingId ? 'Edit Reminder' : 'Add New Reminder'}
          </h3>
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 mb-2">Vital Type</label>
                <select
                  name="vitalType"
                  value={reminderData.vitalType}
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
              
              <div>
                <label className="block text-gray-700 mb-2">Reminder Time</label>
                <input
                  type="time"
                  name="time"
                  value={reminderData.time}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Frequency</label>
              <div className="flex gap-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="frequency"
                    value="daily"
                    checked={reminderData.frequency === 'daily'}
                    onChange={handleFrequencyChange}
                    className="mr-2"
                  />
                  Daily
                </label>
                
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="frequency"
                    value="weekly"
                    checked={reminderData.frequency === 'weekly'}
                    onChange={handleFrequencyChange}
                    className="mr-2"
                  />
                  Weekly
                </label>
              </div>
            </div>
            
            {reminderData.frequency === 'weekly' && (
              <div className="mb-6">
                <label className="block text-gray-700 mb-2">Days of Week</label>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map(day => (
                    <div key={day.id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`day-${day.id}`}
                        checked={reminderData.daysOfWeek.includes(day.id)}
                        onChange={() => handleDayToggle(day.id)}
                        className="mr-1"
                      />
                      <label htmlFor={`day-${day.id}`} className="mr-3 text-sm">
                        {day.label.substring(0, 3)}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mb-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="active"
                  checked={reminderData.active}
                  onChange={(e) => {
                    setReminderData(prev => ({
                      ...prev,
                      active: e.target.checked
                    }));
                  }}
                  className="mr-2"
                />
                <span>Active</span>
              </label>
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
      
      {loading ? (
        <div className="text-center py-8">
          <p>Loading reminders...</p>
        </div>
      ) : reminders.length === 0 ? (
        <div className="bg-gray-50 text-center py-8 rounded">
          <p className="text-gray-500">No reminders set</p>
          <button 
            onClick={() => setShowAddForm(true)}
            className="mt-3 text-primary hover:text-blue-700"
          >
            Set your first reminder
          </button>
        </div>
      ) : (
        <div className="overflow-hidden">
          <div className="border rounded-lg divide-y">
            {reminders.map((reminder, index) => (
              <div 
                key={index} 
                className={`p-4 flex flex-col md:flex-row md:items-center md:justify-between ${
                  reminder.active ? '' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-start md:items-center gap-3 mb-3 md:mb-0">
                  <div className={`w-3 h-3 rounded-full mt-1 md:mt-0 ${
                    reminder.active ? 'bg-green-500' : 'bg-gray-400'
                  }`}></div>
                  
                  <div>
                    <h3 className="font-medium">
                      {getVitalTypeLabel(reminder.vitalType)}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {formatTime(reminder.time)} • {reminder.frequency === 'daily' ? 'Daily' : 'Weekly'}
                      {reminder.frequency === 'weekly' && (
                        <span> ({formatDaysOfWeek(reminder.daysOfWeek)})</span>
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => toggleActive(reminder)}
                    className={`text-sm ${
                      reminder.active ? 'text-gray-600 hover:text-gray-800' : 'text-green-600 hover:text-green-800'
                    }`}
                  >
                    {reminder.active ? 'Deactivate' : 'Activate'}
                  </button>
                  
                  <button
                    onClick={() => handleEdit(reminder)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                  
                  <button
                    onClick={() => handleDelete(reminder._id)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VitalReminders;