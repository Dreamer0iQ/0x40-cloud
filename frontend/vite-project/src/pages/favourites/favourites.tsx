import ToolBar from '../../elements/toolBar/toolbar';
import FileList from '../../elements/fileList/fileList';
import styles from './favourites.module.scss';
import SearchBar from '../../elements/searchBar/searchbar';
import ManageFiles from '../../elements/manageFiles/manageFiles';
import { useState, useRef } from 'react';

export default function Favourites() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const manageFilesRef = useRef<any>(null);
    
  const handleFileUploaded = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (manageFilesRef.current?.handleDroppedFiles) {
        manageFilesRef.current.handleDroppedFiles(e.dataTransfer.files);
      }
    }
  };
  
  return (
    <div 
      className={styles.favouritesWrapper}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className={styles.dropOverlay}>
          <div className={styles.dropMessage}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M20 21H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>Отпустите файлы для загрузки</span>
          </div>
        </div>
      )}
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
        <ManageFiles ref={manageFilesRef} onFileUploaded={handleFileUploaded} />
      </ToolBar>
    </div>
  );
}
