import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Search, Upload, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { listFilesFromImageKit, uploadImageToImageKit } from '../utils/imagekit';

const ImagePickerModal = ({ isOpen, onClose, onSelect, folder = 'Restaurant-Pro-Images' }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const fileInputRef = useRef(null);

  const PAGE_SIZE = 32;

  useEffect(() => {
    if (isOpen) {
      loadImages(1);
    }
  }, [isOpen]);

  const loadImages = async (pageNum) => {
    setLoading(true);
    try {
      const skip = (pageNum - 1) * PAGE_SIZE;
      const data = await listFilesFromImageKit({ path: folder, limit: PAGE_SIZE, skip });
      
      if (data.length < PAGE_SIZE) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
      
      setImages(data);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching images:', error);
      toast.error('Failed to load images from gallery');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploading(true);
    try {
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\s]/g, '').replace(/\s+/g, '_')}`;
      const result = await uploadImageToImageKit(file, fileName, folder);
      toast.success('Image uploaded successfully!');
      
      // Select the newly uploaded image
      onSelect(result.url);
      onClose();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const filteredImages = images.filter(img => 
    img.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[60] p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
      <div className="bg-white w-full max-w-4xl p-0 flex flex-col max-h-[85vh] shadow-2xl overflow-hidden rounded-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Select Image</h2>
            <p className="text-xs text-gray-500">Pick from existing gallery or upload new</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex flex-col sm:flex-row items-center gap-3 flex-shrink-0">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search images..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 focus:outline-none focus:border-[#ec2b25] bg-white text-sm"
            />
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-[#ec2b25] text-white font-bold hover:bg-[#d12620] transition-all disabled:opacity-50 cursor-pointer shadow-sm text-sm"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span>{uploading ? 'Uploading...' : 'Upload New'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-white min-h-[300px]">
          {loading && images.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full space-y-3 py-12">
              <Loader2 className="w-10 h-10 animate-spin text-[#ec2b25]" />
              <p className="text-gray-500 font-medium">Loading gallery...</p>
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <p className="text-gray-400 font-medium">No images found</p>
              <p className="text-xs text-gray-400 mt-1">Try a different search or upload a new image</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
              {filteredImages.map((img) => (
                <div 
                  key={img.fileId}
                  onClick={() => setSelectedImage(img.url)}
                  className={`group relative aspect-square border-2 transition-all p-2 bg-gray-50 hover:bg-white cursor-pointer rounded-lg ${
                    selectedImage === img.url 
                      ? 'border-[#ec2b25] bg-white ring-4 ring-red-50' 
                      : 'border-transparent hover:border-gray-200'
                  }`}
                >
                  <img 
                    src={img.thumbnailUrl || img.url} 
                    alt={img.name} 
                    className="w-full h-full object-cover rounded-md"
                    loading="lazy"
                  />
                  {selectedImage === img.url && (
                    <div className="absolute top-2 right-2 bg-white rounded-full p-0.5">
                      <CheckCircle2 className="w-6 h-6 text-[#ec2b25]" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[10px] text-white truncate">{img.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with Selection Actions and Pagination */}
        <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 flex-shrink-0 bg-white">
          {/* Pagination */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadImages(page - 1)}
              disabled={loading || page === 1}
              className="p-2 border border-gray-200 hover:bg-gray-50 disabled:opacity-30 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-bold text-gray-700 min-w-[60px] text-center">
              Page {page}
            </span>
            <button
              onClick={() => loadImages(page + 1)}
              disabled={loading || !hasMore}
              className="p-2 border border-gray-200 hover:bg-gray-50 disabled:opacity-30 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (selectedImage) {
                  onSelect(selectedImage);
                  onClose();
                }
              }}
              disabled={!selectedImage || loading}
              className="flex-1 sm:flex-none px-8 py-2 bg-[#ec2b25] text-white font-bold hover:bg-[#d12620] transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-lg cursor-pointer shadow-md text-sm"
            >
              Select Image
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImagePickerModal;
