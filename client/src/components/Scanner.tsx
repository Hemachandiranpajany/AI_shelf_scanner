import React, { useState, useRef } from 'react';
import { scanApi } from '../utils/api';

interface ScannerProps {
  onScanComplete: (sessionId: string) => void;
}

const Scanner: React.FC<ScannerProps> = ({ onScanComplete }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      const result = await scanApi.uploadImage(selectedFile);
      onScanComplete(result.sessionId);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="scanner-container">
      <div className="scanner-card">
        <h2>Scan Your Bookshelf</h2>
        <p className="description">
          Take a photo of your bookshelf to discover books and get personalized recommendations
        </p>

        {!preview ? (
          <div className="upload-area">
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
              onClick={handleCameraCapture}
            >
              📷 Take Photo
            </button>

            <div className="divider">or</div>

            <label className="btn btn-secondary btn-large">
              📁 Choose from Gallery
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
            <img src={preview} alt="Preview" className="preview-image" />
            
            <div className="preview-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setSelectedFile(null);
                  setPreview(null);
                }}
              >
                Choose Different Photo
              </button>
              
              <button
                className="btn btn-primary"
                onClick={handleUpload}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Analyze Books'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="tips">
          <h3>📌 Tips for best results:</h3>
          <ul>
            <li>Ensure good lighting</li>
            <li>Keep camera parallel to bookshelf</li>
            <li>Make sure book spines are clearly visible</li>
            <li>Avoid glare and shadows</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Scanner;
