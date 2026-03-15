import { useEffect, useState } from "react";
import { BASE_URL } from "../../config";
import HeaderWrapper from "./header/HeaderWrapper";
import "./SystemPage.css";
import axios from "axios";
import MainWrapper from "./main/MainWrapper";


function ShiftWrapper({fullTogglePage, nowUsername}) {

  const [user, setUser] = useState([]);
  const [error, setError] = useState("");
  const [mainState, setMainState] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api/system/user/${nowUsername}`);
        setUser(response.data);
      } catch {
        setError("Can not find the user.")
      }
    };
  
    if (nowUsername) {
      fetchUserData();
    }
  }, [nowUsername]);
  

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return <div className="system-wrapper">
    <HeaderWrapper fullTogglePage={fullTogglePage} user={user} toggleMainPage={setMainState} setReloadKey={setReloadKey}/>
    <MainWrapper user={user} mainState={mainState} onUpdateUser={setUser} reloadKey={reloadKey}/>
  </div>
}

export default ShiftWrapper;