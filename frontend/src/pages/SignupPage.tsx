import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useApi } from "../api";
import { Link, useNavigate } from "react-router-dom";
import { getErrorMessage } from "../utils/errorUtils";
import "./Auth.css";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const api = useApi();
  const navigate = useNavigate();

  const mSignup = useMutation({
    mutationFn: (credentials: { email: string; password: string }) =>
      api.signup(credentials),
    onSuccess: () => {
      setTimeout(() => navigate("/login"), 2000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mSignup.mutate({ email, password });
  };

  return (
    <div className="auth-container card">
      <h2>회원가입</h2>
      {mSignup.isSuccess ? (
        <div>
          <p className="auth-success">회원가입에 성공했습니다!</p>
          <p style={{ color: "var(--text-secondary)" }}>
            잠시 후 로그인 페이지로 이동합니다...
          </p>
          <Link
            to="/login"
            style={{ marginTop: "1rem", display: "inline-block" }}
          >
            지금 로그인하기
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="auth-form">
          {mSignup.error && (
            <p className="auth-error">{getErrorMessage(mSignup.error)}</p>
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
            disabled={mSignup.isPending}
          >
            {mSignup.isPending ? "가입 중..." : "회원가입"}
          </button>
        </form>
      )}
      <p className="auth-link">
        이미 계정이 있으신가요? <Link to="/login">로그인</Link>
      </p>
    </div>
  );
}
