import api from "../../api/axios";

export const sendChatbotMessage = (payload) => api.post("/v1/chatbot/message", payload);
export const getChatbotConversations = () => api.get("/v1/chatbot/conversations");
export const getChatbotMessages = (conversationId) => api.get(`/v1/chatbot/messages/${conversationId}`);
export const uploadChatbotDocument = (formData) => api.post("/v1/chatbot/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
export const getChatbotDocuments = (conversationId) => api.get("/v1/chatbot/documents", { params: { conversationId } });
