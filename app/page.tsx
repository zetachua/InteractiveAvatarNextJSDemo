"use client";

import { useState } from "react";
import { Button, Switch } from "@nextui-org/react"; // Added Switch from NextUI
import InteractiveAvatar from "@/components/InteractiveAvatar";
import InteractiveAvatarKnowledge from "@/components/InteractiveAvatarKnowledge";
import InteractiveAvatarInvestors from "@/components/InteractiveAvatarInvestors";
import InteractiveInvestors from "@/components/InteractiveInvestors";

export default function App() {
  const [activeView, setActiveView] = useState("investors");
  const [withAvatar, setWithAvatar] = useState(false); // State for toggle

  return (
    <div className="w-screen h-screen relative">
      {/* Button Navigation - Absolute Positioned */}
      {/* <div className="absolute top-4 left-4 flex gap-4 z-10">
        <Button
          className={`${
            activeView === "investors"
              ? "bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white"
              : "bg-gray-200 text-gray-700"
          } rounded-lg`}
          onClick={() => setActiveView("investors")}
        >
          Pitch to Investors Page
        </Button>
        <Button
          className={`${
            activeView === "customer"
              ? "bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white"
              : "bg-gray-200 text-gray-700"
          } rounded-lg`}
          onClick={() => setActiveView("customer")}
        >
          Customer Interviews Page
        </Button>
        <Button
          className={`${
            activeView === "persona"
              ? "bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white"
              : "bg-gray-200 text-gray-700"
          } rounded-lg`}
          onClick={() => setActiveView("persona")}
        >
          Persona Creator Page
        </Button>
      </div> */}

      {/* Toggle Switch for withAvatar - Only shown in investors view */}
      {activeView === "investors" && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <span className="text-gray-700">Show Avatar</span>
          <Switch
            isSelected={withAvatar}
            onValueChange={setWithAvatar}
            color="primary"
          />
        </div>
      )}

      {/* Conditional Component Rendering */}
      {/* <div className="w-full h-full">
        {activeView === "customer" ? (
          <InteractiveAvatar />
        ) : activeView === "persona" ? (
          <InteractiveAvatarKnowledge />
        ) : withAvatar ? (
          <InteractiveAvatarInvestors />
        ) : (
          <InteractiveInvestors />
        )}
      </div> */}
       <div className="w-full h-full">
       { withAvatar ? (
          <InteractiveAvatarInvestors />
        ) : (
          <InteractiveInvestors />
        )}
      </div>
    </div>
  );
}