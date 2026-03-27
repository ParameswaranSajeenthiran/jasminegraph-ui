/**
Copyright 2025 JasmineGraph Team
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 */

import React, { useEffect } from "react";

const Loading: React.FC = () => {
  useEffect(() => {
    // Load the dotLottie player if it isn't already registered
    if (!customElements.get("dotlottie-player")) {
      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/@dotlottie/player-component@latest/dist/dotlottie-player.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}
    >
      <dotlottie-player
        src="https://assets-v2.lottiefiles.com/a/a5723f98-1150-11ee-a173-9f8a35d72636/ABw3dcRyMl.lottie"
        background="transparent"
        speed={1}
        style={{ width: "600px", height: "600px" }}
        loop
        autoplay
      ></dotlottie-player>
      <p
        style={{
          color: "#000",
          fontSize: "24px",
          fontWeight: 600,
          marginTop: "20px",
        }}
      >
        Loading JasmineGraph...
      </p>
    </div>
  );
};

export default Loading;
