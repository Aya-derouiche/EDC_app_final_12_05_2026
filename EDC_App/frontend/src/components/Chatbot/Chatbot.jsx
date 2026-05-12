import React, { useState } from "react";
import ChatWindow from "./ChatWindow";
import "./chatbot.css";

export default function Chatbot() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="cb-fab" onClick={() => setOpen((v) => !v)} aria-label="Ouvrir le chatbot">
        <span className="cb-fab-icon">💬</span>
      </button>
      {open && <ChatWindow onClose={() => setOpen(false)} />}
    </>
  );
}
