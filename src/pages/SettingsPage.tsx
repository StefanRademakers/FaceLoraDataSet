import React, { useEffect, useState } from 'react';
import { AppSettings } from '../interfaces/types';

interface SettingsPageProps {
  onGoBack: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onGoBack }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    window.electronAPI.getSettings().then(setSettings);
  }, []);

  const handleSelectDirectory = async () => {
    const newPath = await window.electronAPI.selectDirectory();
    if (newPath && settings) {
      const newSettings = { ...settings, loraDataRoot: newPath };
      setSettings(newSettings);
      window.electronAPI.setSettings(newSettings);
    }
  };

  const handleSave = () => {
    if (settings) {
      window.electronAPI.setSettings(settings);
    }
    onGoBack(); // Go back to the previous page
  };

  if (!settings) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Lora Data Root Directory
        </label>
        <div className="flex items-center">
          <input
            type="text"
            readOnly
            value={settings.loraDataRoot}
            className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          />
          <button
            onClick={handleSelectDirectory}
            className="ml-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg"
          >
            Browse
          </button>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          onClick={onGoBack}
          className="mr-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg"
        >
          Save and Go Back
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
