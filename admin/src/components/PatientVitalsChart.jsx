import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const PatientVitalsChart = ({ patientVitals }) => {
  const [vitalType, setVitalType] = useState('all');
  const [timeRange, setTimeRange] = useState('week');
  const [chartData, setChartData] = useState([]);

  // Vital type options for reference
  const vitalTypeOptions = [
    { id: 'all', label: 'All Vitals' },
    { id: 'blood-pressure', label: 'Blood Pressure', unit: 'mmHg', primaryColor: '#4f46e5', secondaryColor: '#818cf8', hasSecondaryValue: true },
    { id: 'heart-rate', label: 'Heart Rate', unit: 'BPM', primaryColor: '#ef4444', hasSecondaryValue: false },
    { id: 'blood-sugar', label: 'Blood Sugar', unit: 'mg/dL', primaryColor: '#f59e0b', hasSecondaryValue: false },
    { id: 'body-temperature', label: 'Body Temperature', unit: '°F', primaryColor: '#10b981', hasSecondaryValue: false },
    { id: 'weight', label: 'Weight', unit: 'kg', primaryColor: '#3b82f6', hasSecondaryValue: false },
    { id: 'oxygen-level', label: 'Oxygen Level', unit: '%', primaryColor: '#6366f1', hasSecondaryValue: false },
  ];

  // Format date for display: MMM DD
  const formatDateForDisplay = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

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

  useEffect(() => {
    if (patientVitals && patientVitals.length > 0) {
      prepareChartData();
    }
  }, [patientVitals, vitalType, timeRange]);

  const prepareChartData = () => {
    const { start, end } = getDateRange();
    
    // Filter by date range
    let filteredData = patientVitals.filter(vital => 
      vital.date >= start && vital.date <= end
    );

    // Filter by vital type if not "all"
    if (vitalType !== 'all') {
      filteredData = filteredData.filter(vital => vital.type === vitalType);
    }

    // Format data for chart
    const formattedData = filteredData.map(vital => ({
      date: formatDateForDisplay(vital.date),
      time: vital.time,
      primaryValue: parseFloat(vital.primaryValue),
      secondaryValue: parseFloat(vital.secondaryValue),
      fullDate: vital.date,
      type: vital.type
    }));

    // Sort by date and time
    formattedData.sort((a, b) => {
      if (a.fullDate === b.fullDate) {
        return a.time.localeCompare(b.time);
      }
      return a.fullDate.localeCompare(b.fullDate);
    });

    setChartData(formattedData);
  };

  const currentVitalType = vitalTypeOptions.find(option => option.id === vitalType) || vitalTypeOptions[0];

  // If no vitals or all filtered out
  if (!patientVitals || patientVitals.length === 0 || chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-medium text-lg">Patient Vitals Chart</h2>
          <div className="flex gap-2">
            <select
              className="border rounded-md px-3 py-1.5 bg-white text-sm"
              value={vitalType}
              onChange={(e) => setVitalType(e.target.value)}
            >
              {vitalTypeOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-center gap-2 mb-4">
          <TimeRangeButton range="week" current={timeRange} onClick={setTimeRange} />
          <TimeRangeButton range="month" current={timeRange} onClick={setTimeRange} />
          <TimeRangeButton range="year" current={timeRange} onClick={setTimeRange} />
        </div>
        <div className="mt-4 text-gray-500 text-center py-8">
          No vital data available for the selected period
        </div>
      </div>
    );
  }

  // Dynamically determine which lines to show
  const lines = [];
  
  if (vitalType === 'all') {
    // Group unique types
    const uniqueTypes = [...new Set(chartData.map(item => item.type))];
    
    // Create a line for each type
    uniqueTypes.forEach(type => {
      const typeOption = vitalTypeOptions.find(option => option.id === type);
      if (typeOption) {
        lines.push({
          dataKey: 'primaryValue',
          name: typeOption.label,
          stroke: typeOption.primaryColor,
          type: type
        });
        
        if (typeOption.hasSecondaryValue) {
          lines.push({
            dataKey: 'secondaryValue',
            name: `${typeOption.label} (Secondary)`,
            stroke: typeOption.secondaryColor,
            type: type
          });
        }
      }
    });
  } else {
    // Show lines for specific vital type
    lines.push({
      dataKey: 'primaryValue',
      name: currentVitalType.hasSecondaryValue ? "Systolic" : currentVitalType.label,
      stroke: currentVitalType.primaryColor
    });
    
    if (currentVitalType.hasSecondaryValue) {
      lines.push({
        dataKey: 'secondaryValue',
        name: "Diastolic",
        stroke: currentVitalType.secondaryColor
      });
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-medium text-lg">Patient Vitals Chart</h2>
        <div className="flex gap-2">
          <select
            className="border rounded-md px-3 py-1.5 bg-white text-sm"
            value={vitalType}
            onChange={(e) => setVitalType(e.target.value)}
          >
            {vitalTypeOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="flex justify-center gap-2 mb-4">
        <TimeRangeButton range="week" current={timeRange} onClick={setTimeRange} />
        <TimeRangeButton range="month" current={timeRange} onClick={setTimeRange} />
        <TimeRangeButton range="year" current={timeRange} onClick={setTimeRange} />
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip 
              formatter={(value, name, props) => {
                const matchingOption = vitalTypeOptions.find(opt => 
                  name.includes(opt.label) || 
                  (opt.hasSecondaryValue && (name === "Systolic" || name === "Diastolic"))
                );
                return [`${value} ${matchingOption?.unit || ''}`, name];
              }}
              labelFormatter={(label, items) => {
                const dataPoint = chartData.find(item => item.date === label);
                return `${label} ${dataPoint?.time || ''}`;
              }}
            />
            <Legend />
            
            {vitalType === 'all' ? (
              // For "All Vitals" we need to create separate datasets for each type
              lines.map((line, index) => {
                const typeData = chartData.filter(item => item.type === line.type);
                return (
                  <Line
                    key={`${line.type}-${line.dataKey}-${index}`}
                    type="monotone"
                    data={typeData}
                    dataKey={line.dataKey}
                    name={line.name}
                    stroke={line.stroke}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                );
              })
            ) : (
              // For specific vital type
              lines.map((line, index) => (
                <Line
                  key={`${line.dataKey}-${index}`}
                  type="monotone"
                  dataKey={line.dataKey}
                  name={line.name}
                  stroke={line.stroke}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))
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

export default PatientVitalsChart;