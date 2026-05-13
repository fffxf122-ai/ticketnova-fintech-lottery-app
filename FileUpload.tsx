import { useState, useRef, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface FileUploadProps {
  label: string;
  icon: string;
  description?: string;
  accept?: string;
  maxSizeMB?: number;
  onFileSelect: (file: File | null, preview: string | null) => void;
  value?: string | null;
  error?: string;
}

export default function FileUpload({
  label,
  icon,
  description = 'JPG, PNG • Max 5MB',
  accept = 'image/jpeg,image/png,image/jpg',
  maxSizeMB = 5,
  onFileSelect,
  value,
  error,
}: FileUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    // Validate type
    const validTypes = accept.split(',').map(t => t.trim());
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type');
      return;
    }

    // Validate size
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File too large. Maximum: ${maxSizeMB}MB`);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setPreview(result);
      onFileSelect(file, result);
    };
    reader.readAsDataURL(file);
    toast.success('File uploaded successfully');
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleRemove = () => {
    setPreview(null);
    onFileSelect(null, null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {preview ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative rounded-2xl overflow-hidden border border-green-500/30 bg-green-500/5"
          >
            <img
              src={preview}
              alt="Preview"
              className="w-full h-40 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-xs">
                  ✓
                </div>
                <span className="text-sm font-medium text-white">{label}</span>
              </div>
              <button
                onClick={handleRemove}
                className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30 transition-colors"
              >
                Remove
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => inputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${
              isDragging
                ? 'border-gold/50 bg-gold/[0.05]'
                : error
                ? 'border-red-500/30 bg-red-500/[0.02]'
                : 'border-white/10 hover:border-gold/20 hover:bg-white/[0.02]'
            }`}
          >
            <span className="text-4xl">{icon}</span>
            <p className="text-sm text-white/40 mt-2">{label}</p>
            <p className="text-[10px] text-white/20 mt-1">{description}</p>
            {isDragging && (
              <div className="absolute inset-0 flex items-center justify-center bg-gold/[0.05] rounded-2xl">
                <p className="text-gold font-medium">Drop file here</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}
