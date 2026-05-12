import ReactMarkdown from "react-markdown";

export default function ChatMessage({ message }) {
  return (
    <div className={`cb-bubble ${message.role === "user" ? "user" : "assistant"}`}>
      <ReactMarkdown>{message.content || ""}</ReactMarkdown>
    </div>
  );
}
