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

