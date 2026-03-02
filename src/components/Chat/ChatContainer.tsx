import { MessageList } from './MessageList';
import { InputBox } from './InputBox';
import { TypingIndicator } from './TypingIndicator';

export function ChatContainer() {
  return (
    <div className="chat-container">
      <MessageList />
      <TypingIndicator />
      <InputBox />
    </div>
  );
}
