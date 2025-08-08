import React from 'react';
import TextField from '@mui/material/TextField';

// Define a more generic type for the descriptions object
type DescriptionData = {
  [key: string]: string;
};

interface DescriptionsProps {
  descriptions: DescriptionData;
  onDescriptionChange: (field: string, value: string) => void;
  onBlur: () => void;
  promptTemplate: string;
  onPromptTemplateChange: (value: string) => void;
}

const Descriptions: React.FC<DescriptionsProps> = ({ descriptions, onDescriptionChange, onBlur, promptTemplate, onPromptTemplateChange }) => {
  // We can filter out loraTrigger from being displayed as a large textarea
  const descriptionFields = Object.keys(descriptions).filter(key => key !== 'loraTrigger');

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Descriptions</h2>
      {/* Prompt Template Editor */}
      <div className="mb-6">
        <label htmlFor="promptTemplate" className="block text-lg font-medium mb-2">
          Prompt Template
        </label>
        <TextField
          id="promptTemplate"
          value={promptTemplate}
          onChange={(e) => onPromptTemplateChange(e.target.value)}
          onBlur={onBlur}
          fullWidth
          multiline
          minRows={6}
          variant="outlined"
          helperText="Use {{token}} and {{addition}} placeholders. {{addition}} resolves to optional subject addition (prefixed with space if present)."
          sx={{
            bgcolor: '#23272b',
            '& .MuiOutlinedInput-root': {
              color: 'white',
              '& fieldset': { borderColor: '#444' },
              '&:hover fieldset': { borderColor: '#90caf9' },
            },
            '& .MuiInputLabel-root': { color: '#90caf9' },
            '& .MuiFormHelperText-root': { color: '#90caf9' }
          }}
          InputLabelProps={{ style: { color: '#90caf9' } }}
        />
      </div>

      {descriptionFields.map((key) => (
        <div key={key} className="mb-4">
          <label htmlFor={key} className="block text-lg font-medium mb-2">
            {/* Simple logic to format the key into a nice label */}
            {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
          </label>
          <TextField
            id={key}
            value={descriptions[key] || ''}
            onChange={(e) => onDescriptionChange(key, e.target.value)}
            onBlur={onBlur}
            fullWidth
            multiline
            minRows={4}
            variant="outlined"
            sx={{
              bgcolor: '#23272b',
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': { borderColor: '#444' },
                '&:hover fieldset': { borderColor: '#90caf9' },
              },
              '& .MuiInputLabel-root': { color: '#90caf9' },
            }}
            InputLabelProps={{ style: { color: '#90caf9' } }}
          />
        </div>
      ))}
    </div>
  );
};

export default Descriptions;
