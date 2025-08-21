import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import { format, parseISO, isValid } from 'date-fns';
import { faIR } from 'date-fns/locale'; // Persian locale
import 'react-datepicker/dist/react-datepicker.css'; // Default styles for react-datepicker

// Props for customization
const DateManager = ({
  initialDate = new Date(), // Default to current date
  locale = 'en-US', // Default locale
  dateFormat = 'yyyy/MM/dd HH:mm', // Default format
  onDateChange = () => {}, // Callback for date changes
  showTimeSelect = true, // Option to include time
  label = 'Select Date', // Label for accessibility
  disabled = false, // Disable the picker
  className = '', // Custom styles
}) => {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [error, setError] = useState(null);

  // Handle date change
  const handleDateChange = (date) => {
    if (!isValid(date)) {
      setError('Invalid date selected');
      setSelectedDate(null);
      onDateChange(null);
      return;
    }

    setSelectedDate(date);
    setError(null);
    onDateChange(date); // Pass the raw date to the parent
  };

  // Format the date for display
  const formattedDate = selectedDate
    ? format(selectedDate, dateFormat, { locale: locale === 'fa-IR' ? faIR : undefined })
    : 'No date selected';

  return (
    <div className={`date-manager ${className}`}>
      <label htmlFor="date-picker" className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <DatePicker
        id="date-picker"
        selected={selectedDate}
        onChange={handleDateChange}
        dateFormat={dateFormat}
        locale={locale === 'fa-IR' ? faIR : locale}
        showTimeSelect={showTimeSelect}
        timeFormat="HH:mm"
        timeIntervals={15} // 15-minute intervals for time selection
        disabled={disabled}
        className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
        placeholderText="Select a date"
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby="date-error"
      />
      {error && (
        <p id="date-error" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="mt-2 text-sm text-gray-600">
        <strong>Formatted Date:</strong> {formattedDate}
      </div>
    </div>
  );
};

export default DateManager;