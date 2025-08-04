import React from 'react';

interface DescriptionsProps {
  notes: string;
  faceDesc: string;
  clothesDesc: string;
  fullBodyDesc: string;
  envDesc: string;
  onNotesChange: (value: string) => void;
  onFaceDescChange: (value: string) => void;
  onClothesDescChange: (value: string) => void;
  onFullBodyDescChange: (value: string) => void;
  onEnvDescChange: (value: string) => void;
}

const Descriptions: React.FC<DescriptionsProps> = ({
  notes,
  faceDesc,
  clothesDesc,
  fullBodyDesc,
  envDesc,
  onNotesChange,
  onFaceDescChange,
  onClothesDescChange,
  onFullBodyDescChange,
  onEnvDescChange,
}) => {
  return (
    <div className="space-y-4 p-4">
      <div>
        <label htmlFor="notes" className="block text-lg font-medium mb-2">Notes</label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded-lg w-full p-2"
          rows={4}
        />
      </div>
      <div>
        <label htmlFor="faceDesc" className="block text-lg font-medium mb-2">Face image description</label>
        <textarea
          id="faceDesc"
          value={faceDesc}
          onChange={(e) => onFaceDescChange(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded-lg w-full p-2"
          rows={4}
        />
      </div>
      <div>
        <label htmlFor="clothesDesc" className="block text-lg font-medium mb-2">Clothes Image description</label>
        <textarea
          id="clothesDesc"
          value={clothesDesc}
          onChange={(e) => onClothesDescChange(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded-lg w-full p-2"
          rows={4}
        />
      </div>
      <div>
        <label htmlFor="fullBodyDesc" className="block text-lg font-medium mb-2">Full body & clothes description</label>
        <textarea
          id="fullBodyDesc"
          value={fullBodyDesc}
          onChange={(e) => onFullBodyDescChange(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded-lg w-full p-2"
          rows={4}
        />
      </div>
      <div>
        <label htmlFor="envDesc" className="block text-lg font-medium mb-2">Environment description</label>
        <textarea
          id="envDesc"
          value={envDesc}
          onChange={(e) => onEnvDescChange(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded-lg w-full p-2"
          rows={4}
        />
      </div>
    </div>
  );
};

export default Descriptions;
