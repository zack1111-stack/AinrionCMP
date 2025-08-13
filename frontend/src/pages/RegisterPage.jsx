import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './styles/Register.css';
import axios from 'axios';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
  });

  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/auth/register`,
        {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (res.data?.message === 'User registered successfully') {
        alert('Registration successful!');
        navigate('/login');
      } else {
        alert(res.data?.message || 'Registration response unclear');
      }
    } catch (err) {
      console.error('Registration error:', err.response || err.message);
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <h2>Register New Account</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={formData.name}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <select name="role" value={formData.role} onChange={handleChange}>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="employee">Employee</option>
          </select>
          <button type="submit">Register</button>
          {error && <p className="error-text">{error}</p>}
          <p className="login-redirect">
            Already registered?{' '}
            <span onClick={() => navigate('/login')}>Login here</span>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
