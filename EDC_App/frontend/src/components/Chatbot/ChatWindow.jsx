import React, { useEffect, useRef, useState } from "react";
import { getChatbotConversations, getChatbotMessages, sendChatbotMessage, uploadChatbotDocument, getChatbotDocuments } from "./chatbotApi";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";

export default function ChatWindow({ onClose }) {
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef(null);

  const scrollToBottom = () => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; };

  const refreshConversations = async () => {
    const { data } = await getChatbotConversations();
    setConversations(data || []);
    return data || [];
  };

  const refreshDocuments = async (convId) => {
    const { data } = await getChatbotDocuments(convId || undefined);
    setDocuments(data || []);
  };

  useEffect(() => { refreshConversations().then((data) => { if (data.length) setConversationId(data[0].id); }).catch(() => setError("Impossible de charger les conversations.")); }, []);

  useEffect(() => {
    if (!conversationId) { setMessages([]); refreshDocuments(null).catch(() => {}); return; }
    setLoading(true);
    Promise.all([getChatbotMessages(conversationId), refreshDocuments(conversationId)])
      .then(([msg]) => { setMessages(msg.data || []); setTimeout(scrollToBottom, 0); })
      .catch(() => setError("Impossible de charger le chat."))
      .finally(() => setLoading(false));
  }, [conversationId]);

  const handleSend = async (text) => {
    setMessages((prev) => [...prev, { id: `tmp-${Date.now()}`, role: "user", content: text }]);
    setTyping(true);
    setError("");
    setTimeout(scrollToBottom, 0);
    try {
      const { data } = await sendChatbotMessage({ conversationId, content: text });
      if (!conversationId && data?.conversationId) {
        setConversationId(data.conversationId);
        await refreshConversations();
        await refreshDocuments(data.conversationId);
      }
      setMessages((prev) => [...prev, { id: `ai-${Date.now()}`, role: "assistant", content: data.reply || "" }]);
      setTimeout(scrollToBottom, 0);
    } catch (_e) { setError("Erreur chatbot. Vérifie GROQ_API_KEY."); }
    finally { setTyping(false); }
  };

  const handleUpload = async (file) => {
    try {
      setUploading(true);
      setError("");
      const fd = new FormData();
      fd.append("file", file);
      if (conversationId) fd.append("conversationId", String(conversationId));
      await uploadChatbotDocument(fd);
      await refreshDocuments(conversationId);
    } catch (_e) {
      setError("Upload impossible.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="cb-panel">
      <div className="cb-sidebar">
        <div className="cb-sidebar-title">Historique</div>
        <button className="cb-new" onClick={() => { setConversationId(null); setMessages([]); }}>+ Nouvelle</button>
        <div className="cb-conv-list">
          {conversations.map((c) => <button key={c.id} className={`cb-conv-item ${conversationId === c.id ? "active" : ""}`} onClick={() => setConversationId(c.id)}>{c.title || `Conversation ${c.id}`}</button>)}
        </div>
      </div>
      <div className="cb-main">
        <div className="cb-header"><strong>Assistant IA</strong><button className="cb-close" onClick={onClose}>Fermer</button></div>
        <div className="cb-docs">{documents.slice(0, 5).map((d) => <span key={d.id} className="cb-doc-pill">{d.original_filename}</span>)}</div>
        <div className="cb-messages" ref={listRef}>
          {loading && <div className="cb-status">Chargement...</div>}
          {messages.map((m) => <ChatMessage key={m.id} message={m} />)}
          {typing && <div className="cb-typing"><span></span><span></span><span></span></div>}
          {!loading && messages.length === 0 && <div className="cb-status">Pose ta première question ou ajoute un document.</div>}
        </div>
        {error && <div className="cb-error">{error}</div>}
        <ChatInput onSend={handleSend} onUpload={handleUpload} disabled={typing} uploading={uploading} />
      </div>
    </div>
  );
}
