export interface FileMetadata {
  id: string;
  filename: string;
  original_name: string;
  size: number;
  mime_type: string;
  sha256: string;
  virtual_path: string;
  folder_name: string;
  created_at: string;
  updated_at: string;
  is_starred?: boolean;
}

export interface FileUploadResponse {
  id: string;
  filename: string;
  size: number;
  mime_type: string;
  sha256: string;
  virtual_path: string;
  folder_name: string;
  created_at: string;
}

export interface FileListResponse {
  files: FileMetadata[];
}


export interface StorageStats {
  total_used: number;
  image_size: number;
  video_size: number;
  doc_size: number;
  other_size: number;
  trash_size: number;
  limit: number;
  physical_total: number;
  physical_free: number;
}
