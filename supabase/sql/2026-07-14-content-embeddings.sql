-- pgvector 확장
create extension if not exists vector;

-- 통합 임베딩 테이블
create table if not exists content_embeddings (
  id uuid primary key default gen_random_uuid(),
  content_type text not null,
  content_id uuid not null,
  text text not null,
  embedding vector(768) not null,
  updated_at timestamptz not null default now(),
  unique (content_type, content_id)
);

-- 코사인 유사도용 HNSW 인덱스
create index if not exists content_embeddings_embedding_idx
  on content_embeddings using hnsw (embedding vector_cosine_ops);

-- RLS: 정책 없음 = service_role(Edge Function)만 접근. 클라이언트는 직접 조회하지 않음.
alter table content_embeddings enable row level security;

-- 유사도 검색 RPC
create or replace function match_content(
  query_embedding vector(768),
  match_count int default 20,
  filter_type text default null
)
returns table (
  content_type text,
  content_id uuid,
  text text,
  similarity float
)
language sql stable
as $$
  select ce.content_type, ce.content_id, ce.text,
         1 - (ce.embedding <=> query_embedding) as similarity
  from content_embeddings ce
  where filter_type is null or ce.content_type = filter_type
  order by ce.embedding <=> query_embedding
  limit match_count;
$$;
