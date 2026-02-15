import React, { useState, useRef } from 'react';
import { scanApi } from '../utils/api';

interface ScannerProps {
  onScanComplete: (sessionId: string) => void;
}

const Scanner: React.FC<ScannerProps> = ({ onScanComplete }) => {
  const [selectedFile, setSelectedFile] = useState<File | Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compress image to ~1280px wide maximum (saves upload time & processing time)
  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const scale = MAX_WIDTH / img.width;

        if (scale < 1) {
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scale;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Compression failed'));
        }, 'image/jpeg', 0.8);
      };
      img.onerror = (err) => reject(err);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const compressed = await compressImage(file);
      setSelectedFile(compressed);
      setPreview(URL.createObjectURL(compressed));
    } catch (err) {
      setError('Failed to process image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      const result = await scanApi.uploadImage(selectedFile as File);
      onScanComplete(result.sessionId);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="scanner-container">
      <div className="scanner-card">
        {!preview ? (
          <div className="upload-area">
            <div className="upload-icon">📸</div>
            <p className="description">Capture your bookshelf to get AI recommendations instantly.</p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            <button
              className="btn btn-primary btn-large"
              onClick={() => fileInputRef.current?.click()}
            >
              Take Photo
            </button>

            <div className="divider">or</div>

            <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
              Choose from Gallery
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        ) : (
          <div className="preview-area">
            <div className="preview-image-container">
              <img src={preview} alt="Preview" className="preview-image" />
            </div>
            <div className="preview-actions">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSelectedFile(null);
                  setPreview(null);
                }}
                disabled={isUploading}
              >
                Retake
              </button>

              <button
                className="btn btn-primary"
                onClick={handleUpload}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <span className="spinner-small" style={{ marginRight: '10px' }}></span>
                    Analysing...
                  </>
                ) : 'Find Books'}
              </button>
            </div>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        <div className="tips">
          💡 Tip: For best results, ensure book titles are clearly visible and well-lit.
        </div>
      </div>
    </div>
  );
};

export default Scanner;
