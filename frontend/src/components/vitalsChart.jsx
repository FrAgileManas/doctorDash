import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const VitalsChart = ({ vitalType }) => {
  const { backendUrl, token } = useContext(AppContext);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week'); // 'week', 'month', 'year'
    
  // Get vital type options for reference
  const vitalTypeOptions = [
    { id: 'blood-pressure', label: 'Blood Pressure', unit: 'mmHg', primaryColor: '#4f46e5', secondaryColor: '#818cf8', hasSecondaryValue: true },
    { id: 'heart-rate', label: 'Heart Rate', unit: 'BPM', primaryColor: '#ef4444', hasSecondaryValue: false },
    { id: 'blood-sugar', label: 'Blood Sugar', unit: 'mg/dL', primaryColor: '#f59e0b', hasSecondaryValue: false },
    { id: 'body-temperature', label: 'Body Temperature', unit: '°F', primaryColor: '#10b981', hasSecondaryValue: false },
    { id: 'weight', label: 'Weight', unit: 'kg', primaryColor: '#3b82f6', hasSecondaryValue: false },
    { id: 'oxygen-level', label: 'Oxygen Level', unit: '%', primaryColor: '#6366f1', hasSecondaryValue: false },
  ];

  const currentVitalType = vitalTypeOptions.find(option => option.id === vitalType) || vitalTypeOptions[0];

  useEffect(() => {
    if (token && vitalType) {
      fetchChartData();
    }
    console.log( "Vital Type:", vitalType);
  }, [vitalType, timeRange, token]);

  // Calculate date range based on selected time period
  const getDateRange = () => {
    const end = new Date();
    const start = new Date();
    
    if (timeRange === 'week') {
      start.setDate(end.getDate() - 7);
    } else if (timeRange === 'month') {
      start.setMonth(end.getMonth() - 1);
    } else if (timeRange === 'year') {
      start.setFullYear(end.getFullYear() - 1);
    }
    
    return {
      start: formatDateForAPI(start),
      end: formatDateForAPI(end)
    };
  };

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

  // Format date for display: MMM DD
  const formatDateForDisplay = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Fetch data for chart
  const fetchChartData = async () => {
    setLoading(true);
    try {
      console.log("Fetching chart data for:", vitalType, "in", timeRange, "range");
      const { start, end } = getDateRange();
      const { data } = await axios.get(
        `${backendUrl}/api/user/all-vitals`, 
        { headers: { token } }
      );
      
      if (data.success) {
        // Filter by vital type and date range
        const filteredData = data.vitals.filter(vital => {
          return vital.type === vitalType && vital.date >= start && vital.date <= end;
        });
        
        // Format data for chart
        const formattedData = filteredData.map(vital => ({
          date: formatDateForDisplay(vital.date),
          time: vital.time,
          primaryValue: parseFloat(vital.primaryValue),
          secondaryValue: parseFloat(vital.secondaryValue),
          fullDate: vital.date
        }));

        // Sort by date and time
        formattedData.sort((a, b) => {
          if (a.fullDate === b.fullDate) {
            return a.time.localeCompare(b.time);
          }
          return a.fullDate.localeCompare(b.fullDate);
        });

        setChartData(formattedData);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch vital data for chart");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center p-6">Loading chart data...</div>;
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h2 className="font-medium text-lg mb-2">{currentVitalType.label} History</h2>
        <div className="mt-4 text-gray-500 text-center py-8">
          No data available for the selected period
        </div>
        <div className="flex justify-center gap-2 mt-4">
          <TimeRangeButton range="week" current={timeRange} onClick={setTimeRange} />
          <TimeRangeButton range="month" current={timeRange} onClick={setTimeRange} />
          <TimeRangeButton range="year" current={timeRange} onClick={setTimeRange} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-medium text-lg">{currentVitalType.label} History</h2>
        <div className="flex gap-2">
          <TimeRangeButton range="week" current={timeRange} onClick={setTimeRange} />
          <TimeRangeButton range="month" current={timeRange} onClick={setTimeRange} />
          <TimeRangeButton range="year" current={timeRange} onClick={setTimeRange} />
        </div>
      </div>

      <div className="h-64 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="primaryValue"
              name={currentVitalType.hasSecondaryValue ? "Systolic" : currentVitalType.label}
              stroke={currentVitalType.primaryColor}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            {currentVitalType.hasSecondaryValue && (
              <Line
                type="monotone"
                dataKey="secondaryValue"
                name="Diastolic"
                stroke={currentVitalType.secondaryColor}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const TimeRangeButton = ({ range, current, onClick }) => {
  const labels = {
    week: 'Week',
    month: 'Month',
    year: 'Year'
  };

  return (
    <button
      onClick={() => onClick(range)}
      className={`px-3 py-1 text-sm rounded ${
        current === range 
          ? 'bg-primary text-white' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {labels[range]}
    </button>
  );
};

export default VitalsChart;