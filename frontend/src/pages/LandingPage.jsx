import React from "react";
import { useNavigate } from "react-router-dom";
import "./styles/LandingPage.css";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div
      className="landing-wrapper"
      style={{
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        height: "100vh",
        width: "100vw",
        margin: 0,
        padding: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      <div className="landing-content">
        <h1 className="landing-title"></h1>
        <div className="landing-buttons">
          <button onClick={() => navigate("/login")}>LOGIN</button>
          <button onClick={() => navigate("/register")}>REGISTER</button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
