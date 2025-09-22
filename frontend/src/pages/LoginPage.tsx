import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../api";
import { useNavigate, Link } from "react-router-dom";
import { getErrorMessage } from "../utils/errorUtils";
import "./Auth.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const api = useApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const mLogin = useMutation({
    mutationFn: (credentials: { email: string; password: string }) =>
      api.login(credentials),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      navigate("/today");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mLogin.mutate({ email, password });
  };

  return (
    <div className="auth-container card">
      <h2>로그인</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        {mLogin.error && (
          <p className="auth-error">{getErrorMessage(mLogin.error)}</p>
        )}
        <div className="form-group">
          <label htmlFor="email">이메일</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">비밀번호</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          className="btn primary btn-submit"
          disabled={mLogin.isPending}
        >
          {mLogin.isPending ? "로그인 중..." : "로그인"}
        </button>
      </form>
      <p className="auth-link">
        계정이 없으신가요? <Link to="/signup">회원가입</Link>
      </p>
    </div>
  );
}
