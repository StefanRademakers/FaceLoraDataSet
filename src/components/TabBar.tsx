import React from 'react';

interface TabBarProps {
  activeTab: 'images' | 'descriptions' | 'export';
  setActiveTab: (tab: 'images' | 'descriptions' | 'export') => void;
  onGoToLanding: () => void;
}

const TabBar: React.FC<TabBarProps> = ({ activeTab, setActiveTab, onGoToLanding }) => {
  return (
    <div className="mb-4">
      <button
        onClick={onGoToLanding}
        className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 mr-2"
      >
        Home
      </button>
      <button
        onClick={() => setActiveTab('images')}
        className={`px-4 py-2 rounded-lg ${activeTab === 'images' ? 'bg-blue-500 text-white' : 'bg-gray-500 text-black'}`}
      >
        Images
      </button>
      <button
        onClick={() => setActiveTab('descriptions')}
        className={`ml-2 px-4 py-2 rounded-lg ${activeTab === 'descriptions' ? 'bg-blue-500 text-white' : 'bg-gray-500 text-black'}`}
      >
        Descriptions
      </button>
      <button
        onClick={() => setActiveTab('export')}
        className={`ml-2 px-4 py-2 rounded-lg ${activeTab === 'export' ? 'bg-blue-500 text-white' : 'bg-gray-500 text-black'}`}
      >
        Export
      </button>
    </div>
  );
};

export default TabBar;
