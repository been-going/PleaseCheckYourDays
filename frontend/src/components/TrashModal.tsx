import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../api";
import type { Template } from "../api/client";
import "./Modal.css";

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TrashModal: React.FC<TrashModalProps> = ({ isOpen, onClose }) => {
  const api = useApi();
  const queryClient = useQueryClient();

  const {
    data: trashedItems,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["trash"],
    queryFn: api.getTrash,
    enabled: isOpen, // Only fetch when the modal is open
  });

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["trash"] });
    queryClient.invalidateQueries({ queryKey: ["templates"] });
    queryClient.invalidateQueries({ queryKey: ["routineStats"] });
  };

  const mRestore = useMutation({
    mutationFn: (id: string) => api.restoreTemplate(id),
    onSuccess: invalidateQueries,
  });

  const mDeletePermanent = useMutation({
    mutationFn: (id: string) => api.permanentDelete(id),
    onSuccess: invalidateQueries,
  });

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>휴지통</span>
          <button className="btn-close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>
        <div className="modal-body">
          {isLoading ? (
            <p>로딩 중...</p>
          ) : error ? (
            <p className="error-message">오류: {(error as Error).message}</p>
          ) : !trashedItems || trashedItems.length === 0 ? (
            <p>휴지통이 비어있습니다.</p>
          ) : (
            <ul className="trash-list">
              {trashedItems.map((item: Template) => (
                <li key={item.id} className="trash-item">
                  <span className="trash-item-title">{item.title}</span>
                  <div className="trash-item-actions">
                    <button
                      className="btn"
                      onClick={() => mRestore.mutate(item.id)}
                      disabled={mRestore.isPending}
                    >
                      복원
                    </button>
                    <button
                      className="btn danger"
                      onClick={() => {
                        if (
                          window.confirm(
                            `'${item.title}' 루틴을 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
                          )
                        ) {
                          mDeletePermanent.mutate(item.id);
                        }
                      }}
                      disabled={mDeletePermanent.isPending}
                    >
                      영구 삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrashModal;
