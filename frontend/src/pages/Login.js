import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField, Button, Container, Box, Typography } from '@mui/material';
import api from '../services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || email.trim() === "") {
      setError("ઈમેલ જરૂરી છે. (Email is required)");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("કૃપા કરીને અમાન્ય ઈમેલ સરનામું તપાસો. (Please check for a valid email address)");
      return;
    }
    if (!password || password.length < 8) {
      setError("પાસવર્ડ ઓછામાં ઓછો 8 અક્ષરનો હોવો જોઈએ. (Password must be at least 8 characters)");
      return;
    }

    try {
      const response = await api.post('/auth/login', { email, password });
      
      // Save token and role (adjust once we know exact structure)
      localStorage.setItem('token', response.data.token);
      // Temporarily try both ways, one will work
      localStorage.setItem('userRole', response.data.user?.role || response.data.role);

      navigate('/dashboard');
    } catch (err) {
      console.error("Login Error:", err);
      setError(err.response?.data?.error || 'Invalid email or password');
    }
  };

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5">
          Luhar Samaj Login
        </Typography>
        
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            type="email"
            label="Email Address"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          
          <TextField
            margin="normal"
            required
            fullWidth
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          
          {error && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            Sign In
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default Login;
