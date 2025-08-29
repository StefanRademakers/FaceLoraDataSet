import React from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import IconButton from '@mui/material/IconButton';
import HomeIcon from '@mui/icons-material/Home';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import DescriptionIcon from '@mui/icons-material/Description';
import ArchiveIcon from '@mui/icons-material/Archive';
import ScienceIcon from '@mui/icons-material/Science';

interface TabBarProps {
  activeTab: 'images' | 'descriptions' | 'export' | 'train' | 'dataset-check' | 'help';
  setActiveTab: (tab: 'images' | 'descriptions' | 'export' | 'train' | 'dataset-check' | 'help') => void;
  onGoToLanding: () => void;
}

const TabBar: React.FC<TabBarProps> = ({ activeTab, setActiveTab, onGoToLanding }) => {
  const tabs: Array<'images' | 'descriptions' | 'export' | 'train' | 'dataset-check' | 'help'> = ['images', 'descriptions', 'export', 'train', 'dataset-check', 'help'];
  const tabIndex = tabs.indexOf(activeTab);
  return (
    <div className="mb-4 flex items-center" style={{ background: '#222', borderRadius: 8, padding: 8 }}>
      <IconButton onClick={onGoToLanding} sx={{ color: '#90caf9', mr: 2 }}>
        <HomeIcon />
      </IconButton>
      <Tabs
        value={tabIndex}
        onChange={(_, idx) => setActiveTab(tabs[idx])}
        textColor="inherit"
        TabIndicatorProps={{ style: { background: '#90caf9' } }}
        sx={{ minHeight: 0 }}
      >
        <Tab icon={<PhotoLibraryIcon />} iconPosition="start" label="images" sx={{ color: 'white', minHeight: 0, textTransform: 'lowercase', fontSize: 16, fontWeight: 500 }} />
        <Tab icon={<DescriptionIcon />} iconPosition="start" label="descriptions" sx={{ color: 'white', minHeight: 0, textTransform: 'lowercase', fontSize: 16, fontWeight: 500 }} />
  <Tab icon={<ArchiveIcon />} iconPosition="start" label="export" sx={{ color: 'white', minHeight: 0, textTransform: 'lowercase', fontSize: 16, fontWeight: 500 }} />
  <Tab icon={<ScienceIcon />} iconPosition="start" label="train lora" sx={{ color: 'white', minHeight: 0, textTransform: 'lowercase', fontSize: 16, fontWeight: 500 }} />
  <Tab icon={<ScienceIcon />} iconPosition="start" label="dataset check" sx={{ color: 'white', minHeight: 0, textTransform: 'lowercase', fontSize: 16, fontWeight: 500 }} />
  <Tab icon={<DescriptionIcon />} iconPosition="start" label="help" sx={{ color: 'white', minHeight: 0, textTransform: 'lowercase', fontSize: 16, fontWeight: 500 }} />
      </Tabs>
    </div>
  );
};

export default TabBar;
