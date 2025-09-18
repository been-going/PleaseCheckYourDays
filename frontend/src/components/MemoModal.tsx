import React, { useState, useEffect } from "react";
import "./Modal.css";

interface MemoModalProps {
  isOpen: boolean;
  targetTitle: string;
  initialText: string;
  isSaving: boolean;
  onClose: () => void;
  onSave: (memoText: string) => void;
}

export const MemoModal: React.FC<MemoModalProps> = ({
  isOpen,
  targetTitle,
  initialText,
  isSaving,
  onClose,
  onSave,
}) => {
  const [memoText, setMemoText] = useState(initialText);

  useEffect(() => {
    if (isOpen) {
      setMemoText(initialText);
    }
  }, [isOpen, initialText]);

  const handleSave = () => {
    onSave(memoText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      handleSave();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>{targetTitle} 메모</span>
          <button className="btn-close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>
        <div className="modal-body">
          <textarea
            autoFocus
            value={memoText}
            onChange={(e) => setMemoText(e.target.value)}
            placeholder="오늘 느낀 점, 기록하고 싶은 내용을 적어주세요…"
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="modal-footer">
          <div className="hotkey-hint">Ctrl/⌘ + Enter 저장 • Esc 닫기</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={onClose} disabled={isSaving}>
              취소
            </button>
            <button
              className="btn primary"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
