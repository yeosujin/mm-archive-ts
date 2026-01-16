// 타입 정의

export interface Video {
  id: string;
  title: string;
  url: string;
  date: string;
}

export interface Moment {
  id: string;
  title: string;
  tweetUrl: string;
  date: string;
  videoId?: string; // 연결된 영상 ID (선택사항)
}

export interface Photo {
  id: string;
  title: string;
  imageUrl: string;
  date: string;
}

export interface EpisodeMessage {
  id: string;
  text?: string;
  imageUrl?: string;
  time: string;
}

export interface Episode {
  id: string;
  date: string;
  messages: EpisodeMessage[];
}

export interface Article {
  id: string;
  title: string;
  author: string;
  tags: string[];
  url: string;
  date: string;
}

// 메인 걸기 설정 (하나만) - 에피소드 제외 (DM 형식)
export interface FeaturedContent {
  type: 'video' | 'photo' | 'moment' | null;
  id: string | null;
}

// 목데이터

export const videos: Video[] = [
  {
    id: '1',
    title: '2024 콘서트 공식 영상',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    date: '2024-12-15',
  },
  {
    id: '2',
    title: '신곡 MV',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    date: '2024-11-20',
  },
  {
    id: '3',
    title: '음방 무대 공식 클립',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    date: '2024-10-05',
  },
];

export const moments: Moment[] = [
  {
    id: '1',
    title: '콘서트에서 손하트 해주는 순간',
    tweetUrl: 'https://twitter.com/Twitter/status/1445078208190291973',
    date: '2024-12-16',
    videoId: '1', // 2024 콘서트 공식 영상
  },
  {
    id: '2',
    title: '팬미팅 귀여운 리액션',
    tweetUrl: 'https://twitter.com/Twitter/status/1445078208190291973',
    date: '2024-11-21',
    videoId: '2', // 신곡 MV
  },
  {
    id: '3',
    title: '음방 대기실 비하인드',
    tweetUrl: 'https://twitter.com/Twitter/status/1445078208190291973',
    date: '2024-10-06',
    videoId: '3', // 음방 무대 공식 클립
  },
];

export const photos: Photo[] = [
  {
    id: '1',
    title: '2024 팬미팅 포토카드',
    imageUrl: 'https://picsum.photos/seed/p1/800/1000',
    date: '2024-12-10',
  },
  {
    id: '2',
    title: '음방 출근길',
    imageUrl: 'https://picsum.photos/seed/p2/800/1000',
    date: '2024-11-15',
  },
  {
    id: '3',
    title: '화보 촬영',
    imageUrl: 'https://picsum.photos/seed/p3/800/1000',
    date: '2024-10-20',
  },
  {
    id: '4',
    title: '콘서트 비하인드',
    imageUrl: 'https://picsum.photos/seed/p4/800/1000',
    date: '2024-09-25',
  },
];

export const episodes: Episode[] = [
  {
    id: '1',
    date: '2024-12-15',
    messages: [
      { id: '1-1', text: '오늘 ㅇㅇ이랑 연습했어', time: '오후 11:23' },
      { id: '1-2', imageUrl: 'https://picsum.photos/seed/dm1/400/300', time: '오후 11:24' },
      { id: '1-3', text: '열심히 했음 ㅎㅎ', time: '오후 11:25' },
    ],
  },
  {
    id: '2',
    date: '2024-12-10',
    messages: [
      { id: '2-1', text: 'ㅇㅇ이랑 밥 먹었어 🍚', time: '오후 8:15' },
      { id: '2-2', text: '맛있었다~', time: '오후 8:16' },
      { id: '2-3', imageUrl: 'https://picsum.photos/seed/dm2/400/300', time: '오후 8:20' },
    ],
  },
  {
    id: '3',
    date: '2024-12-05',
    messages: [
      { id: '3-1', text: '오늘 ㅇㅇ이가 웃긴 얘기 해줬어', time: '오후 10:30' },
      { id: '3-2', text: '진짜 너무 웃겼음 ㅋㅋㅋㅋ', time: '오후 10:31' },
    ],
  },
];

export const articles: Article[] = [
  {
    id: '1',
    title: '새 앨범 발매 기념 인터뷰',
    author: 'Daily',
    tags: ['인터뷰', '앨범'],
    url: 'https://example.com/article1',
    date: '2024-12-01',
  },
  {
    id: '2',
    title: '연말 시상식 수상 소감',
    author: 'Music Weekly',
    tags: ['시상식', '수상'],
    url: 'https://example.com/article2',
    date: '2024-11-28',
  },
  {
    id: '3',
    title: '월드투어 비하인드 스토리',
    author: 'Fan Magazine',
    tags: ['투어', '비하인드'],
    url: 'https://example.com/article3',
    date: '2024-10-15',
  },
];

// 메인 걸기 (어드민에서 설정)
export let featuredContent: FeaturedContent = {
  type: 'photo',
  id: '1',
};
