import React, { useState } from 'react';
import "./styles/LoginPage.css";
import axios from 'axios';
import { jwtDecode } from "jwt-decode";
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
const handleLogin = async (e) => {
  e.preventDefault();
  try {
    const res = await axios.post(`${process.env.REACT_APP_API_URL}/auth/login`, {
      email,
      password,
    });

    const { token } = res.data;

    // Save token
    localStorage.setItem('token', token);

    // Decode token and store user
    const decoded = jwtDecode(token);
    const role = decoded.role;
    const id = decoded.id;

    const user = { id, role };
    localStorage.setItem('user', JSON.stringify(user)); // ✅ THIS FIXES THE ISSUE

    // Navigate based on role
    if (role === 'admin') navigate('/admin/dashboard');
    else if (role === 'manager') navigate('/manager/dashboard');
    else if (role === 'employee') navigate('/employee/dashboard');
    else alert('Unknown role');
  } catch (err) {
    console.error('Login error:', err);
    alert('Login failed: Invalid credentials');
  }
};




  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Welcome Back</h2>
        <form className="login-form" onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Login</button>
        </form>
        <p className="register-redirect">
          Don’t have an account? <span onClick={() => navigate('/register')}>Register here</span>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
