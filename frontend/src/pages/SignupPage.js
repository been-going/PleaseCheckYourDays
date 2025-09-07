import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { signup } from '../api/client';
import { Link, useNavigate } from 'react-router-dom';
export default function SignupPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(false);
        try {
            await signup({ email, password });
            setSuccess(true);
            // Optionally redirect after a delay
            setTimeout(() => navigate('/login'), 2000);
        }
        catch (err) {
            setError(err.message || '회원가입에 실패했습니다.');
        }
    };
    return (_jsxs("div", { style: { maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }, children: [_jsx("h2", { children: "\uD68C\uC6D0\uAC00\uC785" }), success ? (_jsxs("div", { children: [_jsx("p", { style: { color: 'green' }, children: "\uD68C\uC6D0\uAC00\uC785\uC5D0 \uC131\uACF5\uD588\uC2B5\uB2C8\uB2E4!" }), _jsx("p", { children: "\uC7A0\uC2DC \uD6C4 \uB85C\uADF8\uC778 \uD398\uC774\uC9C0\uB85C \uC774\uB3D9\uD569\uB2C8\uB2E4..." }), _jsx(Link, { to: "/login", children: "\uC9C0\uAE08 \uB85C\uADF8\uC778\uD558\uAE30" })] })) : (_jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { style: { marginBottom: '15px' }, children: [_jsx("label", { htmlFor: "email", children: "\uC774\uBA54\uC77C" }), _jsx("input", { type: "email", id: "email", value: email, onChange: (e) => setEmail(e.target.value), required: true, style: { width: '100%', padding: '8px', marginTop: '5px' } })] }), _jsxs("div", { style: { marginBottom: '15px' }, children: [_jsx("label", { htmlFor: "password", children: "\uBE44\uBC00\uBC88\uD638" }), _jsx("input", { type: "password", id: "password", value: password, onChange: (e) => setPassword(e.target.value), required: true, style: { width: '100%', padding: '8px', marginTop: '5px' } })] }), error && _jsx("p", { style: { color: 'red' }, children: error }), _jsx("button", { type: "submit", style: { width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }, children: "\uD68C\uC6D0\uAC00\uC785" })] })), _jsxs("p", { style: { marginTop: '20px', textAlign: 'center' }, children: ["\uC774\uBBF8 \uACC4\uC815\uC774 \uC788\uC73C\uC2E0\uAC00\uC694? ", _jsx(Link, { to: "/login", children: "\uB85C\uADF8\uC778" })] })] }));
}
