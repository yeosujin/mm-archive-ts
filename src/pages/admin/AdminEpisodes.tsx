import { useState, useEffect, useRef, useCallback } from 'react';
import {
  createEpisode, updateEpisode, deleteEpisode,
  updateMemberSettings,
  getActivities, createActivity, deleteActivity
} from '../../lib/database';
import type { Episode, MemberSettings, Video, Moment, Post, Activity } from '../../lib/database';
import Tesseract from 'tesseract.js';
import { useData } from '../../hooks/useData';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';
import { useConfirm } from '../../hooks/useConfirm';
import ConfirmDialog from '../../components/ConfirmDialog';
import { uploadPhotoToR2 } from '../../lib/r2Upload';

interface MessageInput {
  id: string;
  type: 'text' | 'image';
  content: string;
  time: string;
}

interface CommentInput {
  id: string;
  content: string;
  time: string;
}

interface LPMessageInput {
  id: string;
  sender_name: string;
  content: string;
  time: string;
}

export default function AdminEpisodes() {
  const { 
    episodes: cachedEpisodes, 
    memberSettings: cachedSettings,
    videos: cachedVideos,
    moments: cachedMoments,
    posts: cachedPosts,
    fetchEpisodes,
    fetchMemberSettings,
    fetchVideos,
    fetchMoments,
    fetchPosts,
    invalidateCache
  } = useData();
  const { toasts, showToast, removeToast } = useToast();
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();

  const [episodes, setEpisodes] = useState<Episode[]>(cachedEpisodes || []);
  const [videos, setVideos] = useState<Video[]>(cachedVideos || []);
  const [moments, setMoments] = useState<Moment[]>(cachedMoments || []);
  const [posts, setPosts] = useState<Post[]>(cachedPosts || []);
  const [loading, setLoading] = useState(!cachedEpisodes || !cachedSettings);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [memberSettings, setMemberSettings] = useState<MemberSettings>(cachedSettings || {
    member1_name: '멤버1',
    member2_name: '멤버2',
  });
  
  // 에피소드 타입
  const [episodeType, setEpisodeType] = useState<'dm' | 'comment' | 'listening_party'>('dm');

  const getToday = () => new Date().toISOString().slice(0, 10);
  const getCurrentTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  // DM용 폼 데이터
  const [formData, setFormData] = useState({
    title: '',
    date: getToday(),
    sender: 'member1' as 'member1' | 'member2',
  });
  const [messages, setMessages] = useState<MessageInput[]>([
    { id: crypto.randomUUID(), type: 'text', content: '', time: getCurrentTime() }
  ]);

  // Comment용 폼 데이터
  const [commentData, setCommentData] = useState({
    date: getToday(),
    sender: 'member1' as 'member1' | 'member2',
    linked_content_type: 'video' as 'video' | 'moment' | 'post',
    linked_content_id: '',
  });
  const [commentMessages, setCommentMessages] = useState<CommentInput[]>([
    { id: crypto.randomUUID(), content: '', time: '' }
  ]);

  // Listening Party용 폼 데이터
  const [lpData, setLpData] = useState({
    title: '',
    date: getToday(),
    platform: 'melon' as 'weverse' | 'melon' | 'spotify' | 'apple_music',
  });
  const [lpMessages, setLpMessages] = useState<LPMessageInput[]>([
    { id: crypto.randomUUID(), sender_name: '', content: '', time: '' }
  ]);
  
  // OCR 관련 상태
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const ocrInputRef = useRef<HTMLInputElement>(null);

  // 사진 업로드 상태
  const [photoUploading, setPhotoUploading] = useState<number | null>(null); // 업로드 중인 메시지 index
  const [photoProgress, setPhotoProgress] = useState(0);
  const photoInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // 활동 & 모달 상태
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [newActivityName, setNewActivityName] = useState('');

  // 연결 콘텐츠 검색 상태
  const [contentSearchQuery, setContentSearchQuery] = useState('');
  const [isContentDropdownOpen, setIsContentDropdownOpen] = useState(false);
  const contentDropdownRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    try {
      const [episodesData, settings, videosData, momentsData, postsData, activitiesData] = await Promise.all([
        fetchEpisodes(),
        fetchMemberSettings(),
        fetchVideos(),
        fetchMoments(),
        fetchPosts(),
        getActivities()
      ]);
      setEpisodes(episodesData);
      setMemberSettings(settings);
      setVideos(videosData);
      setMoments(momentsData);
      setPosts(postsData);
      setActivities(activitiesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchEpisodes, fetchMemberSettings, fetchVideos, fetchMoments, fetchPosts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sync with cache
  useEffect(() => { if (cachedEpisodes) setEpisodes(cachedEpisodes); }, [cachedEpisodes]);
  useEffect(() => { if (cachedSettings) setMemberSettings(cachedSettings); }, [cachedSettings]);
  useEffect(() => { if (cachedVideos) setVideos(cachedVideos); }, [cachedVideos]);
  useEffect(() => { if (cachedMoments) setMoments(cachedMoments); }, [cachedMoments]);
  useEffect(() => { if (cachedPosts) setPosts(cachedPosts); }, [cachedPosts]);

  // 콘텐츠 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contentDropdownRef.current && !contentDropdownRef.current.contains(e.target as Node)) {
        setIsContentDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveMemberSettings = async () => {
    try {
      await updateMemberSettings(memberSettings);
      showToast('멤버 이름이 저장되었어요!', 'success');
      invalidateCache('memberSettings');
      setShowMemberModal(false);
    } catch (error) {
      console.error('Error saving member settings:', error);
      showToast('저장 중 오류가 발생했어요.', 'error');
    }
  };

  // 활동 추가
  const handleAddActivity = async () => {
    if (!newActivityName.trim()) {
      showToast('활동명을 입력해주세요.', 'error');
      return;
    }
    try {
      await createActivity({ name: newActivityName.trim() });
      setNewActivityName('');
      const activitiesData = await getActivities();
      setActivities(activitiesData);
    } catch (error) {
      console.error('Error adding activity:', error);
      showToast('활동 추가 중 오류가 발생했어요.', 'error');
    }
  };

  // 활동 삭제
  const handleDeleteActivity = async (id: string) => {
    const confirmed = await confirm({ message: '이 활동을 삭제하시겠어요?', type: 'danger' });
    if (!confirmed) return;
    try {
      await deleteActivity(id);
      const activitiesData = await getActivities();
      setActivities(activitiesData);
    } catch (error) {
      console.error('Error deleting activity:', error);
      showToast('활동 삭제 중 오류가 발생했어요.', 'error');
    }
  };

  // DM용 메시지 관리
  const addMessage = () => {
    const lastTime = messages.at(-1)?.time || getCurrentTime();
    setMessages([...messages, { id: crypto.randomUUID(), type: 'text', content: '', time: lastTime }]);
  };

  const removeMessage = (index: number) => {
    if (messages.length > 1) {
      setMessages(messages.filter((_, i) => i !== index));
    }
  };

  const moveMessage = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= messages.length) return;
    const updated = [...messages];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setMessages(updated);
  };

  const updateMessage = (index: number, field: keyof MessageInput, value: string) => {
    const updated = [...messages];
    updated[index] = { ...updated[index], [field]: value };
    setMessages(updated);
  };

  // 줄 끝에서 시간 추출 (위버스 DM은 메시지 오른쪽에 시간이 붙음)
  // 예: "파티를 했었어 19:11" → { content: "파티를 했었어", time: "19:11" }
  const extractTimeFromEnd = (text: string): { content: string; time: string } => {
    // 줄 끝의 시간 패턴: HH:MM (공백 포함)
    const endTimeMatch = text.match(/^(.+?)\s+(\d{1,2}:\d{2})\s*$/);
    if (endTimeMatch) {
      return {
        content: endTimeMatch[1].trim(),
        time: endTimeMatch[2],
      };
    }
    return { content: text, time: '' };
  };

  // 시간만 있는 줄인지 체크
  const isOnlyTime = (text: string): boolean => {
    const trimmed = text.trim();
    return /^\d{1,2}:\d{2}$/.test(trimmed);
  };

  // 닉네임인지 확인 (설정된 멤버 이름과 비교)
  const isNickname = (text: string): boolean => {
    const trimmed = text.trim();
    const name1 = memberSettings.member1_name;
    const name2 = memberSettings.member2_name;
    
    // 정확히 일치
    if (trimmed === name1 || trimmed === name2) return true;
    
    // 이미지 예시: "느슨한 송아지", "강아지보다모카빠" 같은 위버스 닉네임
    // 닉네임은 보통 짧고, 특수문자가 적음
    // 설정된 이름이 포함되어 있고 짧은 텍스트면 닉네임으로 간주
    const lowerTrimmed = trimmed.toLowerCase();
    const lowerName1 = name1.toLowerCase();
    const lowerName2 = name2.toLowerCase();
    
    if (lowerTrimmed.includes(lowerName1) && trimmed.length <= name1.length + 10) return true;
    if (lowerTrimmed.includes(lowerName2) && trimmed.length <= name2.length + 10) return true;
    
    return false;
  };

  // OCR로 이미지에서 텍스트 추출
  const handleOCR = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setOcrProgress(0);

    try {
      const result = await Tesseract.recognize(
        file,
        'kor+eng', // 한국어 + 영어
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setOcrProgress(Math.round(m.progress * 100));
            }
          }
        }
      );

      const extractedText = result.data.text.trim();
      console.log('OCR Raw Result:', extractedText); // 디버깅용
      
      if (extractedText) {
        const lines = extractedText.split('\n').filter(line => line.trim());
        
        // 메시지와 시간 파싱
        // 하나의 말풍선 = 시간이 나오기 전까지의 내용을 합침
        const parsedMessages: MessageInput[] = [];
        let contentBuffer: string[] = []; // 말풍선 내용 버퍼
        let lastTime = '';
        
        const flushBuffer = (time: string) => {
          if (contentBuffer.length > 0) {
            const content = contentBuffer.join(' ').trim();
            if (content.length >= 2) {
              parsedMessages.push({
                id: crypto.randomUUID(),
                type: 'text' as const,
                content: content,
                time: time,
              });
            }
            contentBuffer = [];
          }
        };
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          
          // 빈 줄 스킵
          if (!trimmedLine) continue;
          
          // 시간만 있는 줄이면 버퍼 플러시 후 시간 저장
          if (isOnlyTime(trimmedLine)) {
            flushBuffer(trimmedLine);
            lastTime = trimmedLine;
            continue;
          }
          
          // 닉네임이면 버퍼 플러시 (새로운 메시지 그룹 시작)
          if (isNickname(trimmedLine)) {
            flushBuffer(lastTime);
            continue;
          }
          
          // 너무 짧은 텍스트 (1글자)는 스킵 (노이즈일 가능성)
          if (trimmedLine.length < 2) continue;
          
          // 줄 끝에서 시간 추출 시도
          const { content, time } = extractTimeFromEnd(trimmedLine);
          
          if (time) {
            // 시간이 있는 줄 = 말풍선의 마지막 줄
            contentBuffer.push(content);
            flushBuffer(time);
            lastTime = time;
          } else {
            // 시간이 없는 줄 = 말풍선 내용 계속
            contentBuffer.push(content);
          }
        }
        
        // 남은 버퍼 처리
        flushBuffer(lastTime);
        
        if (parsedMessages.length > 0) {
          // 기존 빈 메시지가 있으면 교체, 아니면 추가
          if (messages.length === 1 && messages[0].content === '') {
            setMessages(parsedMessages);
          } else {
            setMessages([...messages, ...parsedMessages]);
          }
          
          const withTime = parsedMessages.filter(m => m.time).length;
          showToast(`${parsedMessages.length}개의 메시지를 추출했어요!\n(시간 자동입력: ${withTime}개)\n\n⚠️ 인식 결과를 확인하고 필요시 수정해주세요.`, 'success');
        } else {
          showToast('말풍선 내용을 찾을 수 없어요.\n닉네임과 시간을 제외한 텍스트가 없습니다.', 'error');
        }
      } else {
        showToast('이미지에서 텍스트를 인식하지 못했어요.\n더 선명한 이미지를 시도해보세요.', 'error');
      }
    } catch (error) {
      console.error('OCR error:', error);
      showToast('텍스트 인식 중 오류가 발생했어요.', 'error');
    } finally {
      setOcrLoading(false);
      setOcrProgress(0);
      // 파일 입력 초기화
      if (ocrInputRef.current) {
        ocrInputRef.current.value = '';
      }
    }
  };

  // 사진 파일 선택 → R2 업로드
  const handlePhotoUpload = async (index: number, file: File) => {
    setPhotoUploading(index);
    setPhotoProgress(0);

    try {
      const url = await uploadPhotoToR2(file, (progress) => {
        setPhotoProgress(progress);
      });
      updateMessage(index, 'content', url);
    } catch (error) {
      console.error('Photo upload error:', error);
      showToast('사진 업로드 중 오류가 발생했어요.', 'error');
    } finally {
      setPhotoUploading(null);
      setPhotoProgress(0);
    }
  };

  // DM 제출
  const handleDMSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validMessages = messages.filter(m => m.content.trim() !== '');
    if (validMessages.length === 0) {
      showToast('최소 하나의 메시지를 입력해주세요.', 'error');
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
        showToast('수정되었어요!', 'success');
        setEditingId(null);
      } else {
        await createEpisode({
          title: formData.title,
          date: formData.date,
          sender: formData.sender,
          episode_type: 'dm',
          messages: validMessages,
        });
        showToast('에피소드가 추가되었어요!', 'success');
      }
      
      resetDMForm();
      invalidateCache('episodes');
      loadData();
    } catch (error) {
      console.error('Error saving episode:', error);
      showToast('저장 중 오류가 발생했어요.', 'error');
    }
  };

  // Comment 제출
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validComments = commentMessages.filter(m => m.content.trim() !== '');
    if (validComments.length === 0) {
      showToast('최소 하나의 댓글을 입력해주세요.', 'error');
      return;
    }

    try {
      const episodeData: Partial<Omit<Episode, 'id'>> & Pick<Episode, 'date' | 'sender' | 'episode_type'> = {
        title: '',
        date: commentData.date,
        sender: commentData.sender,
        episode_type: 'comment',
        comment_text: validComments[0].content,
        messages: validComments.map(m => ({ type: 'text' as const, content: m.content, time: m.time })),
      };

      if (commentData.linked_content_id) {
        episodeData.linked_content_type = commentData.linked_content_type;
        episodeData.linked_content_id = commentData.linked_content_id;
      }

      if (editingId) {
        await updateEpisode(editingId, episodeData);
        showToast('수정되었어요!', 'success');
        setEditingId(null);
      } else {
        await createEpisode(episodeData as Omit<Episode, 'id'>);
        showToast('댓글 에피소드가 추가되었어요!', 'success');
      }
      
      resetCommentForm();
      invalidateCache('episodes');
      loadData();
    } catch (error: unknown) {
      console.error('Error saving comment episode:', error);
      const msg = error instanceof Error ? error.message : JSON.stringify(error);
      showToast(`저장 중 오류: ${msg}`, 'error');
    }
  };

  const resetDMForm = () => {
    setFormData({ title: '', date: getToday(), sender: 'member1' });
    setMessages([{ id: crypto.randomUUID(), type: 'text', content: '', time: getCurrentTime() }]);
  };

  // Listening Party 제출
  const handleLPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validMessages = lpMessages.filter(m => m.content.trim() !== '');
    if (validMessages.length === 0) {
      showToast('최소 하나의 메시지를 입력해주세요.', 'error');
      return;
    }

    try {
      const episodeData = {
        title: lpData.title || '',
        date: lpData.date,
        platform: lpData.platform,
        episode_type: 'listening_party' as const,
        messages: validMessages.map(m => ({
          type: 'text' as const,
          content: m.content,
          time: m.time,
          sender_name: m.sender_name,
        })),
      };

      if (editingId) {
        await updateEpisode(editingId, episodeData);
        showToast('수정되었어요!', 'success');
        setEditingId(null);
      } else {
        await createEpisode(episodeData);
        showToast('리스닝파티가 추가되었어요!', 'success');
      }

      resetLPForm();
      invalidateCache('episodes');
      loadData();
    } catch (error: unknown) {
      console.error('Error saving LP episode:', error);
      const msg = error instanceof Error ? error.message : JSON.stringify(error);
      showToast(`저장 중 오류: ${msg}`, 'error');
    }
  };

  const resetCommentForm = () => {
    setCommentData({
      date: getToday(),
      sender: 'member1',
      linked_content_type: 'video',
      linked_content_id: '',
    });
    setCommentMessages([{ id: crypto.randomUUID(), content: '', time: '' }]);
    setContentSearchQuery('');
    setIsContentDropdownOpen(false);
  };

  const resetLPForm = () => {
    setLpData({ title: '', date: getToday(), platform: 'melon' });
    setLpMessages([{ id: crypto.randomUUID(), sender_name: '', content: '', time: '' }]);
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
      });
      if (episode.messages && episode.messages.length > 0) {
        setCommentMessages(episode.messages.map(m => ({ id: crypto.randomUUID(), content: m.content, time: m.time || '' })));
      } else {
        setCommentMessages([{ id: crypto.randomUUID(), content: episode.comment_text || '', time: '' }]);
      }
      setContentSearchQuery('');
      setIsContentDropdownOpen(false);
    } else if (episode.episode_type === 'listening_party') {
      setEpisodeType('listening_party');
      setLpData({
        title: episode.title || '',
        date: episode.date,
        platform: episode.platform || 'melon',
      });
      setLpMessages(episode.messages?.map(m => ({
        id: crypto.randomUUID(),
        sender_name: m.sender_name || '',
        content: m.content,
        time: m.time || '',
      })) || [{ id: crypto.randomUUID(), sender_name: '', content: '', time: '' }]);
    } else {
      setEpisodeType('dm');
      setFormData({
        title: episode.title || '',
        date: episode.date,
        sender: episode.sender || 'member1',
      });
      setMessages(episode.messages?.map(m => ({
        id: crypto.randomUUID(),
        type: m.type,
        content: m.content,
        time: m.time,
      })) || [{ id: crypto.randomUUID(), type: 'text', content: '', time: '' }]);
    }

    globalThis.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    resetDMForm();
    resetCommentForm();
    resetLPForm();
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({ message: '정말 삭제하시겠어요?', type: 'danger' });
    if (!confirmed) return;

    try {
      await deleteEpisode(id);
      showToast('삭제되었어요!', 'success');
      invalidateCache('episodes');
      loadData();
    } catch (error) {
      console.error('Error deleting episode:', error);
      showToast('삭제 중 오류가 발생했어요.', 'error');
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

  // 검색 필터링된 콘텐츠 목록
  const getFilteredContentList = (): (Video | Moment | Post)[] => {
    const list = getContentList();
    if (!contentSearchQuery.trim()) return list;
    const query = contentSearchQuery.toLowerCase();
    return list.filter(item =>
      item.title?.toLowerCase().includes(query) ||
      item.date.includes(query) ||
      ('platform' in item && item.platform?.toLowerCase().includes(query))
    );
  };

  // 선택된 콘텐츠 정보 가져오기
  const getSelectedContentInfo = (): string => {
    if (!commentData.linked_content_id) return '';
    const list = getContentList();
    const item = list.find(i => i.id === commentData.linked_content_id);
    if (!item) return '';
    return `[${item.date}] ${item.title || ('platform' in item ? item.platform : '')}`;
  };

  // 콘텐츠 선택 핸들러
  const handleContentSelect = (id: string) => {
    setCommentData({ ...commentData, linked_content_id: id });
    setContentSearchQuery('');
    setIsContentDropdownOpen(false);
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
    <>
      <Toast toasts={toasts} onRemove={removeToast} />
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        type={confirmState.type}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>에피소드 관리</h1>
        <div className="admin-header-buttons">
          <button
            type="button"
            className="admin-header-btn"
            onClick={() => setShowMemberModal(true)}
          >
            👥 멤버 설정
          </button>
          <button
            type="button"
            className="admin-header-btn"
            onClick={() => setShowActivityModal(true)}
          >
            🎵 활동 추가
          </button>
        </div>
      </div>

      {/* 멤버 설정 모달 */}
      {showMemberModal && (
        <div className="admin-modal-overlay" onClick={() => setShowMemberModal(false)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>👥 멤버 이름 설정</h2>
              <button className="modal-close-btn" onClick={() => setShowMemberModal(false)}>✕</button>
            </div>
            <div className="admin-modal-body">
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
              <button type="button" className="admin-submit-btn" onClick={handleSaveMemberSettings}>
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 활동 관리 모달 */}
      {showActivityModal && (
        <div className="admin-modal-overlay" onClick={() => setShowActivityModal(false)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>🎵 활동 관리</h2>
              <button className="modal-close-btn" onClick={() => setShowActivityModal(false)}>✕</button>
            </div>
            <div className="admin-modal-body">
              <div className="activity-add-row">
                <input
                  type="text"
                  value={newActivityName}
                  onChange={(e) => setNewActivityName(e.target.value)}
                  placeholder="활동명 입력 (예: Super Real Me)"
                  className="activity-input"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddActivity()}
                />
                <button type="button" className="admin-submit-btn" onClick={handleAddActivity}>
                  추가
                </button>
              </div>
              <div className="activity-list">
                {activities.length === 0 ? (
                  <p className="empty-text">등록된 활동이 없어요</p>
                ) : (
                  activities.map((activity) => (
                    <div key={activity.id} className="activity-item">
                      <span>{activity.name}</span>
                      <button
                        type="button"
                        className="delete-btn small"
                        onClick={() => handleDeleteActivity(activity.id)}
                      >
                        삭제
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 에피소드 추가 폼 */}
      <div className="admin-section">
        <h2>{editingId ? '에피소드 수정' : '새 에피소드 추가'}</h2>
        
        {/* 타입 선택 탭 */}
        <div className="episode-type-tabs" style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem' }}>
          <button
            type="button"
            className={`type-tab ${episodeType === 'dm' ? 'active' : ''}`}
            onClick={() => { setEpisodeType('dm'); handleCancelEdit(); }}
          >
            📱 DM
          </button>
          <button
            type="button"
            className={`type-tab ${episodeType === 'comment' ? 'active' : ''}`}
            onClick={() => { setEpisodeType('comment'); handleCancelEdit(); }}
          >
            💬 댓글
          </button>
          <button
            type="button"
            className={`type-tab ${episodeType === 'listening_party' ? 'active' : ''}`}
            onClick={() => { setEpisodeType('listening_party'); handleCancelEdit(); }}
          >
            🎧 LP
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
              
              {/* OCR 캡쳐 업로드 */}
              <div className="ocr-upload-section">
                <input
                  ref={ocrInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleOCR}
                  disabled={ocrLoading}
                  id="ocr-input"
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="ocr-upload-btn"
                  onClick={() => ocrInputRef.current?.click()}
                  disabled={ocrLoading}
                >
                  {ocrLoading ? (
                    <>🔄 인식 중... {ocrProgress}%</>
                  ) : (
                    <>📸 DM 캡쳐에서 텍스트 추출</>
                  )}
                </button>
                {ocrLoading && (
                  <div className="ocr-progress-bar">
                    <div className="ocr-progress" style={{ width: `${ocrProgress}%` }} />
                  </div>
                )}
              </div>
              
              {messages.map((msg, index) => (
                <div key={msg.id} className="message-input-row">
                  <div className="message-order-btns">
                    <button type="button" onClick={() => moveMessage(index, 'up')} disabled={index === 0} className="message-order-btn">▲</button>
                    <button type="button" onClick={() => moveMessage(index, 'down')} disabled={index === messages.length - 1} className="message-order-btn">▼</button>
                  </div>
                  <div className="message-card">
                    <div className="message-row-controls">
                      <select
                        value={msg.type}
                        onChange={(e) => updateMessage(index, 'type', e.target.value as 'text' | 'image')}
                        className="form-select message-type-select"
                      >
                        <option value="text">💬 텍스트</option>
                        <option value="image">📷 사진</option>
                      </select>
                      <input
                        type="time"
                        value={msg.time}
                        onChange={(e) => updateMessage(index, 'time', e.target.value)}
                        className="message-time-input"
                      />
                      {messages.length > 1 && (
                        <button type="button" onClick={() => removeMessage(index)} className="remove-message-btn">✕</button>
                      )}
                    </div>
                    {msg.type === 'image' ? (
                      <div className="photo-upload-area">
                        <input
                          ref={(el) => { photoInputRefs.current[index] = el; }}
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handlePhotoUpload(index, file);
                          }}
                          style={{ display: 'none' }}
                        />
                        {msg.content ? (
                          <div className="photo-preview-row">
                            <img src={msg.content} alt="" className="photo-preview-thumb" />
                            <button
                              type="button"
                              className="photo-change-btn"
                              onClick={() => photoInputRefs.current[index]?.click()}
                              disabled={photoUploading === index}
                            >
                              변경
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="photo-select-btn"
                            onClick={() => photoInputRefs.current[index]?.click()}
                            disabled={photoUploading === index}
                          >
                            {photoUploading === index
                              ? `업로드 중... ${photoProgress}%`
                              : '📷 사진 선택'}
                          </button>
                        )}
                        {photoUploading === index && (
                          <div className="photo-progress-bar">
                            <div className="photo-progress" style={{ width: `${photoProgress}%` }} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={msg.content}
                        onChange={(e) => updateMessage(index, 'content', e.target.value)}
                        placeholder="메시지 내용"
                        className="message-content-input"
                      />
                    )}
                  </div>
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
                onChange={(e) => {
                  setCommentData({
                    ...commentData,
                    linked_content_type: e.target.value as 'video' | 'moment' | 'post',
                    linked_content_id: ''
                  });
                  setContentSearchQuery('');
                }}
                className="form-select"
              >
                <option value="video">📹 영상</option>
                <option value="moment">✨ 모먼트</option>
                <option value="post">📱 포스트</option>
              </select>
            </div>

            <div className="form-group">
              <label>연결할 콘텐츠 (선택)</label>
              <div className="searchable-select" ref={contentDropdownRef}>
                <input
                  type="text"
                  placeholder={commentData.linked_content_id
                    ? getSelectedContentInfo()
                    : '콘텐츠 검색 (날짜/제목)'}
                  value={contentSearchQuery}
                  onChange={(e) => {
                    setContentSearchQuery(e.target.value);
                    setIsContentDropdownOpen(true);
                  }}
                  onFocus={() => setIsContentDropdownOpen(true)}
                  className="searchable-select-input"
                />
                {commentData.linked_content_id && (
                  <button
                    type="button"
                    className="searchable-select-clear"
                    onClick={() => handleContentSelect('')}
                  >
                    ✕
                  </button>
                )}
                {isContentDropdownOpen && (
                  <div className="searchable-select-dropdown">
                    <div
                      className={`searchable-select-option ${!commentData.linked_content_id ? 'selected' : ''}`}
                      onClick={() => handleContentSelect('')}
                    >
                      없음
                    </div>
                    {getFilteredContentList().map((item) => (
                      <div
                        key={item.id}
                        className={`searchable-select-option ${commentData.linked_content_id === item.id ? 'selected' : ''}`}
                        onClick={() => handleContentSelect(item.id)}
                      >
                        [{item.date}] {item.title || ('platform' in item ? item.platform : '')}
                      </div>
                    ))}
                    {getFilteredContentList().length === 0 && (
                      <div className="searchable-select-empty">검색 결과 없음</div>
                    )}
                  </div>
                )}
              </div>
              <span className="form-hint">특정 콘텐츠에 단 댓글이면 선택하세요</span>
            </div>

            <div className="form-group">
              <label>댓글 내용 *</label>
              <div className="comment-messages-list">
                {commentMessages.map((cm, idx) => (
                  <div key={cm.id} className="comment-message-row">
                    <input
                      type="text"
                      value={cm.content}
                      onChange={(e) => {
                        const updated = [...commentMessages];
                        updated[idx].content = e.target.value;
                        setCommentMessages(updated);
                      }}
                      placeholder="댓글 내용"
                      className="comment-content-input"
                    />
                    <input
                      type="time"
                      value={cm.time}
                      onChange={(e) => {
                        const updated = [...commentMessages];
                        updated[idx].time = e.target.value;
                        setCommentMessages(updated);
                      }}
                      className="comment-time-input"
                    />
                    {commentMessages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setCommentMessages(commentMessages.filter((_, i) => i !== idx))}
                        className="remove-message-btn"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const lastTime = commentMessages.at(-1)?.time || '';
                    setCommentMessages([...commentMessages, { id: crypto.randomUUID(), content: '', time: lastTime }]);
                  }}
                  className="add-message-btn"
                >
                  + 댓글 추가
                </button>
              </div>
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

        {/* Listening Party 폼 */}
        {episodeType === 'listening_party' && (
          <form onSubmit={handleLPSubmit} className="admin-form">
            <div className="form-group">
              <label htmlFor="lp-date">날짜 *</label>
              <input
                id="lp-date"
                type="date"
                value={lpData.date}
                onChange={(e) => setLpData({ ...lpData, date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="lp-platform">플랫폼 *</label>
              <select
                id="lp-platform"
                value={lpData.platform}
                onChange={(e) => setLpData({ ...lpData, platform: e.target.value as 'weverse' | 'melon' | 'spotify' | 'apple_music' })}
                className="form-select"
              >
                <option value="melon">🍈 멜론</option>
                <option value="spotify">🎵 스포티파이</option>
                <option value="apple_music">🍎 애플뮤직</option>
                <option value="weverse">💚 위버스</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="lp-activity">활동 (선택)</label>
              <select
                id="lp-activity"
                value={lpData.title}
                onChange={(e) => setLpData({ ...lpData, title: e.target.value })}
                className="form-select"
              >
                <option value="">선택안함</option>
                {activities.map((activity) => (
                  <option key={activity.id} value={activity.name}>
                    {activity.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>메시지들</label>
              <div className="comment-messages-list">
                {lpMessages.map((msg, idx) => (
                  <div key={msg.id} className="lp-message-row">
                    <input
                      type="text"
                      value={msg.sender_name}
                      onChange={(e) => {
                        const updated = [...lpMessages];
                        updated[idx].sender_name = e.target.value;
                        setLpMessages(updated);
                      }}
                      placeholder="이름"
                      className="lp-sender-input"
                    />
                    <input
                      type="text"
                      value={msg.content}
                      onChange={(e) => {
                        const updated = [...lpMessages];
                        updated[idx].content = e.target.value;
                        setLpMessages(updated);
                      }}
                      placeholder="메시지 내용"
                      className="lp-content-input"
                    />
                    <input
                      type="time"
                      value={msg.time}
                      onChange={(e) => {
                        const updated = [...lpMessages];
                        updated[idx].time = e.target.value;
                        setLpMessages(updated);
                      }}
                      className="lp-time-input"
                    />
                    {lpMessages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setLpMessages(lpMessages.filter((_, i) => i !== idx))}
                        className="remove-message-btn"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const last = lpMessages.at(-1);
                    setLpMessages([...lpMessages, { id: crypto.randomUUID(), sender_name: last?.sender_name || '', content: '', time: last?.time || '' }]);
                  }}
                  className="add-message-btn"
                >
                  + 메시지 추가
                </button>
              </div>
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
            const isLP = episode.episode_type === 'listening_party';

            return (
              <div key={episode.id} className="admin-list-item simple-item">
                <div className="admin-list-info">
                  <h3>
                    <span className="episode-type-badge">
                      {isLP ? '🎧' : isComment ? '💬' : '📱'}
                    </span>
                    {isLP
                      ? (episode.title || '리스닝파티')
                      : (
                        <>
                          {getMemberName(episode.sender || 'member1')}
                          {isComment && episode.linked_content_id
                            ? ` → ${getTargetMemberName(episode.sender || 'member1')}의 ${getContentTypeName(episode.linked_content_type)}`
                            : (episode.title ? ` · ${episode.title}` : '')
                          }
                        </>
                      )
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
    </>
  );
}
