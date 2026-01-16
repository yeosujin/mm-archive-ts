import { useState } from 'react';
import { photos } from '../data/mockData';

export default function Photos() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const filteredPhotos = photos.filter((photo) =>
    photo.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePhotoClick = (photoId: string) => {
    setSelectedPhoto(photoId);
  };

  const closeModal = () => {
    setSelectedPhoto(null);
  };

  const selectedPhotoData = photos.find((p) => p.id === selectedPhoto);

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
              onClick={() => handlePhotoClick(photo.id)}
            >
              <div className="photo-image">
                <img src={photo.imageUrl} alt={photo.title} loading="lazy" />
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
      {selectedPhotoData && (
        <div className="photo-modal" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>✕</button>
            <img src={selectedPhotoData.imageUrl} alt={selectedPhotoData.title} />
            <div className="modal-info">
              <h3>{selectedPhotoData.title}</h3>
              <time>{selectedPhotoData.date}</time>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
