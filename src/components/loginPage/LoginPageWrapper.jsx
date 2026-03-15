/* eslint-disable react/prop-types */
import LoginWrapper from "./LoginWrapper";
import "./LoginPage.css"
import { useState } from "react";
import ForgotPasswordWrapper from "./ForgotPasswordWrapper";
import ChangePasswordWrapper from "./ChangePasswordWrapper";
import { useNavigate } from "react-router-dom";

function LoginPageWrapper({nowUsername, setNowUsername}) {
    const [pageState, setPageState] = useState("loginPage");
    const navigate = useNavigate();

    return <>
        {pageState === "loginPage" && (
            <LoginWrapper togglePage={setPageState} fullTogglePage={() => navigate("/system/main")} setNowUsername={setNowUsername}/>
        )}
        {pageState === "forgotPasswordPage" && (
            <ForgotPasswordWrapper togglePage={setPageState} setNowUsername={setNowUsername}/>
        )}
        {pageState === "changePasswordPage" && (
            <ChangePasswordWrapper togglePage={setPageState} username={nowUsername} />
        )}
    </>
}

export default LoginPageWrapper;