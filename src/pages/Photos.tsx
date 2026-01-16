import { useState, useEffect } from 'react';
import { getPhotos } from '../lib/database';
import type { Photo } from '../lib/database';

export default function Photos() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      const data = await getPhotos();
      setPhotos(data);
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPhotos = photos.filter((photo) =>
    photo.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePhotoClick = (photo: Photo) => {
    setSelectedPhoto(photo);
  };

  const closeModal = () => {
    setSelectedPhoto(null);
  };

  if (loading) {
    return (
      <div className="page photos-page">
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="page photos-page">
      <div className="page-header">
        <h1>사진</h1>
        <p className="page-desc">포토카드, 화보, 출근길 등</p>
        
        <div className="page-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="제목으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
      </div>

      {filteredPhotos.length === 0 ? (
        <div className="empty-state">
          <p>검색 결과가 없습니다 😢</p>
        </div>
      ) : (
        <div className="photo-grid">
          {filteredPhotos.map((photo) => (
            <article 
              key={photo.id} 
              className="photo-card"
              onClick={() => handlePhotoClick(photo)}
            >
              <div className="photo-image">
                <img src={photo.image_url} alt={photo.title} loading="lazy" />
              </div>
              <div className="photo-info">
                <h3 className="photo-title">{photo.title}</h3>
                <time className="photo-date">{photo.date}</time>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* 이미지 모달 */}
      {selectedPhoto && (
        <div className="photo-modal" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>✕</button>
            <img src={selectedPhoto.image_url} alt={selectedPhoto.title} />
            <div className="modal-info">
              <h3>{selectedPhoto.title}</h3>
              <time>{selectedPhoto.date}</time>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
