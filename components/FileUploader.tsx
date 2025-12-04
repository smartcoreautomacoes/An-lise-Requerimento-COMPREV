import React, { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, X } from 'lucide-react';

interface FileUploaderProps {
  label: string;
  subLabel?: string;
  file: File | null;
  onFileSelect: (file: File | null) => void;
  accept?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ 
  label, 
  subLabel, 
  file, 
  onFileSelect,
  accept = ".xlsx, .xls"
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      
      {!file ? (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
            ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400 bg-white'}
          `}
        >
          <input
            type="file"
            ref={inputRef}
            className="hidden"
            accept={accept}
            onChange={handleChange}
          />
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className={`p-3 rounded-full ${isDragOver ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
              <Upload size={24} />
            </div>
            <div className="text-sm text-slate-600">
              <span className="font-semibold text-blue-600 hover:text-blue-700">Clique para carregar</span> ou arraste o arquivo
            </div>
            {subLabel && <p className="text-xs text-slate-400">{subLabel}</p>}
          </div>
        </div>
      ) : (
        <div className="relative bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg shrink-0">
              <FileSpreadsheet size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
              <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <button 
            onClick={() => onFileSelect(null)}
            className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
};