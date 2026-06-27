import React, { useEffect, useRef, useState } from "react";
import {
  getChatbotConversations,
  getChatbotMessages,
  sendChatbotMessage,
  uploadChatbotDocument,
  getChatbotDocuments,
  deleteChatbotConversation,
  deleteChatbotDocument,
} from "./chatbotApi";
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

  const handleDeleteConversation = async (id) => {
    if (!window.confirm("Supprimer cette conversation ?")) return;
    try {
      await deleteChatbotConversation(id);
      const remaining = await refreshConversations();
      const nextConversationId = remaining.find((c) => c.id !== id)?.id || null;
      setConversationId((current) => (current === id ? nextConversationId : current));
      if (nextConversationId !== id) {
        if (nextConversationId) {
          const { data } = await getChatbotMessages(nextConversationId);
          setMessages(data || []);
          await refreshDocuments(nextConversationId);
        } else {
          setMessages([]);
          setDocuments([]);
        }
      }
    } catch (_e) {
      const message = _e?.response?.data?.error || "Impossible de supprimer la conversation.";
      setError(message);
    }
  };

  const handleDeleteDocument = async (id) => {
    if (!window.confirm("Supprimer ce fichier joint ?")) return;
    try {
      await deleteChatbotDocument(id);
      await refreshDocuments(conversationId);
    } catch (_e) {
      const message = _e?.response?.data?.error || "Impossible de supprimer le fichier.";
      setError(message);
    }
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
        <button type="button" className="cb-new" onClick={() => { setConversationId(null); setMessages([]); setDocuments([]); }}>+ Nouvelle</button>
        <div className="cb-conv-list">
          {conversations.map((c) => (
            <div key={c.id} className={`cb-conv-item-wrap ${conversationId === c.id ? "active" : ""}`}>
              <button type="button" className="cb-conv-item" onClick={() => setConversationId(c.id)}>{c.title || `Conversation ${c.id}`}</button>
              <button type="button" className="cb-icon-btn cb-conv-del" onClick={() => handleDeleteConversation(c.id)} aria-label="Supprimer la conversation">×</button>
            </div>
          ))}
        </div>
      </div>
      <div className="cb-main">
        <div className="cb-header"><strong>Assistant comptable IA</strong><button className="cb-close" onClick={onClose}>Fermer</button></div>
        <div className="cb-docs">
          {documents.slice(0, 5).map((d) => (
            <span key={d.id} className="cb-doc-pill">
              <span className="cb-doc-name">{d.original_filename}</span>
              <button type="button" className="cb-icon-btn cb-doc-del" onClick={() => handleDeleteDocument(d.id)} aria-label="Supprimer le fichier">×</button>
            </span>
          ))}
        </div>
        <div className="cb-messages" ref={listRef}>
          {loading && <div className="cb-status">Chargement...</div>}
          {messages.map((m) => <ChatMessage key={m.id} message={m} />)}
          {typing && <div className="cb-typing"><span></span><span></span><span></span></div>}
          {!loading && messages.length === 0 && <div className="cb-status">Pose une question comptable ou ajoute un document à analyser.</div>}
        </div>
        {error && <div className="cb-error">{error}</div>}
        <ChatInput onSend={handleSend} onUpload={handleUpload} disabled={typing} uploading={uploading} />
      </div>
    </div>
  );
}
