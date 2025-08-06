import React from 'react';

// Define a more generic type for the descriptions object
type DescriptionData = {
  [key: string]: string;
};

interface DescriptionsProps {
  descriptions: DescriptionData;
  onDescriptionChange: (field: string, value: string) => void;
  onBlur: () => void;
}

const Descriptions: React.FC<DescriptionsProps> = ({ descriptions, onDescriptionChange, onBlur }) => {
  // We can filter out loraTrigger from being displayed as a large textarea
  const descriptionFields = Object.keys(descriptions).filter(key => key !== 'loraTrigger');

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Descriptions</h2>
      {descriptionFields.map((key) => (
        <div key={key} className="mb-4">
          <label htmlFor={key} className="block text-lg font-medium mb-2">
            {/* Simple logic to format the key into a nice label */}
            {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
          </label>
          <textarea
            id={key}
            value={descriptions[key] || ''}
            onChange={(e) => onDescriptionChange(key, e.target.value)}
            onBlur={onBlur}
            className="bg-gray-800 border border-gray-600 rounded-lg w-full p-2"
            rows={4}
          />
        </div>
      ))}
    </div>
  );
};

export default Descriptions;
