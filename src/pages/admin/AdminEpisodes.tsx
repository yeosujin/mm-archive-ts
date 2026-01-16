import { useState, useEffect } from 'react';
import { getEpisodes, createEpisode, deleteEpisode } from '../../lib/database';
import type { Episode } from '../../lib/database';

interface MessageInput {
  type: 'text' | 'image';
  content: string;
  time: string;
}

export default function AdminEpisodes() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    date: '',
  });
  const [messages, setMessages] = useState<MessageInput[]>([
    { type: 'text', content: '', time: '' }
  ]);

  useEffect(() => {
    loadEpisodes();
  }, []);

  const loadEpisodes = async () => {
    try {
      const data = await getEpisodes();
      setEpisodes(data);
    } catch (error) {
      console.error('Error loading episodes:', error);
    } finally {
      setLoading(false);
    }
  };

  const addMessage = () => {
    setMessages([...messages, { type: 'text', content: '', time: '' }]);
  };

  const removeMessage = (index: number) => {
    if (messages.length > 1) {
      setMessages(messages.filter((_, i) => i !== index));
    }
  };

  const updateMessage = (index: number, field: keyof MessageInput, value: string) => {
    const updated = [...messages];
    updated[index] = { ...updated[index], [field]: value };
    setMessages(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validMessages = messages.filter(m => m.content.trim() !== '');
    if (validMessages.length === 0) {
      alert('최소 하나의 메시지를 입력해주세요.');
      return;
    }
    
    try {
      await createEpisode({
        title: formData.title,
        date: formData.date,
        messages: validMessages,
      });
      
      alert('에피소드가 추가되었어요!');
      setFormData({ title: '', date: '' });
      setMessages([{ type: 'text', content: '', time: '' }]);
      loadEpisodes();
    } catch (error) {
      console.error('Error creating episode:', error);
      alert('에피소드 추가 중 오류가 발생했어요.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠어요?')) return;
    
    try {
      await deleteEpisode(id);
      alert('삭제되었어요!');
      loadEpisodes();
    } catch (error) {
      console.error('Error deleting episode:', error);
      alert('삭제 중 오류가 발생했어요.');
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <h1>에피소드 관리</h1>
      
      <div className="admin-section">
        <h2>새 에피소드 추가</h2>
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label htmlFor="episode-title">제목</label>
            <input
              id="episode-title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="뭐했냐면요 (선택)"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="episode-date">날짜 *</label>
            <input
              id="episode-date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>메시지들</label>
            {messages.map((msg, index) => (
              <div key={index} className="message-input-row">
                <select
                  value={msg.type}
                  onChange={(e) => updateMessage(index, 'type', e.target.value as 'text' | 'image')}
                  className="form-select message-type-select"
                >
                  <option value="text">💬 텍스트</option>
                  <option value="image">📷 이미지</option>
                </select>
                <input
                  type={msg.type === 'image' ? 'url' : 'text'}
                  value={msg.content}
                  onChange={(e) => updateMessage(index, 'content', e.target.value)}
                  placeholder={msg.type === 'image' ? '이미지 URL' : '메시지 내용'}
                  className="message-content-input"
                />
                <input
                  type="text"
                  value={msg.time}
                  onChange={(e) => updateMessage(index, 'time', e.target.value)}
                  placeholder="오후 11:23"
                  className="message-time-input"
                />
                {messages.length > 1 && (
                  <button type="button" onClick={() => removeMessage(index)} className="remove-message-btn">
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addMessage} className="add-message-btn">
              + 메시지 추가
            </button>
          </div>
          
          <button type="submit" className="admin-submit-btn">
            추가하기
          </button>
        </form>
      </div>

      <div className="admin-section">
        <h2>등록된 에피소드 ({episodes.length}개)</h2>
        <div className="admin-list">
          {episodes.map((episode) => (
            <div key={episode.id} className="admin-list-item simple-item">
              <div className="admin-list-info">
                <h3>{episode.title || episode.date}</h3>
                <p>{episode.date} · {episode.messages.length}개 메시지</p>
              </div>
              <div className="admin-list-actions">
                <button className="delete-btn" onClick={() => handleDelete(episode.id)}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
