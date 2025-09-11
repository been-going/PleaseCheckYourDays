import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../api";
import type { Template } from "../api/client";

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TrashModal: React.FC<TrashModalProps> = ({ isOpen, onClose }) => {
  const qc = useQueryClient();
  const api = useApi();

  const { data: archivedTemplates, isLoading } = useQuery({
    queryKey: ["archivedTemplates"],
    queryFn: api.getArchivedTemplates,
    enabled: isOpen, // 모달이 열렸을 때만 데이터를 가져옵니다.
  });

  const mRestore = useMutation({
    mutationFn: (id: string) => api.restoreTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      qc.invalidateQueries({ queryKey: ["archivedTemplates"] });
    },
  });

  const mDeletePermanent = useMutation({
    mutationFn: (id: string) => api.deleteTemplatePermanently(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["archivedTemplates"] });
      // 기록이 삭제되었으므로, 관련 통계도 모두 갱신합니다.
      qc.invalidateQueries({ queryKey: ["summaries"] });
      qc.invalidateQueries({ queryKey: ["routineStats"] });
      qc.invalidateQueries({ queryKey: ["routineDetail"] });
    },
  });

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>휴지통</span>
          <button className="btn-close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>
        <div
          className="modal-body"
          style={{ maxHeight: "60vh", overflowY: "auto" }}
        >
          {isLoading && <p>로딩 중...</p>}
          {!isLoading &&
            (!archivedTemplates || archivedTemplates.length === 0) && (
              <p>휴지통이 비어있습니다.</p>
            )}
          <div className="list">
            {archivedTemplates?.map((tpl: Template) => (
              <div key={tpl.id} className="item">
                <span className="title">{tpl.title}</span>
                <div className="row" style={{ gap: 8 }}>
                  <button
                    className="btn"
                    onClick={() => mRestore.mutate(tpl.id)}
                    disabled={mRestore.isPending}
                  >
                    복원
                  </button>
                  <button
                    className="btn"
                    onClick={() => {
                      if (
                        window.confirm(
                          `'${tpl.title}' 루틴과 모든 기록을 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
                        )
                      ) {
                        mDeletePermanent.mutate(tpl.id);
                      }
                    }}
                    disabled={mDeletePermanent.isPending}
                  >
                    영구 삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn primary" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
