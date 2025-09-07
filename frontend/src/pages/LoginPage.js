import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { login } from '../api/client';
import { useNavigate, Link } from 'react-router-dom';
export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login: setAuthToken } = useAuth();
    const navigate = useNavigate();
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const token = await login({ email, password });
            setAuthToken(token);
            navigate('/'); // 로그인 성공 시 메인 페이지로 이동
        }
        catch (err) {
            setError(err.message || '로그인에 실패했습니다.');
        }
    };
    return (_jsxs("div", { style: { maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }, children: [_jsx("h2", { children: "\uB85C\uADF8\uC778" }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { style: { marginBottom: '15px' }, children: [_jsx("label", { htmlFor: "email", children: "\uC774\uBA54\uC77C" }), _jsx("input", { type: "email", id: "email", value: email, onChange: (e) => setEmail(e.target.value), required: true, style: { width: '100%', padding: '8px', marginTop: '5px' } })] }), _jsxs("div", { style: { marginBottom: '15px' }, children: [_jsx("label", { htmlFor: "password", children: "\uBE44\uBC00\uBC88\uD638" }), _jsx("input", { type: "password", id: "password", value: password, onChange: (e) => setPassword(e.target.value), required: true, style: { width: '100%', padding: '8px', marginTop: '5px' } })] }), error && _jsx("p", { style: { color: 'red' }, children: error }), _jsx("button", { type: "submit", style: { width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }, children: "\uB85C\uADF8\uC778" })] }), _jsxs("p", { style: { marginTop: '20px', textAlign: 'center' }, children: ["\uACC4\uC815\uC774 \uC5C6\uC73C\uC2E0\uAC00\uC694? ", _jsx(Link, { to: "/signup", children: "\uD68C\uC6D0\uAC00\uC785" })] })] }));
}
