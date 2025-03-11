"use client";

import { useState } from "react";
import { Button } from "@nextui-org/react";
import InteractiveAvatar from "@/components/InteractiveAvatar";
import InteractiveAvatarKnowledge from "@/components/InteractiveAvatarKnowledge";
import InteractiveAvatarInvestors from "@/components/InteractiveAvatarInvestors";

export default function App() {
  const [activeView, setActiveView] = useState("customer");

  return (
    <div className="w-screen h-screen relative">
      {/* Button Navigation - Absolute Positioned */}
      <div className="absolute top-4 left-4 flex gap-4 z-10">
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

      </div>

      {/* Conditional Component Rendering */}
      <div className="w-full h-full">
        {activeView === "customer" ? (
          <InteractiveAvatar />
        ) : activeView==="persona"? (
          <InteractiveAvatarKnowledge />
        ):
          <InteractiveAvatarInvestors/>
        }
      </div>
    </div>
  );
}