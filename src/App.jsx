import { useEffect, useState } from "react";
import "./App.css";
import LoginPageWrapper from "./components/loginPage/LoginPageWrapper";
import SystemWrapper from "./components/systemPage/SystemWrapper";
import { Route, Routes } from "react-router-dom";

function App() {
  const [nowUsername, setNowUsername] = useState("OuO");

  useEffect(() => {
    const savedUsername = localStorage.getItem("nowUsername");
    if (savedUsername) {
      setNowUsername(savedUsername);
    }
  }, []);

  const handleSetNowUsername = (username) => {
    setNowUsername(username);
    localStorage.setItem("nowUsername", username);
  };

  return (
    <Routes>
      <Route path="/" element={<LoginPageWrapper nowUsername={nowUsername} setNowUsername={handleSetNowUsername} />} />
      <Route path="/system/*" element={<SystemWrapper nowUsername={nowUsername} />} />
    </Routes>
  );
}

export default App;
