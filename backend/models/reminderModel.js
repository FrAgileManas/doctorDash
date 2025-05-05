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
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ // HH:MM format
  },
  daysOfWeek: {
    type: [String],
    validate: {
      validator: function(days) {
        if (this.frequency === 'weekly') {
          // Must have at least one day selected for weekly frequency
          return days && days.length > 0;
        }
        return true;
      },
      message: 'At least one day must be selected for weekly reminders'
    },
    enum: {
      values: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      message: '{VALUE} is not a valid day of the week'
    }
  },
  active: {
    type: Boolean,
    default: true
  },
  lastSent: {
    type: Date,
    default: null
  },
  nextScheduled: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for faster lookup when processing reminders
reminderSchema.index({ userId: 1, active: 1, nextScheduled: 1 });

// Pre-save hook to calculate the next scheduled date
reminderSchema.pre('save', function(next) {
  if (this.active) {
    this.nextScheduled = calculateNextReminderTime(this);
  }
  next();
});

// Method to check if a reminder is due
reminderSchema.methods.isDue = function() {
  return this.active && this.nextScheduled && this.nextScheduled <= new Date();
};

// Helper function to calculate the next reminder time
const calculateNextReminderTime = (reminder) => {
  const now = new Date();
  const [hours, minutes] = reminder.time.split(':').map(Number);
  
  let nextDate = new Date();
  nextDate.setHours(hours, minutes, 0, 0);
  
  // If the time already passed today, move to the next occurrence
  if (nextDate <= now) {
    nextDate.setDate(nextDate.getDate() + 1);
  }
  
  if (reminder.frequency === 'daily') {
    return nextDate;
  } else if (reminder.frequency === 'weekly') {
    // Find the next day that matches one of the selected days
    const dayMap = {
      'sunday': 0,
      'monday': 1,
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
      'friday': 5,
      'saturday': 6
    };
    
    const currentDay = nextDate.getDay();
    let daysToAdd = 0;
    let found = false;
    
    // Check up to 7 days ahead to find the next matching day
    for (let i = 0; i < 7; i++) {
      const checkDay = (currentDay + i) % 7;
      const dayName = Object.keys(dayMap).find(key => dayMap[key] === checkDay);
      
      if (reminder.daysOfWeek.includes(dayName)) {
        daysToAdd = i;
        found = true;
        break;
      }
    }
    
    if (found) {
      nextDate.setDate(nextDate.getDate() + daysToAdd);
      return nextDate;
    }
  }
  
  // Default fallback - should not reach here if data is valid
  return null;
};

const Reminder = mongoose.model('Reminder', reminderSchema);

export default Reminder;