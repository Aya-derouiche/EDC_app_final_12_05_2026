import React, { useState } from "react";

export default function ChatInput({ onSend, onUpload, disabled, uploading }) {
  const [text, setText] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  };

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f || !onUpload) return;
    await onUpload(f);
    e.target.value = "";
  };

  return (
    <form className="cb-input-wrap" onSubmit={submit}>
      <label className="cb-upload-btn">
        {uploading ? "..." : "+"}
        <input type="file" onChange={handleFile} style={{ display: "none" }} disabled={uploading} />
      </label>
      <input className="cb-input" placeholder="Écris ton message..." value={text} onChange={(e) => setText(e.target.value)} />
      <button className="cb-send" type="submit" disabled={disabled}>Envoyer</button>
    </form>
  );
}
