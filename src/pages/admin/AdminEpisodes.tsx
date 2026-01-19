import { useState, useEffect } from 'react';
import { 
  getEpisodes, createEpisode, updateEpisode, deleteEpisode, 
  getMemberSettings, updateMemberSettings,
  getVideos, getMoments, getPosts
} from '../../lib/database';
import type { Episode, MemberSettings, Video, Moment, Post } from '../../lib/database';

interface MessageInput {
  type: 'text' | 'image';
  content: string;
  time: string;
}

export default function AdminEpisodes() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [memberSettings, setMemberSettings] = useState<MemberSettings>({
    member1_name: '멤버1',
    member2_name: '멤버2',
  });
  
  // 에피소드 타입
  const [episodeType, setEpisodeType] = useState<'dm' | 'comment'>('dm');
  
  // DM용 폼 데이터
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    sender: 'member1' as 'member1' | 'member2',
  });
  const [messages, setMessages] = useState<MessageInput[]>([
    { type: 'text', content: '', time: '' }
  ]);
  
  // Comment용 폼 데이터
  const [commentData, setCommentData] = useState({
    date: '',
    sender: 'member1' as 'member1' | 'member2',
    linked_content_type: 'video' as 'video' | 'moment' | 'post',
    linked_content_id: '',
    comment_text: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [episodesData, settings, videosData, momentsData, postsData] = await Promise.all([
        getEpisodes(),
        getMemberSettings(),
        getVideos(),
        getMoments(),
        getPosts()
      ]);
      setEpisodes(episodesData);
      setMemberSettings(settings);
      setVideos(videosData);
      setMoments(momentsData);
      setPosts(postsData);
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

  // DM용 메시지 관리
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

  // DM 제출
  const handleDMSubmit = async (e: React.FormEvent) => {
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
          episode_type: 'dm',
          messages: validMessages,
        });
        alert('수정되었어요!');
        setEditingId(null);
      } else {
        await createEpisode({
          title: formData.title,
          date: formData.date,
          sender: formData.sender,
          episode_type: 'dm',
          messages: validMessages,
        });
        alert('에피소드가 추가되었어요!');
      }
      
      resetDMForm();
      loadData();
    } catch (error) {
      console.error('Error saving episode:', error);
      alert('저장 중 오류가 발생했어요.');
    }
  };

  // Comment 제출
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!commentData.comment_text.trim()) {
      alert('댓글 내용을 입력해주세요.');
      return;
    }
    
    try {
      const episodeData: Omit<Episode, 'id'> = {
        date: commentData.date,
        sender: commentData.sender,
        episode_type: 'comment',
        comment_text: commentData.comment_text,
        messages: [],
        linked_content_type: commentData.linked_content_id ? commentData.linked_content_type : undefined,
        linked_content_id: commentData.linked_content_id || undefined,
      };
      
      if (editingId) {
        await updateEpisode(editingId, episodeData);
        alert('수정되었어요!');
        setEditingId(null);
      } else {
        await createEpisode(episodeData);
        alert('댓글 에피소드가 추가되었어요!');
      }
      
      resetCommentForm();
      loadData();
    } catch (error) {
      console.error('Error saving episode:', error);
      alert('저장 중 오류가 발생했어요.');
    }
  };

  const resetDMForm = () => {
    setFormData({ title: '', date: '', sender: 'member1' });
    setMessages([{ type: 'text', content: '', time: '' }]);
  };

  const resetCommentForm = () => {
    setCommentData({
      date: '',
      sender: 'member1',
      linked_content_type: 'video',
      linked_content_id: '',
      comment_text: '',
    });
  };

  const handleEdit = (episode: Episode) => {
    setEditingId(episode.id);
    
    if (episode.episode_type === 'comment') {
      setEpisodeType('comment');
      setCommentData({
        date: episode.date,
        sender: episode.sender || 'member1',
        linked_content_type: episode.linked_content_type || 'video',
        linked_content_id: episode.linked_content_id || '',
        comment_text: episode.comment_text || '',
      });
    } else {
      setEpisodeType('dm');
      setFormData({
        title: episode.title || '',
        date: episode.date,
        sender: episode.sender || 'member1',
      });
      setMessages(episode.messages?.map(m => ({
        type: m.type,
        content: m.content,
        time: m.time,
      })) || [{ type: 'text', content: '', time: '' }]);
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    resetDMForm();
    resetCommentForm();
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

  const getTargetMemberName = (sender: 'member1' | 'member2') => {
    return sender === 'member2' ? memberSettings.member1_name : memberSettings.member2_name;
  };

  // 연결 콘텐츠 목록
  const getContentList = (): (Video | Moment | Post)[] => {
    if (commentData.linked_content_type === 'video') {
      return videos;
    }
    if (commentData.linked_content_type === 'moment') {
      return moments;
    }
    return posts;
  };

  const getLinkedContentTitle = (episode: Episode) => {
    if (episode.linked_content_type === 'video' && episode.linked_content_id) {
      const video = videos.find(v => v.id === episode.linked_content_id);
      return video?.title || '영상';
    }
    if (episode.linked_content_type === 'moment' && episode.linked_content_id) {
      const moment = moments.find(m => m.id === episode.linked_content_id);
      return moment?.title || '모먼트';
    }
    if (episode.linked_content_type === 'post' && episode.linked_content_id) {
      const post = posts.find(p => p.id === episode.linked_content_id);
      return post?.title || post?.platform || '포스트';
    }
    return '콘텐츠';
  };

  const getContentTypeName = (type?: string) => {
    switch (type) {
      case 'video': return '영상';
      case 'moment': return '모먼트';
      case 'post': return '포스트';
      default: return '콘텐츠';
    }
  };

  const getContentTypeIcon = (type?: string) => {
    switch (type) {
      case 'video': return '📹';
      case 'moment': return '✨';
      case 'post': return '📱';
      default: return '📄';
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
      
      {/* 에피소드 추가 폼 */}
      <div className="admin-section">
        <h2>{editingId ? '에피소드 수정' : '새 에피소드 추가'}</h2>
        
        {/* 타입 선택 탭 */}
        <div className="episode-type-tabs">
          <button 
            type="button"
            className={`type-tab ${episodeType === 'dm' ? 'active' : ''}`}
            onClick={() => { setEpisodeType('dm'); handleCancelEdit(); }}
          >
            📱 팬소통 (DM)
          </button>
          <button 
            type="button"
            className={`type-tab ${episodeType === 'comment' ? 'active' : ''}`}
            onClick={() => { setEpisodeType('comment'); handleCancelEdit(); }}
          >
            💬 콘텐츠 댓글
          </button>
        </div>

        {/* DM 폼 */}
        {episodeType === 'dm' && (
          <form onSubmit={handleDMSubmit} className="admin-form">
            <div className="form-group">
              <label htmlFor="dm-sender">보낸 멤버 *</label>
              <select
                id="dm-sender"
                value={formData.sender}
                onChange={(e) => setFormData({ ...formData, sender: e.target.value as 'member1' | 'member2' })}
                className="form-select"
              >
                <option value="member1">{memberSettings.member1_name}</option>
                <option value="member2">{memberSettings.member2_name}</option>
              </select>
              <span className="form-hint">팬들에게 상대 멤버 얘기를 알려준 멤버</span>
            </div>

            <div className="form-group">
              <label htmlFor="dm-date">날짜 *</label>
              <input
                id="dm-date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="dm-title">제목 (선택)</label>
              <input
                id="dm-title"
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
        )}

        {/* Comment 폼 */}
        {episodeType === 'comment' && (
          <form onSubmit={handleCommentSubmit} className="admin-form">
            <div className="form-group">
              <label htmlFor="comment-sender">댓글 단 멤버 *</label>
              <select
                id="comment-sender"
                value={commentData.sender}
                onChange={(e) => setCommentData({ ...commentData, sender: e.target.value as 'member1' | 'member2' })}
                className="form-select"
              >
                <option value="member1">{memberSettings.member1_name}</option>
                <option value="member2">{memberSettings.member2_name}</option>
              </select>
              <span className="form-hint">
                {getTargetMemberName(commentData.sender)}의 콘텐츠에 댓글을 단 멤버
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="comment-date">날짜 *</label>
              <input
                id="comment-date"
                type="date"
                value={commentData.date}
                onChange={(e) => setCommentData({ ...commentData, date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="comment-content-type">콘텐츠 종류 *</label>
              <select
                id="comment-content-type"
                value={commentData.linked_content_type}
                onChange={(e) => setCommentData({ 
                  ...commentData, 
                  linked_content_type: e.target.value as 'video' | 'moment' | 'post',
                  linked_content_id: ''
                })}
                className="form-select"
              >
                <option value="video">📹 영상</option>
                <option value="moment">✨ 모먼트</option>
                <option value="post">📱 포스트</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="comment-content-select">연결할 콘텐츠 (선택)</label>
              <select
                id="comment-content-select"
                value={commentData.linked_content_id}
                onChange={(e) => setCommentData({ ...commentData, linked_content_id: e.target.value })}
                className="form-select"
              >
                <option value="">없음</option>
                {getContentList().map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title || ('platform' in item ? item.platform : '')} ({item.date})
                  </option>
                ))}
              </select>
              <span className="form-hint">특정 콘텐츠에 단 댓글이면 선택하세요</span>
            </div>

            <div className="form-group">
              <label htmlFor="comment-text">댓글 내용 *</label>
              <textarea
                id="comment-text"
                value={commentData.comment_text}
                onChange={(e) => setCommentData({ ...commentData, comment_text: e.target.value })}
                placeholder="댓글 내용을 입력하세요"
                rows={3}
                required
                className="form-textarea"
              />
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
        )}
      </div>

      {/* 에피소드 목록 */}
      <div className="admin-section">
        <h2>등록된 에피소드 ({episodes.length}개)</h2>
        <div className="admin-list">
          {episodes.map((episode) => {
            const isComment = episode.episode_type === 'comment';
            
            return (
              <div key={episode.id} className="admin-list-item simple-item">
                <div className="admin-list-info">
                  <h3>
                    <span className="episode-type-badge">
                      {isComment ? '💬' : '📱'}
                    </span>
                    {getMemberName(episode.sender || 'member1')}
                    {isComment && episode.linked_content_id
                      ? ` → ${getTargetMemberName(episode.sender || 'member1')}의 ${getContentTypeName(episode.linked_content_type)}`
                      : (episode.title ? ` · ${episode.title}` : '')
                    }
                  </h3>
                  <p>
                    {episode.date}
                    {isComment 
                      ? (episode.linked_content_id 
                          ? ` · ${getContentTypeIcon(episode.linked_content_type)} "${getLinkedContentTitle(episode)}"`
                          : '')
                      : ` · ${episode.messages?.length || 0}개 메시지`
                    }
                  </p>
                  {isComment && (
                    <p className="episode-preview">"{episode.comment_text}"</p>
                  )}
                </div>
                <div className="admin-list-actions">
                  <button className="edit-btn" onClick={() => handleEdit(episode)}>수정</button>
                  <button className="delete-btn" onClick={() => handleDelete(episode.id)}>삭제</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
