import ToolBar from '../../elements/toolBar/toolbar';
import FileList from '../../elements/fileList/fileList';
import styles from './favourites.module.scss';
import SearchBar from '../../elements/searchBar/searchbar';
import ManageFiles from '../../elements/manageFiles/manageFiles';
import { useState } from 'react';

export default function Favourites() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
    
  const handleFileUploaded = () => {
    setRefreshTrigger(prev => prev + 1);
  };
  
  return (
    <ToolBar>
      <SearchBar></SearchBar>
      <div className={styles.mainContent}>
        <div className={styles.header}>
          <h1>Favourites</h1>
        </div>
        <div style={{"width": "80%"}}>
            <FileList mode="favourites" />
        </div>
      </div>
      <ManageFiles onFileUploaded={handleFileUploaded} />
    </ToolBar>
  );
}
