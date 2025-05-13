import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  vitalType: {
    type: String,
    required: true,
    enum: ['blood-pressure', 'heart-rate', 'blood-sugar', 'body-temperature', 'weight', 'oxygen-level']
  },
  frequency: {
    type: String,
    required: true,
    enum: ['daily', 'weekly']
  },
  time: {
    type: String,
    required: true
  },
  daysOfWeek: {
    type: [String],
    default: [],
    validate: {
      validator: function(v) {
        if (this.frequency === 'weekly') {
          return v.length > 0;
        }
        return true;
      },
      message: 'Weekly reminders must have at least one day selected'
    }
  },
  active: {
    type: Boolean,
    default: true
  },
  notificationMethod: {
    type: [String],
    enum: ['email', 'whatsapp'],
    default: ['email']
  },
  lastSent: {
    type: Date,
    default: null
  },
  nextScheduled: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Pre-save hook to calculate next scheduled time
reminderSchema.pre('save', function(next) {
  // Only update nextScheduled if lastSent exists or reminder parameters changed
  if (this.isModified('frequency') || this.isModified('time') || 
      this.isModified('daysOfWeek') || this.isModified('active') || 
      this.lastSent !== null) {
    
    this.nextScheduled = calculateNextScheduledTime(this);
  }
  next();
});

// Function to calculate the next time a reminder should be sent
function calculateNextScheduledTime(reminder) {
  const now = new Date();
  let nextScheduled;
  
  if (reminder.lastSent) {
    // If reminder was sent before, calculate next time from last sent
    nextScheduled = new Date(reminder.lastSent);
  } else {
    // For first-time scheduling, use current time
    nextScheduled = new Date(now);
  }
  
  // Parse the time components from the time string (HH:MM)
  const [hours, minutes] = reminder.time.split(':').map(Number);
  
  if (reminder.frequency === 'daily') {
    // For daily reminders, set the next occurrence to today at the specified time
    nextScheduled.setHours(hours, minutes, 0, 0);
    
    // If the calculated time is in the past (already occurred today),
    // move to tomorrow
    if (nextScheduled <= now) {
      nextScheduled.setDate(nextScheduled.getDate() + 1);
    }
    
  } else if (reminder.frequency === 'weekly') {
    // For weekly reminders, find the next day of the week that matches
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysMap = {
      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
      'thursday': 4, 'friday': 5, 'saturday': 6
    };
    
    // Convert user-selected days to day numbers
    const selectedDays = reminder.daysOfWeek.map(day => daysMap[day.toLowerCase()]);
    
    if (selectedDays.length === 0) {
      // Fallback if no days are selected (shouldn't happen due to validation)
      selectedDays.push(currentDay);
    }
    
    // Sort days to find the next upcoming day
    selectedDays.sort((a, b) => a - b);
    
    // Find the next day that comes after the current day
    let nextDay = selectedDays.find(day => day > currentDay);
    
    // If no day is found, wrap around to the first day of the next week
    if (nextDay === undefined) {
      nextDay = selectedDays[0];
      // Calculate days to add (days until the end of the week + first selected day)
      const daysToAdd = (7 - currentDay) + nextDay;
      nextScheduled.setDate(nextScheduled.getDate() + daysToAdd);
    } else {
      // Calculate days to add (difference between next day and current day)
      const daysToAdd = nextDay - currentDay;
      nextScheduled.setDate(nextScheduled.getDate() + daysToAdd);
    }
    
    // Set the time for the scheduled day
    nextScheduled.setHours(hours, minutes, 0, 0);
  }
  
  // If reminder was recently sent, ensure we don't schedule it too soon
  if (reminder.lastSent) {
    const minInterval = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
    const earliestNextTime = new Date(reminder.lastSent.getTime() + minInterval);
    
    if (nextScheduled < earliestNextTime) {
      // If the calculated next time is too soon, add a day (for daily)
      // or a week (for weekly)
      if (reminder.frequency === 'daily') {
        nextScheduled.setDate(nextScheduled.getDate() + 1);
      } else {
        nextScheduled.setDate(nextScheduled.getDate() + 7);
      }
    }
  }
  
  return nextScheduled;
}

// Add method to postpone reminder by a specified amount of time
reminderSchema.methods.postpone = async function(hours = 1) {
  const now = new Date();
  // Set next scheduled time to current time + specified hours
  this.nextScheduled = new Date(now.getTime() + (hours * 60 * 60 * 1000));
  return this.save();
};

const Reminder = mongoose.model('Reminder', reminderSchema);

export default Reminder;