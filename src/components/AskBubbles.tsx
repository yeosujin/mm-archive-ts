import type { Ask } from '../lib/database';

/** 질문(왼쪽)과 답변(오른쪽) 말풍선. 문의 목록과 상세가 같이 쓴다 */
export default function AskBubbles({ ask }: { ask: Ask }) {
  return (
    <>
      <div className="ask-row ask-row-q">
        <p className="ask-bubble ask-bubble-q">{ask.content}</p>
      </div>
      {ask.answer && (
        <div className="ask-row ask-row-a">
          <p className="ask-bubble ask-bubble-a">{ask.answer}</p>
        </div>
      )}
    </>
  );
}
