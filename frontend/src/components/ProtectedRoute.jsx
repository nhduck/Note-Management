import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const navigate = useNavigate();
  const [isVerified, setIsVerified] = useState(false);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    $.ajax({
      url: "api/verify-token", 
      type: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      },
      success: (res) => {
        // Token đúng -> Cho phép hiển thị nội dung
        setIsVerified(true);
      },
      error: (err) => {
        // Token sai/hết hạn -> Xóa dữ liệu cũ và về trang login
        console.error("Token không hợp lệ:", err);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
      }
    });
  }, [token, navigate]);

  return isVerified ? children : null;
};

export default ProtectedRoute;