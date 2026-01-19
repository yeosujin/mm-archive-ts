import { useState, useEffect } from 'react';
import { getEpisodes, createEpisode, updateEpisode, deleteEpisode, getMemberSettings, updateMemberSettings } from '../../lib/database';
import type { Episode, MemberSettings } from '../../lib/database';

interface MessageInput {
  type: 'text' | 'image';
  content: string;
  time: string;
}

export default function AdminEpisodes() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [memberSettings, setMemberSettings] = useState<MemberSettings>({
    member1_name: '멤버1',
    member2_name: '멤버2',
  });
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    sender: 'member1' as 'member1' | 'member2',
  });
  const [messages, setMessages] = useState<MessageInput[]>([
    { type: 'text', content: '', time: '' }
  ]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [episodesData, settings] = await Promise.all([
        getEpisodes(),
        getMemberSettings()
      ]);
      setEpisodes(episodesData);
      setMemberSettings(settings);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMemberSettings = async () => {
    try {
      await updateMemberSettings(memberSettings);
      alert('멤버 이름이 저장되었어요!');
    } catch (error) {
      console.error('Error saving member settings:', error);
      alert('저장 중 오류가 발생했어요.');
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
      if (editingId) {
        await updateEpisode(editingId, {
          title: formData.title,
          date: formData.date,
          sender: formData.sender,
          messages: validMessages,
        });
        alert('수정되었어요!');
        setEditingId(null);
      } else {
        await createEpisode({
          title: formData.title,
          date: formData.date,
          sender: formData.sender,
          messages: validMessages,
        });
        alert('에피소드가 추가되었어요!');
      }
      
      setFormData({ title: '', date: '', sender: 'member1' });
      setMessages([{ type: 'text', content: '', time: '' }]);
      loadData();
    } catch (error) {
      console.error('Error saving episode:', error);
      alert('저장 중 오류가 발생했어요.');
    }
  };

  const handleEdit = (episode: Episode) => {
    setEditingId(episode.id);
    setFormData({
      title: episode.title,
      date: episode.date,
      sender: episode.sender || 'member1',
    });
    setMessages(episode.messages.map(m => ({
      type: m.type,
      content: m.content,
      time: m.time,
    })));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ title: '', date: '', sender: 'member1' });
    setMessages([{ type: 'text', content: '', time: '' }]);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠어요?')) return;
    
    try {
      await deleteEpisode(id);
      alert('삭제되었어요!');
      loadData();
    } catch (error) {
      console.error('Error deleting episode:', error);
      alert('삭제 중 오류가 발생했어요.');
    }
  };

  const getMemberName = (sender: 'member1' | 'member2') => {
    return sender === 'member2' ? memberSettings.member2_name : memberSettings.member1_name;
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

      {/* 멤버 설정 */}
      <div className="admin-section">
        <h2>👥 멤버 이름 설정</h2>
        <div className="member-settings-form">
          <div className="member-input-row">
            <div className="form-group">
              <label htmlFor="member1-name">멤버 1</label>
              <input
                id="member1-name"
                type="text"
                value={memberSettings.member1_name}
                onChange={(e) => setMemberSettings({ ...memberSettings, member1_name: e.target.value })}
                placeholder="첫 번째 멤버 이름"
              />
            </div>
            <div className="form-group">
              <label htmlFor="member2-name">멤버 2</label>
              <input
                id="member2-name"
                type="text"
                value={memberSettings.member2_name}
                onChange={(e) => setMemberSettings({ ...memberSettings, member2_name: e.target.value })}
                placeholder="두 번째 멤버 이름"
              />
            </div>
            <button type="button" className="admin-submit-btn save-member-btn" onClick={handleSaveMemberSettings}>
              저장
            </button>
          </div>
        </div>
      </div>
      
      <div className="admin-section">
        <h2>{editingId ? '에피소드 수정' : '새 에피소드 추가'}</h2>
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label htmlFor="episode-sender">보낸 멤버 *</label>
            <select
              id="episode-sender"
              value={formData.sender}
              onChange={(e) => setFormData({ ...formData, sender: e.target.value as 'member1' | 'member2' })}
              className="form-select"
            >
              <option value="member1">{memberSettings.member1_name}</option>
              <option value="member2">{memberSettings.member2_name}</option>
            </select>
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
            <label htmlFor="episode-title">제목 (선택)</label>
            <input
              id="episode-title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="뭐했냐면요~"
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
                  <option value="text">💬</option>
                  <option value="image">📷</option>
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
                  placeholder="시간"
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
          
          <div className="form-buttons">
            <button type="submit" className="admin-submit-btn">
              {editingId ? '수정하기' : '추가하기'}
            </button>
            {editingId && (
              <button type="button" className="admin-clear-btn" onClick={handleCancelEdit}>
                취소
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="admin-section">
        <h2>등록된 에피소드 ({episodes.length}개)</h2>
        <div className="admin-list">
          {episodes.map((episode) => (
            <div key={episode.id} className="admin-list-item simple-item">
              <div className="admin-list-info">
                <h3>{getMemberName(episode.sender || 'member1')} · {episode.title || episode.date}</h3>
                <p>{episode.date} · {episode.messages.length}개 메시지</p>
              </div>
              <div className="admin-list-actions">
                <button className="edit-btn" onClick={() => handleEdit(episode)}>수정</button>
                <button className="delete-btn" onClick={() => handleDelete(episode.id)}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
