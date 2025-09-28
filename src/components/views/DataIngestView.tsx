import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File as FileIcon, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileUpload, UploadStatus } from '@/types';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
const StatusIcon = ({ status }: { status: UploadStatus }) => {
  switch (status) {
    case 'Complete':
      return <CheckCircle className="w-6 h-6 text-green-500" />;
    case 'Uploading':
      return <Loader2 className="w-6 h-6 text-black animate-spin" />;
    case 'Error':
      return <XCircle className="w-6 h-6 text-red-500" />;
    default:
      return null;
  }
};
export function DataIngestView() {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newUploads: FileUpload[] = acceptedFiles.map(file => ({
      id: `${file.name}-${file.lastModified}-${file.size}`,
      file,
      status: 'Uploading',
      progress: 0,
    }));
    setFiles(prevFiles => [...newUploads, ...prevFiles]);
    newUploads.forEach(upload => {
      const formData = new FormData();
      formData.append('file', upload.file);
      fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      .then(response => {
        if (!response.ok) {
          return response.json().then(err => { throw new Error(err.error || 'Upload failed') });
        }
        return response.json();
      })
      .then(data => {
        setFiles(currentFiles =>
          currentFiles.map(f =>
            f.id === upload.id ? { ...f, status: 'Complete', progress: 100 } : f
          )
        );
        toast.success(`File "${upload.file.name}" uploaded successfully!`);
      })
      .catch(error => {
        setFiles(currentFiles =>
          currentFiles.map(f =>
            f.id === upload.id ? { ...f, status: 'Error', error: error.message } : f
          )
        );
        toast.error(`Upload failed for "${upload.file.name}": ${error.message}`);
      });
    });
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] } });
  return (
    <div className="w-full max-w-7xl mx-auto space-y-12">
      <header>
        <h1 className="text-4xl md:text-6xl">Data Ingest</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Upload your financial documents. PDFs and images are supported.
        </p>
      </header>
      <div
        {...getRootProps()}
        className={cn(
          'brutalist-card p-8 md:p-12 text-center cursor-pointer border-dashed hover:border-solid hover:bg-yellow-300/20 transition-all duration-200',
          isDragActive ? 'border-solid bg-brand-yellow/30' : ''
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-4">
          <UploadCloud className="w-16 h-16 text-black" />
          <p className="text-2xl font-bold">
            {isDragActive ? 'Drop the files here ...' : "Drag 'n' drop files here, or click to select"}
          </p>
          <p className="text-muted-foreground">PDF, PNG, JPG supported. Max file size: 25MB</p>
        </div>
      </div>
      <div className="brutalist-card">
        <div className="p-6 border-b-2 border-black">
          <h2 className="text-2xl font-bold">Upload Status</h2>
        </div>
        <div className="p-2 md:p-4">
          {files.length === 0 && (
            <p className="p-4 text-center text-muted-foreground">No files uploaded yet.</p>
          )}
          {files.map((upload) => (
            <div key={upload.id} className="grid grid-cols-1 md:grid-cols-4 items-center gap-4 p-4 border-b-2 border-dashed border-black/10 last:border-b-0">
              <div className="flex items-center gap-3 col-span-1 md:col-span-2">
                <FileIcon className="w-6 h-6 flex-shrink-0" />
                <div className="flex-grow overflow-hidden">
                  <p className="font-bold truncate">{upload.file.name}</p>
                  {upload.status === 'Error' && <p className="text-red-500 text-sm truncate">{upload.error}</p>}
                </div>
              </div>
              <div className="text-muted-foreground">{`${(upload.file.size / 1024 / 1024).toFixed(2)} MB`}</div>
              <div className="flex items-center gap-3">
                <StatusIcon status={upload.status} />
                <span className="font-bold">{upload.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}