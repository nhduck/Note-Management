import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const navigate = useNavigate();
  // State to track whether the user's token has been authenticated by the backend
  const [isVerified, setIsVerified] = useState(false);
  const token = localStorage.getItem("token");

  useEffect(() => {
    // ── STEP 1: Client-side check ──
    // If no token exists at all, immediately redirect to the login page
    if (!token) {
      navigate("/login");
      return;
    }

    // ── STEP 2: Server-side check via API ──
    // Dispatch an AJAX request to verify if the stored token is authentic and still active
    $.ajax({
      url: "api/verify-token", 
      type: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      },
      success: (res) => {
        // Token is valid -> Allow access by changing verification state to true
        setIsVerified(true);
      },
      error: (err) => {
        // Token is invalid or expired -> Clear outdated local storage credentials and redirect to login
        console.error("Invalid token error:", err);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
      }
    });
  }, [token, navigate]);

  // If successfully verified, render the nested child components; otherwise, render nothing (null)
  return isVerified ? children : null;
};

export default ProtectedRoute;