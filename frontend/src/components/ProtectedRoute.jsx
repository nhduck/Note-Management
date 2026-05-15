import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ProtectedRoute = ({ }) => {
  const navigate = useNavigate();
  const [isVerified, setIsVerified] = useState(false);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {

      navigate("/login");

    } else {
      // Token exists locally, now let's assume it's valid for initial render
      // You could also add an API call here to verify it with the server
      setIsVerified(true);
    }
  }, [token, navigate]);

};

export default ProtectedRoute;